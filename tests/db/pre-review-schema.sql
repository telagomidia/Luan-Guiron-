-- Schema-only snapshot of pre-review application metadata (2026-10-30). No user rows or secrets.
SET check_function_bodies = off;
CREATE SCHEMA IF NOT EXISTS lg_private;
GRANT USAGE ON SCHEMA public,lg_private TO authenticated,service_role;
CREATE TYPE "public"."app_role" AS ENUM ('trainer','student');
CREATE TABLE "lg_private"."profile_notes" ("profile_id" uuid NOT NULL,"observations" text NOT NULL,"updated_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."admin_activation_allowlist" ("email" text NOT NULL,"full_name" text NOT NULL,"role" app_role NOT NULL DEFAULT 'trainer'::app_role,"claimed_by" uuid,"claimed_at" timestamp with time zone,"created_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."anamneses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"answers" jsonb NOT NULL DEFAULT '{}'::jsonb,"submitted_at" timestamp with time zone,"updated_at" timestamp with time zone DEFAULT now(),"training_goal" text,"training_history" text,"current_activity" text,"weekly_availability" text,"session_duration" text,"profession_routine" text,"pain_injuries" text,"medical_conditions" text,"medications" text,"parq_answers" jsonb NOT NULL DEFAULT '{}'::jsonb,"sleep_hours" numeric,"sleep_quality" text,"nutrition_notes" text,"cardio_history" text,"preferences" text,"limitations" text,"additional_notes" text);
CREATE TABLE "public"."assessments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"assessed_at" date NOT NULL DEFAULT CURRENT_DATE,"notes" text,"systolic_bp" smallint,"diastolic_bp" smallint,"temperature_c" numeric(4,1),"spo2" smallint,"resting_hr" smallint,"weight_kg" numeric(6,2),"height_cm" numeric(6,2),"body_fat_pct" numeric(5,2),"lean_mass_kg" numeric(6,2),"fat_mass_kg" numeric(6,2),"protocol" text,"bioimpedance_pdf_path" text,"created_by" uuid NOT NULL,"created_at" timestamp with time zone NOT NULL DEFAULT now(),"composition_method" text,"body_density" numeric,"report_generated_at" timestamp with time zone);
CREATE TABLE "public"."billing_accounts" ("student_id" uuid NOT NULL,"exempt" boolean NOT NULL DEFAULT false,"exemption_note" text,"asaas_customer_id" text,"asaas_subscription_id" text,"subscription_status" text,"updated_at" timestamp with time zone NOT NULL DEFAULT now(),"is_test" boolean NOT NULL DEFAULT false,"enrolled" boolean NOT NULL DEFAULT false,"access_until" timestamp with time zone,"auto_renew" boolean NOT NULL DEFAULT false,"price_cents" integer,"renewal_issue" text,"environment" text NOT NULL DEFAULT 'sandbox'::text);
CREATE TABLE "public"."billing_attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"order_id" uuid NOT NULL,"attempt_day" integer NOT NULL,"status" text NOT NULL DEFAULT 'reserved'::text,"attempted_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_card_tokens" ("student_id" uuid NOT NULL,"customer_id" text NOT NULL,"token" text NOT NULL,"environment" text NOT NULL,"updated_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_events" ("id" text NOT NULL,"event" text NOT NULL,"resource_id" text,"processed_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"kind" text NOT NULL,"token_hash" text NOT NULL,"expires_at" timestamp with time zone NOT NULL,"state" text NOT NULL DEFAULT 'ready'::text,"result" jsonb NOT NULL DEFAULT '{}'::jsonb,"created_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_orders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"kind" text NOT NULL,"service_id" uuid,"amount_cents" integer NOT NULL,"method" text NOT NULL,"period_start" date NOT NULL,"period_end" date NOT NULL,"status" text NOT NULL DEFAULT 'creating'::text,"provider_id" text,"payment_url" text,"created_at" timestamp with time zone NOT NULL DEFAULT now(),"auto_renew_consent" boolean NOT NULL DEFAULT false,"cycle_due_at" timestamp with time zone NOT NULL DEFAULT now(),"environment" text NOT NULL DEFAULT 'sandbox'::text,"provider" text NOT NULL DEFAULT 'asaas'::text);
CREATE TABLE "public"."billing_payments" ("asaas_id" text NOT NULL,"student_id" uuid NOT NULL,"order_id" uuid,"subscription_id" text,"amount_cents" integer NOT NULL,"status" text NOT NULL,"due_date" date NOT NULL,"period_end" date NOT NULL,"paid_at" timestamp with time zone,"updated_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_sandbox_events" ("id" text NOT NULL,"run_id" uuid NOT NULL,"event" text NOT NULL,"status" text NOT NULL,"received_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."billing_sandbox_runs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"token_hash" text NOT NULL,"expires_at" timestamp with time zone NOT NULL,"state" text NOT NULL DEFAULT 'ready'::text,"customer_id" text,"payment_id" text,"invoice_url" text,"amount_cents" integer NOT NULL DEFAULT 6000,"provider_status" text,"paid_at" timestamp with time zone,"access_until" timestamp with time zone,"error_code" text,"created_at" timestamp with time zone NOT NULL DEFAULT now(),"webhook_id" text,"paused_webhooks" jsonb NOT NULL DEFAULT '[]'::jsonb);
CREATE TABLE "public"."billing_services" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"name" text NOT NULL,"description" text NOT NULL DEFAULT ''::text,"price_cents" integer NOT NULL,"active" boolean NOT NULL DEFAULT false);
CREATE TABLE "public"."billing_settings" ("id" boolean NOT NULL DEFAULT true,"monthly_cents" integer NOT NULL DEFAULT 6000,"enabled" boolean NOT NULL DEFAULT false,"environment" text NOT NULL DEFAULT 'sandbox'::text,"starts_on" date,"grace_days" integer,"duration_days" integer NOT NULL DEFAULT 31,"sandbox_enabled" boolean NOT NULL DEFAULT false,"mercadopago_sandbox_enabled" boolean NOT NULL DEFAULT false);
CREATE TABLE "public"."circumferences" ("assessment_id" uuid NOT NULL,"neck" numeric(6,1),"chest" numeric(6,1),"waist" numeric(6,1),"abdomen" numeric(6,1),"hip" numeric(6,1),"arm_right" numeric(6,1),"arm_left" numeric(6,1),"forearm_right" numeric(6,1),"forearm_left" numeric(6,1),"thigh_right" numeric(6,1),"thigh_left" numeric(6,1),"calf_right" numeric(6,1),"calf_left" numeric(6,1));
CREATE TABLE "public"."exercise_library" ("id" bigint NOT NULL,"name" text NOT NULL,"muscle_group" text,"video_url" text,"notes" text,"created_by" uuid,"created_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."exercise_sets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"session_id" uuid NOT NULL,"exercise_id" uuid NOT NULL,"set_number" smallint NOT NULL,"load_kg" numeric(7,2),"reps" smallint,"rir" numeric(3,1),"completed" boolean DEFAULT true,"rest_seconds" smallint);
CREATE TABLE "public"."guidance" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"title" text NOT NULL,"body" text NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE "public"."profiles" ("id" uuid NOT NULL,"role" app_role NOT NULL DEFAULT 'student'::app_role,"full_name" text NOT NULL,"email" text,"phone" text,"birth_date" date,"avatar_path" text,"active" boolean NOT NULL DEFAULT true,"created_at" timestamp with time zone NOT NULL DEFAULT now(),"updated_at" timestamp with time zone NOT NULL DEFAULT now(),"start_date" date,"goal" text,"observations" text,"sex" text);
CREATE TABLE "public"."progress_photos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"assessment_id" uuid,"photo_date" date NOT NULL DEFAULT CURRENT_DATE,"view" text,"storage_path" text NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE "public"."skinfolds" ("assessment_id" uuid NOT NULL,"triceps" numeric(5,1),"subscapular" numeric(5,1),"biceps" numeric(5,1),"chest" numeric(5,1),"midaxillary" numeric(5,1),"suprailiac" numeric(5,1),"abdominal" numeric(5,1),"thigh" numeric(5,1),"calf" numeric(5,1));
CREATE TABLE "public"."strength_tests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"assessment_id" uuid NOT NULL,"muscle_group" text NOT NULL,"side" text,"attempt" smallint NOT NULL DEFAULT 1,"force_kgf" numeric(7,2) NOT NULL,"device" text DEFAULT 'dynamometer'::text,"protocol_key" text,"stabilization" text,"position_protocol" text,"notes" text,"is_valid" boolean NOT NULL DEFAULT true,"set_id" uuid);
CREATE TABLE "public"."student_followups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"note" text NOT NULL,"created_by" uuid NOT NULL,"created_at" timestamp with time zone NOT NULL DEFAULT now());
CREATE TABLE "public"."student_list_archives" ("student_id" uuid NOT NULL,"hidden_at" timestamp with time zone NOT NULL DEFAULT now(),"hidden_until" timestamp with time zone NOT NULL);
CREATE TABLE "public"."training_plans" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"name" text NOT NULL,"goal" text,"starts_on" date,"ends_on" date,"active" boolean DEFAULT true,"created_by" uuid NOT NULL,"created_at" timestamp with time zone DEFAULT now(),"notes" text);
CREATE TABLE "public"."vo2_stages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"vo2_test_id" uuid NOT NULL,"stage_number" smallint NOT NULL,"duration_seconds" integer NOT NULL DEFAULT 180,"speed_kmh" numeric NOT NULL,"incline_pct" numeric NOT NULL,"hr_min2" smallint,"hr_min3" smallint,"steady_state" boolean,"borg" smallint,"symptoms" text,"vo2_ml_kg_min" numeric,"mets" numeric,"valid_for_regression" boolean DEFAULT false,"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE "public"."vo2_tests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"assessment_id" uuid NOT NULL,"protocol" text,"duration_seconds" integer,"speed_kmh" numeric(5,2),"incline_pct" numeric(5,2),"vo2max_ml_kg_min" numeric(6,2),"max_hr" smallint,"notes" text,"mode" text,"predicted_hrmax" numeric,"hrmax_equation" text,"endpoint_method" text,"endpoint_bpm" numeric,"peak_hr" smallint,"recovery_hr_0" smallint,"recovery_hr_1" smallint,"recovery_hr_2" smallint,"recovery_hr_3" smallint,"stop_reason" text,"screening_notes" text,"medications" text);
CREATE TABLE "public"."workout_exercises" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"workout_id" uuid NOT NULL,"exercise_name" text NOT NULL,"position" smallint NOT NULL DEFAULT 1,"target_sets" smallint,"rep_min" smallint,"rep_max" smallint,"target_rir" numeric(3,1),"rest_seconds" integer,"notes" text,"execution_notes" text);
CREATE TABLE "public"."workout_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"student_id" uuid NOT NULL,"workout_id" uuid NOT NULL,"performed_at" timestamp with time zone NOT NULL DEFAULT now(),"notes" text,"exercise_notes" jsonb NOT NULL DEFAULT '{}'::jsonb,"workout_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE TABLE "public"."workouts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(),"plan_id" uuid NOT NULL,"name" text NOT NULL,"position" smallint NOT NULL DEFAULT 1,"notes" text);
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_composition_method_check" CHECK ((composition_method = ANY (ARRAY['bioimpedance'::text, 'skinfolds'::text])));
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_price_cents_check" CHECK ((price_cents > 0));
ALTER TABLE "public"."billing_attempts" ADD CONSTRAINT "billing_attempts_attempt_day_check" CHECK (((attempt_day >= 0) AND (attempt_day <= 5)));
ALTER TABLE "public"."billing_jobs" ADD CONSTRAINT "billing_jobs_kind_check" CHECK ((kind = ANY (ARRAY['sandbox'::text, 'worker'::text])));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_amount_cents_check" CHECK ((amount_cents > 0));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_check" CHECK ((period_end > period_start));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_check1" CHECK ((((kind = 'monthly'::text) AND (service_id IS NULL)) OR ((kind = 'assessment'::text) AND (service_id IS NOT NULL))));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_kind_check" CHECK ((kind = ANY (ARRAY['monthly'::text, 'assessment'::text])));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_method_check" CHECK ((method = ANY (ARRAY['PIX'::text, 'CREDIT_CARD'::text, 'CHECKOUT'::text])));
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_provider_check" CHECK ((provider = ANY (ARRAY['asaas'::text, 'mercadopago'::text])));
ALTER TABLE "public"."billing_sandbox_runs" ADD CONSTRAINT "billing_sandbox_runs_amount_cents_check" CHECK ((amount_cents = 6000));
ALTER TABLE "public"."billing_services" ADD CONSTRAINT "billing_services_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)));
ALTER TABLE "public"."billing_services" ADD CONSTRAINT "billing_services_price_cents_check" CHECK ((price_cents > 0));
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_duration_days_check" CHECK ((duration_days = 31));
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_grace_days_check" CHECK (((grace_days >= 0) AND (grace_days <= 30)));
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_id_check" CHECK (id);
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_monthly_cents_check" CHECK ((monthly_cents > 0));
ALTER TABLE "public"."exercise_sets" ADD CONSTRAINT "exercise_sets_rest_seconds_range" CHECK (((rest_seconds >= 0) AND (rest_seconds <= 3600)));
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_sex_check" CHECK ((sex = ANY (ARRAY['male'::text, 'female'::text])));
ALTER TABLE "public"."strength_tests" ADD CONSTRAINT "strength_tests_side_check" CHECK ((side = ANY (ARRAY['right'::text, 'left'::text, 'bilateral'::text])));
ALTER TABLE "public"."student_list_archives" ADD CONSTRAINT "student_archive_period" CHECK (((hidden_until > hidden_at) AND (hidden_until <= (hidden_at + '3650 days'::interval))));
ALTER TABLE "public"."vo2_stages" ADD CONSTRAINT "vo2_stages_borg_check" CHECK (((borg >= 6) AND (borg <= 20)));
ALTER TABLE "public"."vo2_tests" ADD CONSTRAINT "vo2_tests_mode_check" CHECK ((mode = ANY (ARRAY['walk'::text, 'run'::text])));
ALTER TABLE "public"."workout_sessions" ADD CONSTRAINT "workout_sessions_exercise_notes_check" CHECK ((jsonb_typeof(exercise_notes) = 'object'::text));
ALTER TABLE "public"."workout_sessions" ADD CONSTRAINT "workout_sessions_workout_snapshot_check" CHECK ((jsonb_typeof(workout_snapshot) = 'object'::text));
ALTER TABLE "public"."admin_activation_allowlist" ADD CONSTRAINT "admin_activation_allowlist_pkey" PRIMARY KEY (email);
ALTER TABLE "public"."anamneses" ADD CONSTRAINT "anamneses_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_pkey" PRIMARY KEY (student_id);
ALTER TABLE "public"."billing_attempts" ADD CONSTRAINT "billing_attempts_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_card_tokens" ADD CONSTRAINT "billing_card_tokens_pkey" PRIMARY KEY (student_id);
ALTER TABLE "public"."billing_events" ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_jobs" ADD CONSTRAINT "billing_jobs_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_payments" ADD CONSTRAINT "billing_payments_pkey" PRIMARY KEY (asaas_id);
ALTER TABLE "public"."billing_sandbox_events" ADD CONSTRAINT "billing_sandbox_events_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_sandbox_runs" ADD CONSTRAINT "billing_sandbox_runs_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_services" ADD CONSTRAINT "billing_services_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."billing_settings" ADD CONSTRAINT "billing_settings_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."circumferences" ADD CONSTRAINT "circumferences_pkey" PRIMARY KEY (assessment_id);
ALTER TABLE "public"."exercise_library" ADD CONSTRAINT "exercise_library_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."exercise_sets" ADD CONSTRAINT "exercise_sets_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."guidance" ADD CONSTRAINT "guidance_pkey" PRIMARY KEY (id);
ALTER TABLE "lg_private"."profile_notes" ADD CONSTRAINT "profile_notes_pkey" PRIMARY KEY (profile_id);
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."progress_photos" ADD CONSTRAINT "progress_photos_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."skinfolds" ADD CONSTRAINT "skinfolds_pkey" PRIMARY KEY (assessment_id);
ALTER TABLE "public"."strength_tests" ADD CONSTRAINT "strength_tests_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."student_followups" ADD CONSTRAINT "student_followups_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."student_list_archives" ADD CONSTRAINT "student_list_archives_pkey" PRIMARY KEY (student_id);
ALTER TABLE "public"."training_plans" ADD CONSTRAINT "training_plans_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."vo2_stages" ADD CONSTRAINT "vo2_stages_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."vo2_tests" ADD CONSTRAINT "vo2_tests_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."workout_exercises" ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."workout_sessions" ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."workouts" ADD CONSTRAINT "workouts_pkey" PRIMARY KEY (id);
ALTER TABLE "public"."admin_activation_allowlist" ADD CONSTRAINT "admin_activation_allowlist_claimed_by_key" UNIQUE (claimed_by);
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_asaas_customer_id_key" UNIQUE (asaas_customer_id);
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_asaas_subscription_id_key" UNIQUE (asaas_subscription_id);
ALTER TABLE "public"."billing_attempts" ADD CONSTRAINT "billing_attempts_order_id_attempt_day_key" UNIQUE (order_id, attempt_day);
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_provider_id_key" UNIQUE (provider_id);
ALTER TABLE "public"."billing_sandbox_runs" ADD CONSTRAINT "billing_sandbox_runs_payment_id_key" UNIQUE (payment_id);
ALTER TABLE "public"."anamneses" ADD CONSTRAINT "anamneses_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id);
ALTER TABLE "public"."billing_attempts" ADD CONSTRAINT "billing_attempts_order_id_fkey" FOREIGN KEY (order_id) REFERENCES billing_orders(id);
ALTER TABLE "public"."billing_card_tokens" ADD CONSTRAINT "billing_card_tokens_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id);
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_service_id_fkey" FOREIGN KEY (service_id) REFERENCES billing_services(id);
ALTER TABLE "public"."billing_orders" ADD CONSTRAINT "billing_orders_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id);
ALTER TABLE "public"."billing_payments" ADD CONSTRAINT "billing_payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES billing_orders(id);
ALTER TABLE "public"."billing_payments" ADD CONSTRAINT "billing_payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id);
ALTER TABLE "public"."billing_sandbox_events" ADD CONSTRAINT "billing_sandbox_events_run_id_fkey" FOREIGN KEY (run_id) REFERENCES billing_sandbox_runs(id);
ALTER TABLE "public"."circumferences" ADD CONSTRAINT "circumferences_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE "public"."exercise_library" ADD CONSTRAINT "exercise_library_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE "public"."exercise_sets" ADD CONSTRAINT "exercise_sets_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id);
ALTER TABLE "public"."exercise_sets" ADD CONSTRAINT "exercise_sets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE;
ALTER TABLE "public"."guidance" ADD CONSTRAINT "guidance_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE "public"."guidance" ADD CONSTRAINT "guidance_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "lg_private"."profile_notes" ADD CONSTRAINT "profile_notes_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE "public"."progress_photos" ADD CONSTRAINT "progress_photos_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL;
ALTER TABLE "public"."progress_photos" ADD CONSTRAINT "progress_photos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE "public"."progress_photos" ADD CONSTRAINT "progress_photos_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."skinfolds" ADD CONSTRAINT "skinfolds_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE "public"."strength_tests" ADD CONSTRAINT "strength_tests_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE "public"."student_followups" ADD CONSTRAINT "student_followups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE "public"."student_followups" ADD CONSTRAINT "student_followups_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."student_list_archives" ADD CONSTRAINT "student_list_archives_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."training_plans" ADD CONSTRAINT "training_plans_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE "public"."training_plans" ADD CONSTRAINT "training_plans_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."vo2_stages" ADD CONSTRAINT "vo2_stages_vo2_test_id_fkey" FOREIGN KEY (vo2_test_id) REFERENCES vo2_tests(id) ON DELETE CASCADE;
ALTER TABLE "public"."vo2_tests" ADD CONSTRAINT "vo2_tests_assessment_id_fkey" FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
ALTER TABLE "public"."workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;
ALTER TABLE "public"."workout_sessions" ADD CONSTRAINT "workout_sessions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE "public"."workout_sessions" ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES workouts(id);
ALTER TABLE "public"."workouts" ADD CONSTRAINT "workouts_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.archive_student_for_days(p_student_id uuid, p_days integer)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare deadline timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'Escolha de 1 a 3650 dias.';
  end if;
  insert into public.student_list_archives(student_id, hidden_at, hidden_until)
  values (p_student_id, now(), now() + make_interval(days => p_days))
  on conflict (student_id) do update
    set hidden_at = excluded.hidden_at, hidden_until = excluded.hidden_until
  returning hidden_until into deadline;
  return deadline;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.import_training_plan(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_plan uuid;
  v_workout uuid;
  v_w jsonb;
  v_e jsonb;
  v_wpos int := 0;
  v_epos int;
  v_student uuid := (p_payload->>'student_id')::uuid;
begin
  if not public.is_trainer() then raise exception 'Apenas professor pode importar treinos'; end if;
  if not exists(select 1 from public.profiles where id=v_student and role='student') then raise exception 'Aluno inválido'; end if;
  if coalesce(jsonb_array_length(p_payload->'workouts'),0) < 1 or jsonb_array_length(p_payload->'workouts') > 5 then raise exception 'O plano deve ter de 1 a 5 treinos'; end if;
  insert into public.training_plans(student_id,name,goal,starts_on,ends_on,notes,active,created_by)
  values(v_student,left(coalesce(nullif(trim(p_payload->>'plan_name'),''),'Plano importado'),120),nullif(trim(p_payload->>'goal'),''),nullif(p_payload->>'starts_on','')::date,nullif(p_payload->>'ends_on','')::date,nullif(trim(p_payload->>'notes'),''),true,(select auth.uid())) returning id into v_plan;
  for v_w in select value from jsonb_array_elements(p_payload->'workouts') loop
    v_wpos := v_wpos + 1;
    insert into public.workouts(plan_id,name,position,notes) values(v_plan,left(coalesce(nullif(trim(v_w->>'name'),''),'Treino '||chr(64+v_wpos)),100),v_wpos,nullif(trim(v_w->>'notes'),'')) returning id into v_workout;
    v_epos := 0;
    for v_e in select value from jsonb_array_elements(coalesce(v_w->'exercises','[]'::jsonb)) loop
      v_epos := v_epos + 1;
      if nullif(trim(v_e->>'exercise_name'),'') is null then raise exception 'Exercício sem nome no treino %',v_wpos; end if;
      insert into public.workout_exercises(workout_id,exercise_name,position,target_sets,rep_min,rep_max,target_rir,rest_seconds,execution_notes,notes)
      values(v_workout,left(trim(v_e->>'exercise_name'),160),v_epos,nullif(v_e->>'sets','')::smallint,nullif(v_e->>'rep_min','')::smallint,nullif(v_e->>'rep_max','')::smallint,nullif(v_e->>'rir','')::numeric,nullif(v_e->>'rest_seconds','')::integer,nullif(trim(v_e->>'execution'),''),nullif(trim(v_e->>'notes'),''));
    end loop;
  end loop;
  return v_plan;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin insert into public.profiles(id,email,full_name,role,active,birth_date,sex) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','Aluno'),'student',true,nullif(new.raw_user_meta_data->>'birth_date','')::date,nullif(new.raw_user_meta_data->>'sex','')) on conflict(id) do nothing; return new; end; $function$
;
CREATE OR REPLACE FUNCTION public.delete_training_plan(p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_name text;
  v_sessions integer;
begin
  if not public.is_trainer() then
    raise exception 'Apenas o professor pode excluir planos de treino';
  end if;

  select name into v_name
  from public.training_plans
  where id = p_plan_id
  for update;

  if not found then
    raise exception 'Plano de treino não encontrado';
  end if;

  select count(*) into v_sessions
  from public.workout_sessions s
  join public.workouts w on w.id = s.workout_id
  where w.plan_id = p_plan_id;

  if v_sessions > 0 then
    raise exception 'Este plano possui % sessão(ões) registrada(s). Desative o plano para preservar o histórico.', v_sessions;
  end if;

  delete from public.training_plans where id = p_plan_id;
  return jsonb_build_object('deleted', true, 'plan_name', v_name);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_admin_profile()
 RETURNS app_role
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select lg_private.claim_admin_profile();
$function$
;
CREATE OR REPLACE FUNCTION public.record_student_workout(p_session_id uuid, p_workout_id uuid, p_performed_at timestamp with time zone, p_notes text, p_sets jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION lg_private.current_profile_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select p.role::text from public.profiles p
 where p.id = (select auth.uid()) and p.active is true;
$function$
;
CREATE OR REPLACE FUNCTION public.is_trainer()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select coalesce(lg_private.current_profile_role() = 'trainer', false);
$function$
;
CREATE OR REPLACE FUNCTION lg_private.claim_admin_profile()
 RETURNS app_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid := auth.uid(); e text; a public.admin_activation_allowlist%rowtype; r public.app_role;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 select lower(email) into e from auth.users where id=u and email_confirmed_at is not null;
 if e is null then raise exception 'email_not_verified'; end if;
 select * into a from public.admin_activation_allowlist where lower(email)=e for update;
 if not found or (a.claimed_by is not null and a.claimed_by<>u) then raise exception 'not_authorized'; end if;
 if a.claimed_by=u then
   select role into r from public.profiles where id=u and active is true and role=a.role;
   if r is null then raise exception 'account_inactive_or_claim_consumed'; end if;
   return r;
 end if;
 insert into public.profiles(id,role,full_name,email,active) values(u,a.role,a.full_name,e,true)
 on conflict(id) do update set role=excluded.role,full_name=excluded.full_name,email=excluded.email,active=true;
 update public.admin_activation_allowlist set claimed_by=u,claimed_at=now() where email=a.email;
 return a.role;
end $function$
;
CREATE OR REPLACE FUNCTION public.get_trainer_profile_notes()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
 if not public.is_trainer() then raise exception 'not_authorized'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'observations',observations)) from lg_private.profile_notes),'[]'::jsonb);
