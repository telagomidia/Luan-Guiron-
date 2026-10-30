-- NOT VALID preserves historical rows; INSERT/UPDATE must meet the same limits as the portal.
ALTER TABLE public.exercise_sets
 ADD CONSTRAINT sets_number_valid CHECK (set_number BETWEEN 1 AND 50) NOT VALID,
 ADD CONSTRAINT sets_reps_valid CHECK (reps BETWEEN 1 AND 1000 AND (NOT coalesce(completed,true) OR reps IS NOT NULL)) NOT VALID,
 ADD CONSTRAINT sets_load_valid CHECK (load_kg BETWEEN 0 AND 2000) NOT VALID,
 ADD CONSTRAINT sets_rir_valid CHECK (rir BETWEEN 0 AND 10) NOT VALID;
ALTER TABLE public.anamneses
 ADD CONSTRAINT anam_sleep_valid CHECK (sleep_hours BETWEEN 0 AND 24) NOT VALID,
 ADD CONSTRAINT anam_json_valid CHECK (jsonb_typeof(answers)='object' AND octet_length(answers::text)<=200000 AND jsonb_typeof(parq_answers)='object' AND octet_length(parq_answers::text)<=20000) NOT VALID;
ALTER TABLE public.workout_sessions
 ADD CONSTRAINT session_notes_valid CHECK (length(notes)<=5000 AND octet_length(exercise_notes::text)<=200000) NOT VALID;

CREATE OR REPLACE FUNCTION lg_private.validate_anamnesis_input()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item record; bounds record; val numeric;
BEGIN
 FOR item IN SELECT key,value FROM jsonb_each(to_jsonb(NEW)) LOOP
  IF jsonb_typeof(item.value)='string' AND length(item.value #>> '{}')>10000 THEN RAISE EXCEPTION 'Texto da anamnese muito longo' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF TG_OP='INSERT' OR NEW.parq_answers IS DISTINCT FROM OLD.parq_answers THEN
  FOR item IN SELECT key,value FROM jsonb_each(NEW.parq_answers) LOOP
   IF item.key ~ '^q[1-7]$' AND (jsonb_typeof(item.value) IS DISTINCT FROM 'object' OR coalesce(item.value->>'answer','') NOT IN ('yes','no')) THEN
    RAISE EXCEPTION 'Responda Sim ou Não no PAR-Q' USING ERRCODE='23514';
   END IF;
  END LOOP;
 END IF;
 FOR bounds IN SELECT * FROM (VALUES ('height_cm',50,250),('weight_kg',1,500),('sleep_hours',0,24),('meals_per_day',0,30),('water_liters',0,20)) AS b(key,lo,hi) LOOP
  IF NEW.answers ? bounds.key AND NEW.answers->bounds.key<>'null'::jsonb THEN
   IF jsonb_typeof(NEW.answers->bounds.key) NOT IN ('number','string') THEN RAISE EXCEPTION 'Número inválido na anamnese' USING ERRCODE='23514'; END IF;
   BEGIN val := (NEW.answers->>bounds.key)::numeric; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Número inválido na anamnese' USING ERRCODE='23514'; END;
   IF val NOT BETWEEN bounds.lo AND bounds.hi OR (bounds.key='meals_per_day' AND val<>trunc(val)) THEN RAISE EXCEPTION 'Número fora dos limites da anamnese' USING ERRCODE='23514'; END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION lg_private.validate_anamnesis_input() FROM PUBLIC,anon;
CREATE TRIGGER validate_anamnesis_input BEFORE INSERT OR UPDATE ON public.anamneses FOR EACH ROW EXECUTE FUNCTION lg_private.validate_anamnesis_input();

CREATE OR REPLACE FUNCTION lg_private.protect_session_input()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item record;
BEGIN
 IF TG_OP='INSERT' OR NEW.performed_at IS DISTINCT FROM OLD.performed_at THEN
  IF NEW.performed_at>now()+interval '5 minutes' OR NEW.performed_at<now()-interval '366 days' THEN RAISE EXCEPTION 'Confira a data da sessão' USING ERRCODE='23514'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.workout_id IS DISTINCT FROM OLD.workout_id) THEN
  RAISE EXCEPTION 'Identidade da sessão não pode ser alterada' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' THEN
  -- Snapshot is always derived from the prescription, even through direct REST writes.
  SELECT jsonb_build_object('name',w.name,'plan_name',p.name,'exercises',coalesce((SELECT jsonb_object_agg(e.id::text,jsonb_build_object('name',e.exercise_name,'position',e.position)) FROM public.workout_exercises e WHERE e.workout_id=w.id),'{}'::jsonb))
   INTO NEW.workout_snapshot FROM public.workouts w JOIN public.training_plans p ON p.id=w.plan_id WHERE w.id=NEW.workout_id;
  NEW.workout_snapshot:=coalesce(NEW.workout_snapshot,'{}'::jsonb);
 ELSE
  NEW.workout_snapshot:=OLD.workout_snapshot;
 END IF;
 IF TG_OP='INSERT' OR NEW.exercise_notes IS DISTINCT FROM OLD.exercise_notes THEN
  IF jsonb_typeof(NEW.exercise_notes) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Observações inválidas' USING ERRCODE='23514'; END IF;
  FOR item IN SELECT key,value FROM jsonb_each(NEW.exercise_notes) LOOP
   IF jsonb_typeof(item.value)<>'string' OR length(item.value #>> '{}')>2000 THEN RAISE EXCEPTION 'Observação: até 2000 caracteres' USING ERRCODE='23514'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.workout_exercises WHERE id::text=item.key AND workout_id=NEW.workout_id) THEN RAISE EXCEPTION 'Exercício fora do treino' USING ERRCODE='42501'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION lg_private.protect_session_input() FROM PUBLIC,anon;
CREATE TRIGGER protect_session_input BEFORE INSERT OR UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION lg_private.protect_session_input();

-- Enforce uniqueness for future writes without deleting any historical duplicates.
CREATE OR REPLACE FUNCTION lg_private.prevent_duplicate_set()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.session_id IS DISTINCT FROM OLD.session_id
    OR NEW.exercise_id IS DISTINCT FROM OLD.exercise_id OR NEW.set_number IS DISTINCT FROM OLD.set_number THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.session_id::text||':'||NEW.exercise_id::text||':'||NEW.set_number::text,0));
  IF EXISTS(SELECT 1 FROM public.exercise_sets WHERE session_id=NEW.session_id AND exercise_id=NEW.exercise_id AND set_number=NEW.set_number AND id<>NEW.id) THEN
   RAISE EXCEPTION 'Série já registrada nesta sessão' USING ERRCODE='23505';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION lg_private.prevent_duplicate_set() FROM PUBLIC,anon;
CREATE TRIGGER prevent_duplicate_set BEFORE INSERT OR UPDATE ON public.exercise_sets FOR EACH ROW EXECUTE FUNCTION lg_private.prevent_duplicate_set();
