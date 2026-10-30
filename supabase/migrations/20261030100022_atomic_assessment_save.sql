-- One transaction for an entire assessment. Storage is uploaded under new paths first.
-- SECURITY INVOKER deliberately retains all existing RLS/billing/active-profile guards.
CREATE OR REPLACE FUNCTION public.save_assessment_atomic(
 p_id uuid, p_editing boolean, p_assessment jsonb, p_circumferences jsonb,
 p_skinfolds jsonb, p_strength jsonb, p_vo2 jsonb, p_stages jsonb, p_photos jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
 a public.assessments; previous public.assessments; student uuid; vt uuid;
 item jsonb; fields text; assignments text; prefix text;
BEGIN
 IF NOT public.is_trainer() OR auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Apenas professor ativo pode salvar avaliações' USING ERRCODE='42501';
 END IF;
 IF p_id IS NULL OR p_editing IS NULL OR jsonb_typeof(p_assessment) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_circumferences) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_skinfolds) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_strength) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_stages) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_photos) IS DISTINCT FROM 'array'
    OR (p_vo2 IS NOT NULL AND jsonb_typeof(p_vo2) IS DISTINCT FROM 'object')
    OR octet_length(p_assessment::text||p_circumferences::text||p_skinfolds::text||p_strength::text||coalesce(p_vo2::text,'')||p_stages::text||p_photos::text)>500000
    OR jsonb_array_length(p_strength)>300 OR jsonb_array_length(p_stages)>100 OR jsonb_array_length(p_photos)>4 THEN
  RAISE EXCEPTION 'Dados da avaliação inválidos';
 END IF;
 student := (p_assessment->>'student_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=student AND role='student') THEN
  RAISE EXCEPTION 'Aluno não encontrado' USING ERRCODE='42501';
 END IF;
 prefix := student::text||'/'||p_id::text||'/';
 IF p_assessment ? 'bioimpedance_pdf_path' AND
    (coalesce(p_assessment->>'bioimpedance_pdf_path','') NOT LIKE prefix||'%'
     OR p_assessment->>'bioimpedance_pdf_path' ~ '(^|/)[.][.](/|$)') THEN
  RAISE EXCEPTION 'Caminho do relatório inválido';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_photos) LOOP
  IF coalesce(item->>'view','') NOT IN ('front','back','left','right')
     OR coalesce(item->>'storage_path','') NOT LIKE prefix||'%'
     OR item->>'storage_path' ~ '(^|/)[.][.](/|$)' THEN RAISE EXCEPTION 'Foto inválida'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 SELECT * INTO previous FROM public.assessments WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF previous.student_id<>student THEN RAISE EXCEPTION 'Aluno da avaliação não pode ser alterado'; END IF;
  a := jsonb_populate_record(previous,p_assessment||jsonb_build_object('id',p_id,'student_id',student,'created_by',previous.created_by,'created_at',previous.created_at));
  SELECT string_agg(format('%I = ($1).%I',attname,attname),',') INTO assignments
   FROM pg_attribute WHERE attrelid='public.assessments'::regclass AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attname NOT IN ('id','student_id','created_by','created_at');
  EXECUTE 'UPDATE public.assessments SET '||assignments||' WHERE id=$2' USING a,p_id;
 ELSE
  IF p_editing THEN RAISE EXCEPTION 'Avaliação não encontrada. Atualize a lista.'; END IF;
  a := jsonb_populate_record(NULL::public.assessments,p_assessment||jsonb_build_object('id',p_id,'student_id',student,'created_by',auth.uid(),'created_at',now()));
  INSERT INTO public.assessments SELECT a.*;
 END IF;
 -- Every statement below shares this transaction: any error rolls back earlier writes.
 DELETE FROM public.circumferences WHERE assessment_id=p_id;
 DELETE FROM public.skinfolds WHERE assessment_id=p_id;
 DELETE FROM public.strength_tests WHERE assessment_id=p_id;
 DELETE FROM public.vo2_stages WHERE vo2_test_id IN (SELECT id FROM public.vo2_tests WHERE assessment_id=p_id);
 DELETE FROM public.vo2_tests WHERE assessment_id=p_id;
 IF p_circumferences<>'{}'::jsonb THEN
  INSERT INTO public.circumferences SELECT (jsonb_populate_record(NULL::public.circumferences,p_circumferences||jsonb_build_object('assessment_id',p_id))).*;
 END IF;
 IF p_skinfolds<>'{}'::jsonb THEN
  INSERT INTO public.skinfolds SELECT (jsonb_populate_record(NULL::public.skinfolds,p_skinfolds||jsonb_build_object('assessment_id',p_id))).*;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_strength) LOOP
  INSERT INTO public.strength_tests SELECT (jsonb_populate_record(NULL::public.strength_tests,item||jsonb_build_object('id',gen_random_uuid(),'assessment_id',p_id))).*;
 END LOOP;
 IF p_vo2 IS NOT NULL THEN
  vt := gen_random_uuid();
  INSERT INTO public.vo2_tests SELECT (jsonb_populate_record(NULL::public.vo2_tests,p_vo2||jsonb_build_object('id',vt,'assessment_id',p_id))).*;
  FOR item IN SELECT value FROM jsonb_array_elements(p_stages) LOOP
   INSERT INTO public.vo2_stages SELECT (jsonb_populate_record(NULL::public.vo2_stages,item||jsonb_build_object('id',gen_random_uuid(),'vo2_test_id',vt,'created_at',now()))).*;
  END LOOP;
 ELSIF jsonb_array_length(p_stages)>0 THEN RAISE EXCEPTION 'Teste de VO₂ ausente';
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_photos) LOOP
  DELETE FROM public.progress_photos WHERE assessment_id=p_id AND view=item->>'view';
  INSERT INTO public.progress_photos(id,student_id,assessment_id,photo_date,view,storage_path,created_by)
   VALUES(gen_random_uuid(),student,p_id,a.assessed_at,item->>'view',item->>'storage_path',auth.uid());
 END LOOP;
 RETURN jsonb_build_object('id',p_id);
END $fn$;
REVOKE ALL ON FUNCTION public.save_assessment_atomic(uuid,boolean,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_assessment_atomic(uuid,boolean,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) TO authenticated;