end $function$
;
CREATE OR REPLACE FUNCTION lg_private.protect_profile_notes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.observations is not null and auth.uid() is not null and not public.is_trainer() then
   raise exception 'not_authorized';
 end if;
 -- NULL means untouched for old cached clients; explicit empty text clears a note.
 if new.observations is null then
   null;
 elsif trim(new.observations)='' then
   delete from lg_private.profile_notes where profile_id=new.id;
 else
   insert into lg_private.profile_notes(profile_id,observations) values(new.id,new.observations)
   on conflict(profile_id) do update set observations=excluded.observations,updated_at=now();
 end if;
 new.observations:=null;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.export_system_backup()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare t text; rows jsonb; tables jsonb := '{}'::jsonb; result jsonb; n bigint;
begin
 if not public.is_trainer() then raise exception 'not_authorized'; end if;
 foreach t in array array['profiles','exercise_library','assessments','circumferences','skinfolds',
 'strength_tests','vo2_tests','vo2_stages','anamneses','training_plans','workouts',
 'workout_exercises','workout_sessions','exercise_sets','guidance','progress_photos','student_followups'] loop
   execute format('select count(*) from public.%I',t) into n;
   if n>100000 then raise exception 'backup_table_too_large'; end if;
   execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from public.%I r',t) into rows;
   tables:=tables || jsonb_build_object(t,rows);
 end loop;
 result:=jsonb_build_object('format','lg-system-snapshot','version',1,'project_ref','ziunjhebdkqdmvsrjxhm',
   'created_at',now(),'tables',tables,'private_notes',coalesce((select jsonb_agg(to_jsonb(p)) from lg_private.profile_notes p),'[]'::jsonb),
   'storage_files',coalesce((select jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name,'metadata',metadata,'updated_at',updated_at) order by bucket_id,name)
     from storage.objects where bucket_id in ('progress-photos','assessment-docs','assessment-documents')),'[]'::jsonb));
 if octet_length(result::text)>20971520 then raise exception 'backup_payload_too_large'; end if;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION public.billing_record_sandbox_event(p_run uuid, p_event_id text, p_event text, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin perform 1 from billing_sandbox_runs where id=p_run for update; insert into billing_sandbox_events(id,run_id,event,status) values(p_event_id,p_run,p_event,p_status) on conflict do nothing; if not found then return; end if; update billing_sandbox_runs set provider_status=p_status,paid_at=case when p_status in ('CONFIRMED','RECEIVED') then coalesce(paid_at,now()) else paid_at end,access_until=case when p_status in ('CONFIRMED','RECEIVED') then coalesce(paid_at,now())+interval '31 days' else null end where id=p_run; end $function$
;
CREATE OR REPLACE FUNCTION public.record_student_workout_v2(p_session_id uuid, p_workout_id uuid, p_performed_at timestamp with time zone, p_notes text, p_sets jsonb, p_exercise_notes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_saved jsonb; v_entry record; v_set jsonb; v_snapshot jsonb;
BEGIN
 IF jsonb_typeof(p_sets) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Séries inválidas';
 END IF;
 FOR v_set IN SELECT value FROM jsonb_array_elements(p_sets) LOOP
  IF v_set ? 'rest_seconds' AND v_set->>'rest_seconds' IS NOT NULL
     AND ((v_set->>'rest_seconds') !~ '^\d+$'
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
END $function$
;
CREATE OR REPLACE FUNCTION public.billing_record_payment(event_id text, event_name text, payment jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare sid uuid; oid uuid; item record; until_at timestamptz; credit_at timestamptz;begin
 sid=(payment->>'student_id')::uuid; oid=(payment->>'order_id')::uuid;
 -- Account lock serializes distinct payment events and early renewals.
 perform 1 from billing_accounts where student_id=sid for update;
 if not found then raise exception 'account_missing'; end if;
 if not exists(select 1 from billing_orders where id=oid and student_id=sid and amount_cents=(payment->>'amount_cents')::integer) then raise exception 'order_mismatch'; end if;
 insert into billing_events(id,event,resource_id) values(event_id,event_name,payment->>'asaas_id') on conflict do nothing;
 if not found then return; end if;
 insert into billing_payments(asaas_id,student_id,order_id,subscription_id,amount_cents,status,due_date,period_end,paid_at)
 values(payment->>'asaas_id',sid,oid,payment->>'subscription_id',(payment->>'amount_cents')::integer,payment->>'status',(payment->>'due_date')::date,(payment->>'period_end')::date,case when payment->>'status'='paid' then coalesce((payment->>'paid_at')::timestamptz,now()) end)
 on conflict(asaas_id) do update set status=case when billing_payments.status='paid' and excluded.status in ('pending','overdue') then billing_payments.status else excluded.status end,paid_at=coalesce(billing_payments.paid_at,excluded.paid_at),updated_at=now();
 update billing_orders set status=(select status from billing_payments where asaas_id=payment->>'asaas_id') where id=oid;
 -- Recompute from canonical paid history, excluding assessments, refunds and disputes.
 until_at=null;
 for item in select p.paid_at from billing_payments p join billing_orders o on o.id=p.order_id where p.student_id=sid and p.status='paid' and o.kind='monthly' order by p.paid_at,p.asaas_id loop
  credit_at=greatest(coalesce(until_at,item.paid_at),item.paid_at);until_at=credit_at+interval '31 days';
 end loop;
 update billing_accounts set access_until=until_at,updated_at=now() where student_id=sid;
end $function$
;
CREATE OR REPLACE FUNCTION public.billing_has_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$select (public.billing_access_status()->>'allowed')::boolean$function$
;
CREATE OR REPLACE FUNCTION lg_private.enqueue_billing_worker()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare nonce text; job uuid;
begin
 if not exists(select 1 from public.billing_settings s where (s.enabled and s.environment='production') or (s.sandbox_enabled and s.environment='sandbox')) then return; end if;
 nonce=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into public.billing_jobs(kind,token_hash,expires_at) values('worker',encode(extensions.digest(nonce,'sha256'),'hex'),now()+interval '5 minutes') returning id into job;
 perform net.http_post(url:='https://ziunjhebdkqdmvsrjxhm.supabase.co/functions/v1/billing-worker',body:=jsonb_build_object('job_id',job,'token',nonce),headers:='{"Content-Type":"application/json"}'::jsonb,timeout_milliseconds:=100000);
 delete from public.billing_jobs where expires_at<now()-interval '7 days';
end $function$
;
CREATE OR REPLACE FUNCTION public.billing_record_mp_payment(event_id text, event_name text, payment jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if (payment->>'asaas_id') !~ '^mp:[0-9]+$' or not exists(
 select 1 from billing_orders o join billing_accounts a on a.student_id=o.student_id
 where o.id=(payment->>'order_id')::uuid and o.student_id=(payment->>'student_id')::uuid
 and o.provider='mercadopago' and o.environment='sandbox' and a.is_test and a.environment='sandbox'
 ) then raise exception 'mercadopago_test_order_required';end if;
 perform public.billing_record_payment(event_id,event_name,payment);
end $function$
;
CREATE OR REPLACE FUNCTION public.billing_access_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare a billing_accounts%rowtype; s billing_settings%rowtype; enforced boolean;begin
 if auth.uid() is null then raise exception 'unauthenticated'; end if;
 if public.is_trainer() then return jsonb_build_object('allowed',true,'status','trainer'); end if;
 select * into s from billing_settings where id=true;
 select * into a from billing_accounts where student_id=auth.uid();
 enforced=coalesce(a.enrolled,false) and ((s.enabled and s.environment='production' and a.environment='production') or (s.sandbox_enabled and a.is_test and s.environment='sandbox' and a.environment='sandbox') or (s.mercadopago_sandbox_enabled and a.is_test and a.environment='sandbox'));
 return jsonb_build_object('allowed',not enforced or coalesce(a.exempt,false) or (a.access_until is not null and now()<a.access_until+interval '5 days'),
 'status',case when coalesce(a.exempt,false) then 'exempt' when not enforced then 'not_started' when a.access_until is null then 'payment_required' when now()<a.access_until then 'active' when now()<a.access_until+interval '5 days' then 'grace' else 'payment_required' end,
 'access_until',a.access_until,'grace_until',a.access_until+interval '5 days','duration_days',31,'grace_days',5);
end $function$
;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_student();
CREATE TRIGGER protect_profile_notes BEFORE INSERT OR UPDATE OF observations ON public.profiles FOR EACH ROW EXECUTE FUNCTION lg_private.protect_profile_notes();
ALTER TABLE "lg_private"."profile_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."admin_activation_allowlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."anamneses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_card_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_sandbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_sandbox_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."circumferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exercise_library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exercise_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."guidance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."progress_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skinfolds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."strength_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_followups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."student_list_archives" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."training_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vo2_stages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vo2_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile own or trainer read" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = auth.uid()) OR is_trainer()));
CREATE POLICY "trainer manages profiles" ON "public"."profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "assessment own read" ON "public"."assessments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "trainer assessment write" ON "public"."assessments" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "skinfolds read" ON "public"."skinfolds" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = skinfolds.assessment_id) AND ((a.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "skinfolds trainer write" ON "public"."skinfolds" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "circ read" ON "public"."circumferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = circumferences.assessment_id) AND ((a.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "circ trainer write" ON "public"."circumferences" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "strength read" ON "public"."strength_tests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = strength_tests.assessment_id) AND ((a.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "strength trainer write" ON "public"."strength_tests" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "vo2 read" ON "public"."vo2_tests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM assessments a
  WHERE ((a.id = vo2_tests.assessment_id) AND ((a.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "vo2 trainer write" ON "public"."vo2_tests" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "anamnesis read" ON "public"."anamneses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "anamnesis student update" ON "public"."anamneses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((student_id = auth.uid())) WITH CHECK ((student_id = auth.uid()));
CREATE POLICY "anamnesis trainer manage" ON "public"."anamneses" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "plans read" ON "public"."training_plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "plans trainer write" ON "public"."training_plans" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "trainer file delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = ANY (ARRAY['progress-photos'::text, 'assessment-docs'::text])) AND is_trainer()));
CREATE POLICY "workouts read" ON "public"."workouts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM training_plans p
  WHERE ((p.id = workouts.plan_id) AND ((p.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "workouts trainer write" ON "public"."workouts" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "exercises read" ON "public"."workout_exercises" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (workouts w
     JOIN training_plans p ON ((p.id = w.plan_id)))
  WHERE ((w.id = workout_exercises.workout_id) AND ((p.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "exercises trainer write" ON "public"."workout_exercises" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "sessions read" ON "public"."workout_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "anamnesis student insert" ON "public"."anamneses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((student_id = auth.uid()));
CREATE POLICY "trainer manages student followups" ON "public"."student_followups" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "student sessions insert" ON "public"."workout_sessions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((is_trainer() OR ((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (workouts w
     JOIN training_plans p ON ((p.id = w.plan_id)))
  WHERE ((w.id = workout_sessions.workout_id) AND (p.student_id = ( SELECT auth.uid() AS uid)) AND (p.active IS TRUE)))))));
CREATE POLICY "sets read" ON "public"."exercise_sets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM workout_sessions s
  WHERE ((s.id = exercise_sets.session_id) AND ((s.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "guidance read" ON "public"."guidance" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "guidance trainer write" ON "public"."guidance" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "private files student read" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = ANY (ARRAY['progress-photos'::text, 'assessment-docs'::text])) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_trainer())));
CREATE POLICY "trainer file upload" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = ANY (ARRAY['progress-photos'::text, 'assessment-docs'::text])) AND is_trainer()));
CREATE POLICY "authenticated reads exercise library" ON "public"."exercise_library" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "trainer manages exercise library" ON "public"."exercise_library" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "student own assessment documents select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'assessment-documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "student reads own progress photos" ON "public"."progress_photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = auth.uid()) OR is_trainer()));
CREATE POLICY "trainer manages progress photos" ON "public"."progress_photos" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "vo2 stages read" ON "public"."vo2_stages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (vo2_tests v
     JOIN assessments a ON ((a.id = v.assessment_id)))
  WHERE ((v.id = vo2_stages.vo2_test_id) AND ((a.student_id = auth.uid()) OR is_trainer())))));
