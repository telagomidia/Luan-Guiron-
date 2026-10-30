BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('55555555-0000-4000-8000-000000000001','assessment-teacher@example.invalid','{"full_name":"QA Teacher"}'),
 ('55555555-0000-4000-8000-000000000002','assessment-student@example.invalid','{"full_name":"QA Student"}');
UPDATE public.profiles SET role='trainer' WHERE id='55555555-0000-4000-8000-000000000001';
INSERT INTO public.assessments(id,student_id,assessed_at,weight_kg,created_by) VALUES
 ('55555555-0000-4000-8000-000000000010','55555555-0000-4000-8000-000000000002',current_date,70,'55555555-0000-4000-8000-000000000001');
INSERT INTO public.circumferences(assessment_id,waist) VALUES('55555555-0000-4000-8000-000000000010',80);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"55555555-0000-4000-8000-000000000001","role":"authenticated"}',true);
DO $$ DECLARE a jsonb='{"student_id":"55555555-0000-4000-8000-000000000002","weight_kg":71}'; BEGIN
 -- Fails after UPDATE+DELETE, proving PostgreSQL restores the entire old assessment.
 BEGIN
  PERFORM public.save_assessment_atomic('55555555-0000-4000-8000-000000000010',true,a,'{"waist":"invalid-number"}','{}','[]',NULL,'[]','[]');
  RAISE EXCEPTION 'Invalid dependent record accepted' USING ERRCODE='ZX001';
 EXCEPTION WHEN invalid_text_representation THEN NULL; END;
 IF (SELECT weight_kg FROM public.assessments WHERE id='55555555-0000-4000-8000-000000000010')<>70
    OR (SELECT waist FROM public.circumferences WHERE assessment_id='55555555-0000-4000-8000-000000000010')<>80 THEN
  RAISE EXCEPTION 'Partial save destroyed previous assessment';
 END IF;
 PERFORM public.save_assessment_atomic('55555555-0000-4000-8000-000000000010',true,a,'{"waist":81}','{}','[]',NULL,'[]','[]');
 IF (SELECT waist FROM public.circumferences WHERE assessment_id='55555555-0000-4000-8000-000000000010')<>81 THEN RAISE EXCEPTION 'Valid atomic edit failed'; END IF;
 PERFORM public.save_assessment_atomic('55555555-0000-4000-8000-000000000011',false,a||jsonb_build_object('assessed_at',current_date),'{}','{}','[]',NULL,'[]','[]');
 PERFORM public.save_assessment_atomic('55555555-0000-4000-8000-000000000011',false,a||jsonb_build_object('assessed_at',current_date),'{}','{}','[]',NULL,'[]','[]');
 IF (SELECT count(*) FROM public.assessments WHERE id='55555555-0000-4000-8000-000000000011')<>1 THEN RAISE EXCEPTION 'Retry duplicated assessment'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"55555555-0000-4000-8000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.save_assessment_atomic('55555555-0000-4000-8000-000000000010',true,'{"student_id":"55555555-0000-4000-8000-000000000002"}','{}','{}','[]',NULL,'[]','[]');
  RAISE EXCEPTION 'Student accepted' USING ERRCODE='ZX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
