-- Additive rest tracking for completed sets. Old clients and historical rows remain valid.
ALTER TABLE public.exercise_sets
 ADD COLUMN IF NOT EXISTS rest_seconds smallint;

DO $block$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.exercise_sets'::regclass
    AND conname='exercise_sets_rest_seconds_range'
 ) THEN
  ALTER TABLE public.exercise_sets
   ADD CONSTRAINT exercise_sets_rest_seconds_range
   CHECK (rest_seconds BETWEEN 0 AND 3600);
 END IF;
END $block$;

COMMENT ON COLUMN public.exercise_sets.rest_seconds IS
 'Active rest timer seconds recorded after this completed set.';

CREATE OR REPLACE FUNCTION public.record_student_workout_v2(
 p_session_id uuid, p_workout_id uuid, p_performed_at timestamptz,
 p_notes text, p_sets jsonb, p_exercise_notes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $fn$
DECLARE v_saved jsonb; v_entry record; v_set jsonb; v_snapshot jsonb;
BEGIN
 IF jsonb_typeof(p_sets) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Séries inválidas';
 END IF;
 FOR v_set IN SELECT value FROM jsonb_array_elements(p_sets) LOOP
  IF v_set ? 'rest_seconds' AND v_set->>'rest_seconds' IS NOT NULL
     AND ((v_set->>'rest_seconds') !~ '^\\d+$'
          OR (v_set->>'rest_seconds')::numeric NOT BETWEEN 0 AND 3600) THEN
   RAISE EXCEPTION 'Descanso: informe de 0 a 3600 segundos';
  END IF;
 END LOOP;

 -- Existing RPC keeps identity, ownership, active-plan checks and atomic retry handling.
 v_saved := public.record_student_workout(
  p_session_id,p_workout_id,p_performed_at,p_notes,p_sets
 );
 IF (v_saved->>'reused')::boolean THEN RETURN v_saved; END IF;

 UPDATE public.exercise_sets es
 SET rest_seconds=(x.value->>'rest_seconds')::smallint
 FROM jsonb_array_elements(p_sets) x(value)
 WHERE es.session_id=p_session_id
   AND es.exercise_id=(x.value->>'exercise_id')::uuid
   AND es.set_number=(x.value->>'set_number')::smallint
   AND x.value->>'rest_seconds' IS NOT NULL;

 IF jsonb_typeof(p_exercise_notes) IS DISTINCT FROM 'object'
    OR octet_length(p_exercise_notes::text)>200000 THEN
  RAISE EXCEPTION 'Observações dos exercícios inválidas';
 END IF;
 FOR v_entry IN SELECT key,value FROM jsonb_each(p_exercise_notes) LOOP
  IF jsonb_typeof(v_entry.value)<>'string'
     OR length(v_entry.value #>> '{}')>2000 THEN
   RAISE EXCEPTION 'Observação: até 2000 caracteres por exercício';
  END IF;
  IF NOT EXISTS(
   SELECT 1 FROM public.workout_exercises
   WHERE id::text=v_entry.key AND workout_id=p_workout_id
  ) THEN
   RAISE EXCEPTION 'Observação de exercício fora do treino'
    USING ERRCODE='42501';
  END IF;
 END LOOP;

 SELECT jsonb_build_object(
  'name',w.name,'plan_name',p.name,'exercises',
  coalesce((
   SELECT jsonb_object_agg(
    e.id::text,jsonb_build_object('name',e.exercise_name,'position',e.position)
   )
   FROM public.workout_exercises e WHERE e.workout_id=w.id
  ),'{}'::jsonb)
 )
 INTO v_snapshot
 FROM public.workouts w
 JOIN public.training_plans p ON p.id=w.plan_id
 WHERE w.id=p_workout_id;

 UPDATE public.workout_sessions
 SET exercise_notes=p_exercise_notes,workout_snapshot=v_snapshot
 WHERE id=p_session_id AND student_id=(select auth.uid());
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Não foi possível confirmar a sessão' USING ERRCODE='42501';
 END IF;
 RETURN v_saved;
END $fn$;

REVOKE ALL ON FUNCTION public.record_student_workout_v2(
 uuid,uuid,timestamptz,text,jsonb,jsonb
) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_student_workout_v2(
 uuid,uuid,timestamptz,text,jsonb,jsonb
) TO authenticated;
