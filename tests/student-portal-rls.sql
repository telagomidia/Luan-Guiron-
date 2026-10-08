-- QA runs in one transaction: only synthetic data, always rolled back.
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','portal-qa-a@example.invalid','{"full_name":"Portal QA A"}'),
 ('22222222-2222-4222-8222-222222222222','portal-qa-b@example.invalid','{"full_name":"Portal QA B"}');
INSERT INTO public.training_plans(id,student_id,name,active,created_by) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Portal QA',true,'11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Foreign QA',true,'22222222-2222-4222-8222-222222222222');
INSERT INTO public.workouts(id,plan_id,name,position) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A',1),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','B',2),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','A',1);
INSERT INTO public.workout_exercises(id,workout_id,exercise_name,position) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Own exercise',1),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Other workout exercise',1),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Foreign exercise',1);
INSERT INTO public.guidance(student_id,title,body,created_by) VALUES ('22222222-2222-4222-8222-222222222222','Foreign','Private','22222222-2222-4222-8222-222222222222');
INSERT INTO public.assessments(student_id,assessed_at,created_by) VALUES ('22222222-2222-4222-8222-222222222222',current_date,'22222222-2222-4222-8222-222222222222');
INSERT INTO storage.objects(bucket_id,name) VALUES ('progress-photos','22222222-2222-4222-8222-222222222222/portal-qa.png');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
DO $qa$
DECLARE sid uuid='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; ownw uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'; payload jsonb='[{"exercise_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11","set_number":1,"reps":10,"load_kg":0,"rir":0}]'; result jsonb; n int;
BEGIN
 result:=public.record_student_workout(sid,ownw,now(),'QA',payload);
 IF result->>'id'<>sid::text OR (result->>'reused')::boolean THEN RAISE EXCEPTION 'First save failed'; END IF;
 result:=public.record_student_workout(sid,ownw,now(),'QA retry',payload);
 IF NOT (result->>'reused')::boolean THEN RAISE EXCEPTION 'Retry not idempotent'; END IF;
 IF (SELECT count(*) FROM public.exercise_sets WHERE session_id=sid)<>1 THEN RAISE EXCEPTION 'Duplicate sets'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.exercise_sets WHERE session_id=sid AND load_kg=0 AND rir=0) THEN RAISE EXCEPTION 'Zero lost'; END IF;
 IF EXISTS(SELECT 1 FROM public.training_plans WHERE student_id='22222222-2222-4222-8222-222222222222') OR EXISTS(SELECT 1 FROM public.guidance WHERE student_id='22222222-2222-4222-8222-222222222222') OR EXISTS(SELECT 1 FROM public.assessments WHERE student_id='22222222-2222-4222-8222-222222222222') THEN RAISE EXCEPTION 'Foreign rows leaked'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE name='22222222-2222-4222-8222-222222222222/portal-qa.png') THEN RAISE EXCEPTION 'Foreign photo leaked'; END IF;
 BEGIN
  INSERT INTO public.workout_sessions(student_id,workout_id) VALUES ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1');
  RAISE EXCEPTION 'Foreign workout accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.exercise_sets(session_id,exercise_id,set_number,reps) VALUES(sid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa21',2,10);
  RAISE EXCEPTION 'Cross-workout exercise accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.record_student_workout('cccccccc-cccc-4ccc-8ccc-ccccccccccc2',ownw,now(),'invalid','[{"exercise_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11","set_number":1,"reps":0}]');
  RAISE EXCEPTION 'QA invalid save accepted' USING ERRCODE='ZX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE id='cccccccc-cccc-4ccc-8ccc-ccccccccccc2') THEN RAISE EXCEPTION 'Partial session created'; END IF;
 UPDATE public.workout_exercises SET exercise_name='tampered' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Student changed prescription'; END IF;
 UPDATE public.profiles SET role='trainer' WHERE id='11111111-1111-4111-8111-111111111111';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Student escalated role'; END IF;
 INSERT INTO public.anamneses(id,student_id,training_goal) VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','QA');
 UPDATE public.anamneses SET training_goal='QA updated' WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 IF NOT EXISTS(SELECT 1 FROM public.anamneses WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND training_goal='QA updated') THEN RAISE EXCEPTION 'Own anamnesis failed'; END IF;
END $qa$;
RESET ROLE;
UPDATE public.training_plans SET active=false WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET LOCAL ROLE authenticated;
DO $qa$ BEGIN
 BEGIN
  PERFORM public.record_student_workout('cccccccc-cccc-4ccc-8ccc-ccccccccccc3','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',now(),'inactive','[{"exercise_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11","set_number":1,"reps":10}]');
  RAISE EXCEPTION 'Inactive accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $qa$;
RESET ROLE;
SELECT 'PASS: atomic save, retry, zero values, RLS isolation, private photo, cross-workout write, invalid rollback, prescription/profile protection, anamnesis, inactive plan' AS qa;
ROLLBACK;
