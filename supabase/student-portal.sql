BEGIN;
-- Keep RLS as the boundary even when requests bypass the portal.
ALTER POLICY "student sessions insert" ON public.workout_sessions
WITH CHECK (public.is_trainer() OR (student_id=(select auth.uid()) AND EXISTS (
 SELECT 1 FROM public.workouts w JOIN public.training_plans p ON p.id=w.plan_id
 WHERE w.id=workout_id AND p.student_id=(select auth.uid()) AND p.active IS TRUE
)));
ALTER POLICY "student sessions update" ON public.workout_sessions
USING (public.is_trainer() OR student_id=(select auth.uid()))
WITH CHECK (public.is_trainer() OR (student_id=(select auth.uid()) AND EXISTS (
 SELECT 1 FROM public.workouts w JOIN public.training_plans p ON p.id=w.plan_id
 WHERE w.id=workout_id AND p.student_id=(select auth.uid())
)));
ALTER POLICY "sets student write" ON public.exercise_sets
USING (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id=session_id AND (s.student_id=(select auth.uid()) OR public.is_trainer())))
WITH CHECK (EXISTS (
 SELECT 1 FROM public.workout_sessions s JOIN public.workout_exercises e ON e.workout_id=s.workout_id
 WHERE s.id=session_id AND e.id=exercise_id AND (s.student_id=(select auth.uid()) OR public.is_trainer())
));

CREATE OR REPLACE FUNCTION public.record_student_workout(p_session_id uuid, p_workout_id uuid, p_performed_at timestamptz, p_notes text, p_sets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE v_uid uuid := (select auth.uid()); v_plan uuid; v_existing public.workout_sessions; v_set jsonb; v_created uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_uid AND role='student' AND active IS TRUE) THEN
  RAISE EXCEPTION 'Apenas aluno ativo pode registrar sua sessão' USING ERRCODE='42501';
 END IF;
 IF p_session_id IS NULL OR p_workout_id IS NULL THEN RAISE EXCEPTION 'Sessão ou treino inválido'; END IF;
 -- Serialize retries of the same UUID without blocking different students/sessions.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id::text,0));
 SELECT * INTO v_existing FROM public.workout_sessions WHERE id=p_session_id;
 IF FOUND THEN
  IF v_existing.student_id<>v_uid OR v_existing.workout_id<>p_workout_id THEN RAISE EXCEPTION 'Sessão incompatível' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('id',v_existing.id,'reused',true);
 END IF;
 SELECT p.id INTO v_plan FROM public.workouts w JOIN public.training_plans p ON p.id=w.plan_id
 WHERE w.id=p_workout_id AND p.student_id=v_uid AND p.active IS TRUE;
 IF v_plan IS NULL THEN RAISE EXCEPTION 'Treino não pertence ao aluno ou plano inativo' USING ERRCODE='42501'; END IF;
 IF p_performed_at IS NULL OR p_performed_at>now()+interval '5 minutes' OR p_performed_at<now()-interval '366 days' THEN RAISE EXCEPTION 'Confira a data da sessão'; END IF;
 IF length(coalesce(p_notes,''))>5000 THEN RAISE EXCEPTION 'Observações muito longas'; END IF;
 IF jsonb_typeof(p_sets) IS DISTINCT FROM 'array' OR jsonb_array_length(p_sets)>1000 OR jsonb_array_length(p_sets)=0 THEN RAISE EXCEPTION 'Informe as séries realizadas'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_sets) x GROUP BY x->>'exercise_id',x->>'set_number' HAVING count(*)>1) THEN RAISE EXCEPTION 'Série repetida'; END IF;
 FOR v_set IN SELECT value FROM jsonb_array_elements(p_sets) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.workout_exercises WHERE id=(v_set->>'exercise_id')::uuid AND workout_id=p_workout_id) THEN RAISE EXCEPTION 'Exercício não pertence ao treino' USING ERRCODE='42501'; END IF;
  IF (v_set->>'set_number') IS NULL OR (v_set->>'set_number')::numeric NOT BETWEEN 1 AND 50 OR (v_set->>'set_number')::numeric<>trunc((v_set->>'set_number')::numeric) THEN RAISE EXCEPTION 'Número de série inválido'; END IF;
  IF (v_set->>'reps') IS NULL OR (v_set->>'reps')::numeric NOT BETWEEN 1 AND 1000 OR (v_set->>'reps')::numeric<>trunc((v_set->>'reps')::numeric) THEN RAISE EXCEPTION 'Repetições inválidas'; END IF;
  IF (v_set->>'load_kg') IS NOT NULL AND ((v_set->>'load_kg')::numeric NOT BETWEEN 0 AND 2000) THEN RAISE EXCEPTION 'Carga inválida'; END IF;
  IF (v_set->>'rir') IS NOT NULL AND ((v_set->>'rir')::numeric NOT BETWEEN 0 AND 10) THEN RAISE EXCEPTION 'RIR inválido'; END IF;
 END LOOP;
 INSERT INTO public.workout_sessions(id,student_id,workout_id,performed_at,notes)
 VALUES(p_session_id,v_uid,p_workout_id,p_performed_at,nullif(trim(p_notes),'')) RETURNING id INTO v_created;
 INSERT INTO public.exercise_sets(session_id,exercise_id,set_number,load_kg,reps,rir,completed)
 SELECT v_created,(x->>'exercise_id')::uuid,(x->>'set_number')::smallint,(x->>'load_kg')::numeric,(x->>'reps')::smallint,(x->>'rir')::numeric,true FROM jsonb_array_elements(p_sets) x;
 RETURN jsonb_build_object('id',v_created,'reused',false);
END $fn$;
REVOKE ALL ON FUNCTION public.record_student_workout(uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_student_workout(uuid,uuid,timestamptz,text,jsonb) TO authenticated;
CREATE INDEX IF NOT EXISTS student_portal_sessions_idx ON public.workout_sessions(student_id,performed_at DESC);
CREATE INDEX IF NOT EXISTS student_portal_sets_idx ON public.exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS student_portal_workouts_idx ON public.workouts(plan_id,position);
CREATE INDEX IF NOT EXISTS student_portal_exercises_idx ON public.workout_exercises(workout_id,position);
CREATE INDEX IF NOT EXISTS student_portal_plans_idx ON public.training_plans(student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS student_portal_assessments_idx ON public.assessments(student_id,assessed_at DESC);
CREATE INDEX IF NOT EXISTS student_portal_anamneses_idx ON public.anamneses(student_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS student_portal_photos_idx ON public.progress_photos(student_id,photo_date DESC);
CREATE INDEX IF NOT EXISTS student_portal_guidance_idx ON public.guidance(student_id,created_at DESC);
COMMIT;
