-- Repair the homework_submissions triggers.
--
-- Symptom: every INSERT into public.homework_submissions fails with
--   42702  column reference "teacher_id" is ambiguous
-- because the existing trigger function uses a PL/pgSQL variable named
-- teacher_id while querying homework.teacher_id.
--
-- This migration removes the non-internal triggers on the table and installs a
-- single, unambiguous notification trigger.

BEGIN;

DO $$
DECLARE
  trigger_row record;
BEGIN
  FOR trigger_row IN
    SELECT tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname = 'homework_submissions'
       AND n.nspname = 'public'
       AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.homework_submissions', trigger_row.tgname);
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.notify_homework_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher uuid;
  v_homework_title text;
  v_homework_tenant uuid;
BEGIN
  SELECT h.teacher_id, h.title, h.tenant_id
    INTO v_teacher, v_homework_title, v_homework_tenant
    FROM public.homework h
   WHERE h.id = NEW.homework_id;

  IF v_teacher IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, tenant_id, title, body, type, is_read, created_at)
    VALUES (
      v_teacher,
      COALESCE(NEW.tenant_id, v_homework_tenant),
      'New assignment submission',
      'A student submitted work for ' || COALESCE(v_homework_title, 'an assignment') || '.',
      'academic',
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER homework_submissions_notify_teacher
AFTER INSERT ON public.homework_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_homework_submission();

COMMIT;