CREATE POLICY "trainer assessment documents insert" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((bucket_id = 'assessment-documents'::text) AND ( SELECT is_trainer() AS is_trainer)));
CREATE POLICY "vo2 stages trainer write" ON "public"."vo2_stages" AS PERMISSIVE FOR ALL TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "student sessions update" ON "public"."workout_sessions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((is_trainer() OR (student_id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((is_trainer() OR ((student_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM (workouts w
     JOIN training_plans p ON ((p.id = w.plan_id)))
  WHERE ((w.id = workout_sessions.workout_id) AND (p.student_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "sets student write" ON "public"."exercise_sets" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM workout_sessions s
  WHERE ((s.id = exercise_sets.session_id) AND ((s.student_id = ( SELECT auth.uid() AS uid)) OR is_trainer()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (workout_sessions s
     JOIN workout_exercises e ON ((e.workout_id = s.workout_id)))
  WHERE ((s.id = exercise_sets.session_id) AND (e.id = exercise_sets.exercise_id) AND ((s.student_id = ( SELECT auth.uid() AS uid)) OR is_trainer())))));
CREATE POLICY "settings_trainer" ON "public"."billing_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "billing_storage_guard" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "authenticated" USING (((bucket_id <> ALL (ARRAY['progress-photos'::text, 'assessment-documents'::text, 'assessment-docs'::text])) OR ( SELECT billing_has_access() AS billing_has_access))) WITH CHECK (((bucket_id <> ALL (ARRAY['progress-photos'::text, 'assessment-documents'::text, 'assessment-docs'::text])) OR ( SELECT billing_has_access() AS billing_has_access)));
CREATE POLICY "active_profile_guard" ON "public"."exercise_library" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."assessments" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."circumferences" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."skinfolds" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."strength_tests" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."vo2_tests" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."vo2_stages" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."anamneses" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."training_plans" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "trainer_manage_student_archives" ON "public"."student_list_archives" AS PERMISSIVE FOR ALL TO "authenticated" USING (( SELECT is_trainer() AS is_trainer)) WITH CHECK ((( SELECT is_trainer() AS is_trainer) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = student_list_archives.student_id) AND (p.role = 'student'::app_role))))));
CREATE POLICY "active_profile_guard" ON "public"."workouts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."workout_exercises" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."workout_sessions" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."exercise_sets" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."guidance" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."progress_photos" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "public"."student_followups" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)) WITH CHECK ((( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL));
CREATE POLICY "active_profile_guard" ON "storage"."objects" AS RESTRICTIVE FOR ALL TO "authenticated" USING (((bucket_id <> ALL (ARRAY['progress-photos'::text, 'assessment-docs'::text, 'assessment-documents'::text])) OR (( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL))) WITH CHECK (((bucket_id <> ALL (ARRAY['progress-photos'::text, 'assessment-docs'::text, 'assessment-documents'::text])) OR (( SELECT lg_private.current_profile_role() AS current_profile_role) IS NOT NULL)));
CREATE POLICY "trainer file update" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = ANY (ARRAY['progress-photos'::text, 'assessment-docs'::text])) AND is_trainer())) WITH CHECK (((bucket_id = ANY (ARRAY['progress-photos'::text, 'assessment-docs'::text])) AND ( SELECT is_trainer() AS is_trainer)));
CREATE POLICY "trainer assessment documents select" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((bucket_id = 'assessment-documents'::text) AND ( SELECT is_trainer() AS is_trainer)));
CREATE POLICY "trainer assessment documents update" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((bucket_id = 'assessment-documents'::text) AND ( SELECT is_trainer() AS is_trainer))) WITH CHECK (((bucket_id = 'assessment-documents'::text) AND ( SELECT is_trainer() AS is_trainer)));
CREATE POLICY "trainer assessment documents delete" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((bucket_id = 'assessment-documents'::text) AND ( SELECT is_trainer() AS is_trainer)));
CREATE POLICY "trainer_read" ON "lg_private"."profile_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT is_trainer() AS is_trainer));
CREATE POLICY "settings_read" ON "public"."billing_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "account_read" ON "public"."billing_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR is_trainer()));
CREATE POLICY "account_trainer_insert" ON "public"."billing_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_trainer());
CREATE POLICY "account_trainer_update" ON "public"."billing_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "service_read" ON "public"."billing_services" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((active OR is_trainer()));
CREATE POLICY "service_trainer_insert" ON "public"."billing_services" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_trainer());
CREATE POLICY "service_trainer_update" ON "public"."billing_services" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (is_trainer()) WITH CHECK (is_trainer());
CREATE POLICY "order_read" ON "public"."billing_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR is_trainer()));
CREATE POLICY "payment_read" ON "public"."billing_payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((student_id = ( SELECT auth.uid() AS uid)) OR is_trainer()));
CREATE POLICY "billing_access_guard" ON "public"."anamneses" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."assessments" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."circumferences" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."exercise_library" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."exercise_sets" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."guidance" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."progress_photos" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."skinfolds" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."strength_tests" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."student_followups" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."training_plans" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."vo2_stages" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."vo2_tests" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."workout_exercises" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."workout_sessions" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
CREATE POLICY "billing_access_guard" ON "public"."workouts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (( SELECT billing_has_access() AS billing_has_access)) WITH CHECK (( SELECT billing_has_access() AS billing_has_access));
GRANT INSERT ON "public"."billing_card_tokens" TO "service_role";
GRANT SELECT ON "public"."billing_card_tokens" TO "service_role";
GRANT UPDATE ON "public"."billing_card_tokens" TO "service_role";
GRANT DELETE ON "public"."billing_card_tokens" TO "service_role";
GRANT TRUNCATE ON "public"."billing_card_tokens" TO "service_role";
GRANT REFERENCES ON "public"."billing_card_tokens" TO "service_role";
GRANT TRIGGER ON "public"."billing_card_tokens" TO "service_role";
GRANT INSERT ON "public"."billing_attempts" TO "service_role";
GRANT SELECT ON "public"."billing_attempts" TO "service_role";
GRANT UPDATE ON "public"."billing_attempts" TO "service_role";
GRANT DELETE ON "public"."billing_attempts" TO "service_role";
GRANT TRUNCATE ON "public"."billing_attempts" TO "service_role";
GRANT REFERENCES ON "public"."billing_attempts" TO "service_role";
GRANT TRIGGER ON "public"."billing_attempts" TO "service_role";
GRANT INSERT ON "public"."billing_jobs" TO "service_role";
GRANT SELECT ON "public"."billing_jobs" TO "service_role";
GRANT UPDATE ON "public"."billing_jobs" TO "service_role";
GRANT DELETE ON "public"."billing_jobs" TO "service_role";
GRANT TRUNCATE ON "public"."billing_jobs" TO "service_role";
GRANT REFERENCES ON "public"."billing_jobs" TO "service_role";
GRANT TRIGGER ON "public"."billing_jobs" TO "service_role";
GRANT INSERT ON "public"."assessments" TO "authenticated";
GRANT SELECT ON "public"."assessments" TO "authenticated";
GRANT UPDATE ON "public"."assessments" TO "authenticated";
GRANT DELETE ON "public"."assessments" TO "authenticated";
GRANT TRUNCATE ON "public"."assessments" TO "authenticated";
GRANT REFERENCES ON "public"."assessments" TO "authenticated";
GRANT TRIGGER ON "public"."assessments" TO "authenticated";
GRANT INSERT ON "public"."assessments" TO "service_role";
GRANT SELECT ON "public"."assessments" TO "service_role";
GRANT UPDATE ON "public"."assessments" TO "service_role";
GRANT DELETE ON "public"."assessments" TO "service_role";
GRANT TRUNCATE ON "public"."assessments" TO "service_role";
GRANT REFERENCES ON "public"."assessments" TO "service_role";
GRANT TRIGGER ON "public"."assessments" TO "service_role";
GRANT INSERT ON "public"."circumferences" TO "authenticated";
GRANT SELECT ON "public"."circumferences" TO "authenticated";
GRANT UPDATE ON "public"."circumferences" TO "authenticated";
GRANT DELETE ON "public"."circumferences" TO "authenticated";
GRANT TRUNCATE ON "public"."circumferences" TO "authenticated";
GRANT REFERENCES ON "public"."circumferences" TO "authenticated";
GRANT TRIGGER ON "public"."circumferences" TO "authenticated";
GRANT INSERT ON "public"."circumferences" TO "service_role";
GRANT SELECT ON "public"."circumferences" TO "service_role";
GRANT UPDATE ON "public"."circumferences" TO "service_role";
GRANT DELETE ON "public"."circumferences" TO "service_role";
GRANT TRUNCATE ON "public"."circumferences" TO "service_role";
GRANT REFERENCES ON "public"."circumferences" TO "service_role";
GRANT TRIGGER ON "public"."circumferences" TO "service_role";
GRANT INSERT ON "public"."profiles" TO "authenticated";
GRANT SELECT ON "public"."profiles" TO "authenticated";
GRANT UPDATE ON "public"."profiles" TO "authenticated";
GRANT DELETE ON "public"."profiles" TO "authenticated";
GRANT TRUNCATE ON "public"."profiles" TO "authenticated";
GRANT REFERENCES ON "public"."profiles" TO "authenticated";
GRANT TRIGGER ON "public"."profiles" TO "authenticated";
GRANT INSERT ON "public"."profiles" TO "service_role";
GRANT SELECT ON "public"."profiles" TO "service_role";
GRANT UPDATE ON "public"."profiles" TO "service_role";
GRANT DELETE ON "public"."profiles" TO "service_role";
GRANT TRUNCATE ON "public"."profiles" TO "service_role";
GRANT REFERENCES ON "public"."profiles" TO "service_role";
GRANT TRIGGER ON "public"."profiles" TO "service_role";
GRANT INSERT ON "public"."skinfolds" TO "authenticated";
GRANT SELECT ON "public"."skinfolds" TO "authenticated";
GRANT UPDATE ON "public"."skinfolds" TO "authenticated";
GRANT DELETE ON "public"."skinfolds" TO "authenticated";
GRANT TRUNCATE ON "public"."skinfolds" TO "authenticated";
GRANT REFERENCES ON "public"."skinfolds" TO "authenticated";
GRANT TRIGGER ON "public"."skinfolds" TO "authenticated";
GRANT INSERT ON "public"."skinfolds" TO "service_role";
GRANT SELECT ON "public"."skinfolds" TO "service_role";
GRANT UPDATE ON "public"."skinfolds" TO "service_role";
GRANT DELETE ON "public"."skinfolds" TO "service_role";
GRANT TRUNCATE ON "public"."skinfolds" TO "service_role";
GRANT REFERENCES ON "public"."skinfolds" TO "service_role";
GRANT TRIGGER ON "public"."skinfolds" TO "service_role";
GRANT INSERT ON "public"."strength_tests" TO "authenticated";
GRANT SELECT ON "public"."strength_tests" TO "authenticated";
GRANT UPDATE ON "public"."strength_tests" TO "authenticated";
GRANT DELETE ON "public"."strength_tests" TO "authenticated";
GRANT TRUNCATE ON "public"."strength_tests" TO "authenticated";
GRANT REFERENCES ON "public"."strength_tests" TO "authenticated";
GRANT TRIGGER ON "public"."strength_tests" TO "authenticated";
GRANT INSERT ON "public"."strength_tests" TO "service_role";
GRANT SELECT ON "public"."strength_tests" TO "service_role";
GRANT UPDATE ON "public"."strength_tests" TO "service_role";
GRANT DELETE ON "public"."strength_tests" TO "service_role";
GRANT TRUNCATE ON "public"."strength_tests" TO "service_role";
GRANT REFERENCES ON "public"."strength_tests" TO "service_role";
GRANT TRIGGER ON "public"."strength_tests" TO "service_role";
GRANT INSERT ON "public"."admin_activation_allowlist" TO "service_role";
GRANT SELECT ON "public"."admin_activation_allowlist" TO "service_role";
GRANT UPDATE ON "public"."admin_activation_allowlist" TO "service_role";
GRANT DELETE ON "public"."admin_activation_allowlist" TO "service_role";
GRANT TRUNCATE ON "public"."admin_activation_allowlist" TO "service_role";
GRANT REFERENCES ON "public"."admin_activation_allowlist" TO "service_role";
GRANT TRIGGER ON "public"."admin_activation_allowlist" TO "service_role";
GRANT INSERT ON "public"."billing_events" TO "service_role";
GRANT SELECT ON "public"."billing_events" TO "service_role";
GRANT UPDATE ON "public"."billing_events" TO "service_role";
GRANT DELETE ON "public"."billing_events" TO "service_role";
GRANT TRUNCATE ON "public"."billing_events" TO "service_role";
GRANT REFERENCES ON "public"."billing_events" TO "service_role";
GRANT TRIGGER ON "public"."billing_events" TO "service_role";
GRANT INSERT ON "public"."workout_sessions" TO "authenticated";
GRANT SELECT ON "public"."workout_sessions" TO "authenticated";
GRANT UPDATE ON "public"."workout_sessions" TO "authenticated";
GRANT DELETE ON "public"."workout_sessions" TO "authenticated";
GRANT TRUNCATE ON "public"."workout_sessions" TO "authenticated";
GRANT REFERENCES ON "public"."workout_sessions" TO "authenticated";
GRANT TRIGGER ON "public"."workout_sessions" TO "authenticated";
GRANT INSERT ON "public"."workout_sessions" TO "service_role";
GRANT SELECT ON "public"."workout_sessions" TO "service_role";
GRANT UPDATE ON "public"."workout_sessions" TO "service_role";
GRANT DELETE ON "public"."workout_sessions" TO "service_role";
GRANT TRUNCATE ON "public"."workout_sessions" TO "service_role";
GRANT REFERENCES ON "public"."workout_sessions" TO "service_role";
GRANT TRIGGER ON "public"."workout_sessions" TO "service_role";
GRANT INSERT ON "public"."exercise_library" TO "authenticated";
GRANT SELECT ON "public"."exercise_library" TO "authenticated";
GRANT UPDATE ON "public"."exercise_library" TO "authenticated";
GRANT DELETE ON "public"."exercise_library" TO "authenticated";
GRANT TRUNCATE ON "public"."exercise_library" TO "authenticated";
GRANT REFERENCES ON "public"."exercise_library" TO "authenticated";
GRANT TRIGGER ON "public"."exercise_library" TO "authenticated";
GRANT INSERT ON "public"."exercise_library" TO "service_role";
GRANT SELECT ON "public"."exercise_library" TO "service_role";
GRANT UPDATE ON "public"."exercise_library" TO "service_role";
GRANT DELETE ON "public"."exercise_library" TO "service_role";
GRANT TRUNCATE ON "public"."exercise_library" TO "service_role";
GRANT REFERENCES ON "public"."exercise_library" TO "service_role";
GRANT TRIGGER ON "public"."exercise_library" TO "service_role";
GRANT INSERT ON "public"."progress_photos" TO "authenticated";
GRANT SELECT ON "public"."progress_photos" TO "authenticated";
GRANT UPDATE ON "public"."progress_photos" TO "authenticated";
GRANT DELETE ON "public"."progress_photos" TO "authenticated";
GRANT TRUNCATE ON "public"."progress_photos" TO "authenticated";
GRANT REFERENCES ON "public"."progress_photos" TO "authenticated";
GRANT TRIGGER ON "public"."progress_photos" TO "authenticated";
GRANT INSERT ON "public"."progress_photos" TO "service_role";
GRANT SELECT ON "public"."progress_photos" TO "service_role";
GRANT UPDATE ON "public"."progress_photos" TO "service_role";
GRANT DELETE ON "public"."progress_photos" TO "service_role";
GRANT TRUNCATE ON "public"."progress_photos" TO "service_role";
GRANT REFERENCES ON "public"."progress_photos" TO "service_role";
GRANT TRIGGER ON "public"."progress_photos" TO "service_role";
GRANT INSERT ON "public"."training_plans" TO "authenticated";
GRANT SELECT ON "public"."training_plans" TO "authenticated";
GRANT UPDATE ON "public"."training_plans" TO "authenticated";
GRANT DELETE ON "public"."training_plans" TO "authenticated";
GRANT TRUNCATE ON "public"."training_plans" TO "authenticated";
GRANT REFERENCES ON "public"."training_plans" TO "authenticated";
GRANT TRIGGER ON "public"."training_plans" TO "authenticated";
GRANT INSERT ON "public"."training_plans" TO "service_role";
GRANT SELECT ON "public"."training_plans" TO "service_role";
GRANT UPDATE ON "public"."training_plans" TO "service_role";
GRANT DELETE ON "public"."training_plans" TO "service_role";
GRANT TRUNCATE ON "public"."training_plans" TO "service_role";
GRANT REFERENCES ON "public"."training_plans" TO "service_role";
GRANT TRIGGER ON "public"."training_plans" TO "service_role";
GRANT INSERT ON "public"."vo2_tests" TO "authenticated";
GRANT SELECT ON "public"."vo2_tests" TO "authenticated";
GRANT UPDATE ON "public"."vo2_tests" TO "authenticated";
GRANT DELETE ON "public"."vo2_tests" TO "authenticated";
GRANT TRUNCATE ON "public"."vo2_tests" TO "authenticated";
GRANT REFERENCES ON "public"."vo2_tests" TO "authenticated";
GRANT TRIGGER ON "public"."vo2_tests" TO "authenticated";
GRANT INSERT ON "public"."vo2_tests" TO "service_role";
GRANT SELECT ON "public"."vo2_tests" TO "service_role";
GRANT UPDATE ON "public"."vo2_tests" TO "service_role";
GRANT DELETE ON "public"."vo2_tests" TO "service_role";
GRANT TRUNCATE ON "public"."vo2_tests" TO "service_role";
GRANT REFERENCES ON "public"."vo2_tests" TO "service_role";
GRANT TRIGGER ON "public"."vo2_tests" TO "service_role";
GRANT INSERT ON "public"."workout_exercises" TO "authenticated";
GRANT SELECT ON "public"."workout_exercises" TO "authenticated";
GRANT UPDATE ON "public"."workout_exercises" TO "authenticated";
GRANT DELETE ON "public"."workout_exercises" TO "authenticated";
GRANT TRUNCATE ON "public"."workout_exercises" TO "authenticated";
GRANT REFERENCES ON "public"."workout_exercises" TO "authenticated";
GRANT TRIGGER ON "public"."workout_exercises" TO "authenticated";
GRANT INSERT ON "public"."workout_exercises" TO "service_role";
GRANT SELECT ON "public"."workout_exercises" TO "service_role";
GRANT UPDATE ON "public"."workout_exercises" TO "service_role";
GRANT DELETE ON "public"."workout_exercises" TO "service_role";
GRANT TRUNCATE ON "public"."workout_exercises" TO "service_role";
GRANT REFERENCES ON "public"."workout_exercises" TO "service_role";
GRANT TRIGGER ON "public"."workout_exercises" TO "service_role";
GRANT INSERT ON "public"."billing_payments" TO "service_role";
GRANT SELECT ON "public"."billing_payments" TO "service_role";
GRANT UPDATE ON "public"."billing_payments" TO "service_role";
GRANT DELETE ON "public"."billing_payments" TO "service_role";
GRANT TRUNCATE ON "public"."billing_payments" TO "service_role";
GRANT REFERENCES ON "public"."billing_payments" TO "service_role";
GRANT TRIGGER ON "public"."billing_payments" TO "service_role";
GRANT SELECT ON "public"."billing_payments" TO "authenticated";
GRANT INSERT ON "public"."workouts" TO "authenticated";
GRANT SELECT ON "public"."workouts" TO "authenticated";
GRANT UPDATE ON "public"."workouts" TO "authenticated";
GRANT DELETE ON "public"."workouts" TO "authenticated";
GRANT TRUNCATE ON "public"."workouts" TO "authenticated";
GRANT REFERENCES ON "public"."workouts" TO "authenticated";
GRANT TRIGGER ON "public"."workouts" TO "authenticated";
GRANT INSERT ON "public"."workouts" TO "service_role";
GRANT SELECT ON "public"."workouts" TO "service_role";
GRANT UPDATE ON "public"."workouts" TO "service_role";
GRANT DELETE ON "public"."workouts" TO "service_role";
GRANT TRUNCATE ON "public"."workouts" TO "service_role";
GRANT REFERENCES ON "public"."workouts" TO "service_role";
GRANT TRIGGER ON "public"."workouts" TO "service_role";
GRANT INSERT ON "public"."billing_orders" TO "service_role";
GRANT SELECT ON "public"."billing_orders" TO "service_role";
GRANT UPDATE ON "public"."billing_orders" TO "service_role";
GRANT DELETE ON "public"."billing_orders" TO "service_role";
GRANT TRUNCATE ON "public"."billing_orders" TO "service_role";
GRANT REFERENCES ON "public"."billing_orders" TO "service_role";
GRANT TRIGGER ON "public"."billing_orders" TO "service_role";
GRANT SELECT ON "public"."billing_orders" TO "authenticated";
GRANT INSERT ON "public"."vo2_stages" TO "authenticated";
GRANT SELECT ON "public"."vo2_stages" TO "authenticated";
GRANT UPDATE ON "public"."vo2_stages" TO "authenticated";
GRANT DELETE ON "public"."vo2_stages" TO "authenticated";
GRANT TRUNCATE ON "public"."vo2_stages" TO "authenticated";
GRANT REFERENCES ON "public"."vo2_stages" TO "authenticated";
GRANT TRIGGER ON "public"."vo2_stages" TO "authenticated";
GRANT INSERT ON "public"."vo2_stages" TO "service_role";
GRANT SELECT ON "public"."vo2_stages" TO "service_role";
GRANT UPDATE ON "public"."vo2_stages" TO "service_role";
GRANT DELETE ON "public"."vo2_stages" TO "service_role";
GRANT TRUNCATE ON "public"."vo2_stages" TO "service_role";
GRANT REFERENCES ON "public"."vo2_stages" TO "service_role";
GRANT TRIGGER ON "public"."vo2_stages" TO "service_role";
GRANT INSERT ON "public"."exercise_sets" TO "authenticated";
GRANT SELECT ON "public"."exercise_sets" TO "authenticated";
GRANT UPDATE ON "public"."exercise_sets" TO "authenticated";
GRANT DELETE ON "public"."exercise_sets" TO "authenticated";
GRANT TRUNCATE ON "public"."exercise_sets" TO "authenticated";
GRANT REFERENCES ON "public"."exercise_sets" TO "authenticated";
GRANT TRIGGER ON "public"."exercise_sets" TO "authenticated";
GRANT INSERT ON "public"."exercise_sets" TO "service_role";
GRANT SELECT ON "public"."exercise_sets" TO "service_role";
GRANT UPDATE ON "public"."exercise_sets" TO "service_role";
GRANT DELETE ON "public"."exercise_sets" TO "service_role";
GRANT TRUNCATE ON "public"."exercise_sets" TO "service_role";
GRANT REFERENCES ON "public"."exercise_sets" TO "service_role";
GRANT TRIGGER ON "public"."exercise_sets" TO "service_role";
GRANT INSERT ON "public"."billing_services" TO "service_role";
GRANT SELECT ON "public"."billing_services" TO "service_role";
GRANT UPDATE ON "public"."billing_services" TO "service_role";
GRANT DELETE ON "public"."billing_services" TO "service_role";
GRANT TRUNCATE ON "public"."billing_services" TO "service_role";
GRANT REFERENCES ON "public"."billing_services" TO "service_role";
GRANT TRIGGER ON "public"."billing_services" TO "service_role";
GRANT INSERT ON "public"."billing_services" TO "authenticated";
GRANT SELECT ON "public"."billing_services" TO "authenticated";
GRANT UPDATE ON "public"."billing_services" TO "authenticated";
GRANT INSERT ON "public"."anamneses" TO "authenticated";
GRANT SELECT ON "public"."anamneses" TO "authenticated";
GRANT UPDATE ON "public"."anamneses" TO "authenticated";
GRANT DELETE ON "public"."anamneses" TO "authenticated";
GRANT TRUNCATE ON "public"."anamneses" TO "authenticated";
GRANT REFERENCES ON "public"."anamneses" TO "authenticated";
GRANT TRIGGER ON "public"."anamneses" TO "authenticated";
GRANT INSERT ON "public"."anamneses" TO "service_role";
GRANT SELECT ON "public"."anamneses" TO "service_role";
GRANT UPDATE ON "public"."anamneses" TO "service_role";
GRANT DELETE ON "public"."anamneses" TO "service_role";
GRANT TRUNCATE ON "public"."anamneses" TO "service_role";
GRANT REFERENCES ON "public"."anamneses" TO "service_role";
GRANT TRIGGER ON "public"."anamneses" TO "service_role";
GRANT INSERT ON "public"."billing_settings" TO "service_role";
GRANT SELECT ON "public"."billing_settings" TO "service_role";
GRANT UPDATE ON "public"."billing_settings" TO "service_role";
GRANT DELETE ON "public"."billing_settings" TO "service_role";
GRANT TRUNCATE ON "public"."billing_settings" TO "service_role";
GRANT REFERENCES ON "public"."billing_settings" TO "service_role";
GRANT TRIGGER ON "public"."billing_settings" TO "service_role";
GRANT SELECT ON "public"."billing_settings" TO "authenticated";
GRANT INSERT ON "public"."guidance" TO "authenticated";
GRANT SELECT ON "public"."guidance" TO "authenticated";
GRANT UPDATE ON "public"."guidance" TO "authenticated";
GRANT DELETE ON "public"."guidance" TO "authenticated";
GRANT TRUNCATE ON "public"."guidance" TO "authenticated";
GRANT REFERENCES ON "public"."guidance" TO "authenticated";
GRANT TRIGGER ON "public"."guidance" TO "authenticated";
GRANT INSERT ON "public"."guidance" TO "service_role";
GRANT SELECT ON "public"."guidance" TO "service_role";
GRANT UPDATE ON "public"."guidance" TO "service_role";
GRANT DELETE ON "public"."guidance" TO "service_role";
GRANT TRUNCATE ON "public"."guidance" TO "service_role";
GRANT REFERENCES ON "public"."guidance" TO "service_role";
GRANT TRIGGER ON "public"."guidance" TO "service_role";
GRANT INSERT ON "public"."student_followups" TO "authenticated";
GRANT SELECT ON "public"."student_followups" TO "authenticated";
GRANT UPDATE ON "public"."student_followups" TO "authenticated";
GRANT DELETE ON "public"."student_followups" TO "authenticated";
GRANT TRUNCATE ON "public"."student_followups" TO "authenticated";
GRANT REFERENCES ON "public"."student_followups" TO "authenticated";
GRANT TRIGGER ON "public"."student_followups" TO "authenticated";
GRANT INSERT ON "public"."student_followups" TO "service_role";
GRANT SELECT ON "public"."student_followups" TO "service_role";
GRANT UPDATE ON "public"."student_followups" TO "service_role";
GRANT DELETE ON "public"."student_followups" TO "service_role";
GRANT TRUNCATE ON "public"."student_followups" TO "service_role";
GRANT REFERENCES ON "public"."student_followups" TO "service_role";
GRANT TRIGGER ON "public"."student_followups" TO "service_role";
GRANT INSERT ON "public"."billing_accounts" TO "service_role";
GRANT SELECT ON "public"."billing_accounts" TO "service_role";
GRANT UPDATE ON "public"."billing_accounts" TO "service_role";
GRANT DELETE ON "public"."billing_accounts" TO "service_role";
GRANT TRUNCATE ON "public"."billing_accounts" TO "service_role";
GRANT REFERENCES ON "public"."billing_accounts" TO "service_role";
GRANT TRIGGER ON "public"."billing_accounts" TO "service_role";
GRANT SELECT ON "public"."billing_accounts" TO "authenticated";
GRANT INSERT ON "public"."billing_sandbox_events" TO "service_role";
GRANT SELECT ON "public"."billing_sandbox_events" TO "service_role";
GRANT UPDATE ON "public"."billing_sandbox_events" TO "service_role";
GRANT DELETE ON "public"."billing_sandbox_events" TO "service_role";
GRANT TRUNCATE ON "public"."billing_sandbox_events" TO "service_role";
GRANT REFERENCES ON "public"."billing_sandbox_events" TO "service_role";
GRANT TRIGGER ON "public"."billing_sandbox_events" TO "service_role";
GRANT INSERT ON "public"."billing_sandbox_runs" TO "service_role";
GRANT SELECT ON "public"."billing_sandbox_runs" TO "service_role";
GRANT UPDATE ON "public"."billing_sandbox_runs" TO "service_role";
GRANT DELETE ON "public"."billing_sandbox_runs" TO "service_role";
GRANT TRUNCATE ON "public"."billing_sandbox_runs" TO "service_role";
GRANT REFERENCES ON "public"."billing_sandbox_runs" TO "service_role";
GRANT TRIGGER ON "public"."billing_sandbox_runs" TO "service_role";
GRANT INSERT ON "public"."student_list_archives" TO "authenticated";
GRANT SELECT ON "public"."student_list_archives" TO "authenticated";
GRANT UPDATE ON "public"."student_list_archives" TO "authenticated";
GRANT DELETE ON "public"."student_list_archives" TO "authenticated";
GRANT TRUNCATE ON "public"."student_list_archives" TO "authenticated";
GRANT REFERENCES ON "public"."student_list_archives" TO "authenticated";
GRANT TRIGGER ON "public"."student_list_archives" TO "authenticated";
GRANT INSERT ON "public"."student_list_archives" TO "service_role";
GRANT SELECT ON "public"."student_list_archives" TO "service_role";
GRANT UPDATE ON "public"."student_list_archives" TO "service_role";
GRANT DELETE ON "public"."student_list_archives" TO "service_role";
GRANT TRUNCATE ON "public"."student_list_archives" TO "service_role";
GRANT REFERENCES ON "public"."student_list_archives" TO "service_role";
GRANT TRIGGER ON "public"."student_list_archives" TO "service_role";
GRANT SELECT ON "lg_private"."profile_notes" TO "authenticated";
GRANT INSERT ON "lg_private"."profile_notes" TO "service_role";
GRANT SELECT ON "lg_private"."profile_notes" TO "service_role";
GRANT UPDATE ON "lg_private"."profile_notes" TO "service_role";
GRANT DELETE ON "lg_private"."profile_notes" TO "service_role";
GRANT TRUNCATE ON "lg_private"."profile_notes" TO "service_role";
GRANT REFERENCES ON "lg_private"."profile_notes" TO "service_role";
GRANT TRIGGER ON "lg_private"."profile_notes" TO "service_role";
REVOKE ALL ON FUNCTION archive_student_for_days(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION archive_student_for_days(uuid,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION archive_student_for_days(uuid,integer) TO "service_role";
REVOKE ALL ON FUNCTION import_training_plan(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION import_training_plan(jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION import_training_plan(jsonb) TO "service_role";
REVOKE ALL ON FUNCTION handle_new_student() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION handle_new_student() TO "service_role";
REVOKE ALL ON FUNCTION delete_training_plan(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION delete_training_plan(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION delete_training_plan(uuid) TO "service_role";
REVOKE ALL ON FUNCTION claim_admin_profile() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION claim_admin_profile() TO "authenticated";
GRANT EXECUTE ON FUNCTION claim_admin_profile() TO "service_role";
REVOKE ALL ON FUNCTION record_student_workout(uuid,uuid,timestamp with time zone,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION record_student_workout(uuid,uuid,timestamp with time zone,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION record_student_workout(uuid,uuid,timestamp with time zone,text,jsonb) TO "service_role";
REVOKE ALL ON FUNCTION lg_private.current_profile_role() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION lg_private.current_profile_role() TO "authenticated";
GRANT EXECUTE ON FUNCTION lg_private.current_profile_role() TO "service_role";
REVOKE ALL ON FUNCTION is_trainer() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION is_trainer() TO "service_role";
GRANT EXECUTE ON FUNCTION is_trainer() TO "authenticated";
REVOKE ALL ON FUNCTION lg_private.claim_admin_profile() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION lg_private.claim_admin_profile() TO "authenticated";
GRANT EXECUTE ON FUNCTION lg_private.claim_admin_profile() TO "service_role";
REVOKE ALL ON FUNCTION get_trainer_profile_notes() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION get_trainer_profile_notes() TO "authenticated";
GRANT EXECUTE ON FUNCTION get_trainer_profile_notes() TO "service_role";
REVOKE ALL ON FUNCTION lg_private.protect_profile_notes() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION export_system_backup() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION export_system_backup() TO "authenticated";
GRANT EXECUTE ON FUNCTION export_system_backup() TO "service_role";
REVOKE ALL ON FUNCTION billing_record_sandbox_event(uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION billing_record_sandbox_event(uuid,text,text,text) TO "service_role";
REVOKE ALL ON FUNCTION record_student_workout_v2(uuid,uuid,timestamp with time zone,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION record_student_workout_v2(uuid,uuid,timestamp with time zone,text,jsonb,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION record_student_workout_v2(uuid,uuid,timestamp with time zone,text,jsonb,jsonb) TO "service_role";
REVOKE ALL ON FUNCTION billing_record_payment(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION billing_record_payment(text,text,jsonb) TO "service_role";
REVOKE ALL ON FUNCTION billing_has_access() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION billing_has_access() TO "authenticated";
GRANT EXECUTE ON FUNCTION billing_has_access() TO "service_role";
REVOKE ALL ON FUNCTION lg_private.enqueue_billing_worker() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION billing_record_mp_payment(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION billing_record_mp_payment(text,text,jsonb) TO "service_role";
REVOKE ALL ON FUNCTION billing_access_status() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION billing_access_status() TO "authenticated";
GRANT EXECUTE ON FUNCTION billing_access_status() TO "service_role";
