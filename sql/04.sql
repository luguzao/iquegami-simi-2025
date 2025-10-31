-- ===========================
-- Events + Attendance Mapping
-- Full, idempotent script for Supabase/Postgres
-- - Creates events/registrations/attendance tables
-- - Adds optional event_id to attendance_logs
-- - Adds trigger/function to map attendance_logs -> event_attendance
-- - Backfill using a temp table (safe for repeated runs)
-- ===========================

-- 1) Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Domain tables
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'registered',
  UNIQUE (event_id, employee_id)
);

-- One record per (event, employee). Remove UNIQUE if you need multiple attendance rows.
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  checkin_at timestamptz,
  checkout_at timestamptz,
  manual boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, employee_id)
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON public.event_attendance (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_employee ON public.event_attendance (employee_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON public.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_employee ON public.event_registrations (employee_id);

-- 3) Add optional event_id to attendance_logs so your app can explicitly attach logs to events.
--    This avoids ambiguity when the frontend/server knows the event being processed.
ALTER TABLE IF EXISTS public.attendance_logs
  ADD COLUMN IF NOT EXISTS event_id uuid;

-- (Optional) If you want a FK constraint, uncomment and ensure every attendance_log.event_id refers to events:
-- ALTER TABLE public.attendance_logs
--   ADD CONSTRAINT fk_attendance_logs_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- 4) Function to map attendance_logs -> event_attendance
CREATE OR REPLACE FUNCTION public.upsert_event_attendance_from_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee uuid := NULL;
  v_type text := NULL;
  v_ts timestamptz := NULL;
  v_event_id uuid := NULL;
BEGIN
  -- Read expected fields from the inserted log
  v_employee := NEW.employee_id;
  v_type := lower(coalesce(NEW.type::text, ''));
  v_ts := coalesce(NEW.created_at, now());

  -- Prefer explicit event_id coming in the attendance_logs record
  IF NEW.event_id IS NOT NULL THEN
    v_event_id := NEW.event_id;
  END IF;

  -- If none provided, try to find an event that contains the timestamp
  IF v_event_id IS NULL THEN
    SELECT id INTO v_event_id
    FROM public.events
    WHERE
      (start_date IS NULL OR start_date <= v_ts)
      AND (end_date IS NULL OR end_date >= v_ts)
    ORDER BY start_date NULLS LAST
    LIMIT 1;
  END IF;

  -- Heuristic fallback: event with start within +/- 2 hours (choose nearest start)
  IF v_event_id IS NULL THEN
    SELECT id INTO v_event_id
    FROM public.events
    WHERE start_date IS NOT NULL
      AND v_ts BETWEEN (start_date - interval '2 hours') AND (COALESCE(end_date,start_date) + interval '2 hours')
    ORDER BY abs(extract(epoch FROM (start_date - v_ts)))
    LIMIT 1;
  END IF;

  -- If still none, do nothing
  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert into event_attendance depending on type
  IF v_type = 'checkin' THEN
    INSERT INTO public.event_attendance (event_id, employee_id, checkin_at, manual, note, created_at)
    VALUES (v_event_id, v_employee, v_ts, COALESCE(NEW.manual, false), COALESCE(NEW.note::text, NULL), now())
    ON CONFLICT (event_id, employee_id) DO UPDATE
    SET
      -- keep earliest checkin if already exists (or update if newer according to policy you prefer)
      checkin_at = LEAST(COALESCE(public.event_attendance.checkin_at, EXCLUDED.checkin_at), EXCLUDED.checkin_at),
      manual = public.event_attendance.manual OR EXCLUDED.manual,
      note = COALESCE(public.event_attendance.note, EXCLUDED.note);
  ELSIF v_type = 'checkout' THEN
    INSERT INTO public.event_attendance (event_id, employee_id, checkout_at, manual, note, created_at)
    VALUES (v_event_id, v_employee, v_ts, COALESCE(NEW.manual, false), COALESCE(NEW.note::text, NULL), now())
    ON CONFLICT (event_id, employee_id) DO UPDATE
    SET
      -- keep latest checkout
      checkout_at = GREATEST(COALESCE(public.event_attendance.checkout_at, EXCLUDED.checkout_at), EXCLUDED.checkout_at),
      manual = public.event_attendance.manual OR EXCLUDED.manual,
      note = COALESCE(public.event_attendance.note, EXCLUDED.note);
  ELSE
    -- unknown type: ignore mapping to events
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Trigger to run the function after insert on attendance_logs
DROP TRIGGER IF EXISTS trg_upsert_event_attendance_on_logs ON public.attendance_logs;

CREATE TRIGGER trg_upsert_event_attendance_on_logs
AFTER INSERT ON public.attendance_logs
FOR EACH ROW
EXECUTE FUNCTION public.upsert_event_attendance_from_log();

-- 6) Backfill: create a TEMP table and populate event_attendance from existing logs
--    Run in staging first. You can filter attendance_logs by period if large.
BEGIN;

-- Create temp mapping table: each log mapped to at most one candidate event (heuristic)
CREATE TEMP TABLE tmp_event_log_map AS
SELECT
  l.id AS log_id,
  l.employee_id,
  lower(coalesce(l.type::text,'')) AS type,
  l.created_at AS ts,
  e.id AS event_id
FROM public.attendance_logs l
LEFT JOIN LATERAL (
  SELECT id, start_date
  FROM public.events
  WHERE
    (
      (start_date IS NULL OR start_date <= l.created_at)
      AND (end_date IS NULL OR end_date >= l.created_at)
    )
    OR (
      start_date IS NOT NULL
      AND l.created_at BETWEEN (start_date - interval '2 hours') AND (COALESCE(end_date, start_date) + interval '2 hours')
    )
  ORDER BY abs(extract(epoch FROM (coalesce(start_date, l.created_at) - l.created_at)))
  LIMIT 1
) e ON true
WHERE l.employee_id IS NOT NULL;

-- Insert/update checkins (earliest checkin)
INSERT INTO public.event_attendance (event_id, employee_id, checkin_at, manual, note, created_at)
SELECT
  m.event_id,
  m.employee_id,
  MIN(m.ts) AS checkin_at,
  false AS manual,
  NULL::text AS note,
  now() AS created_at
FROM tmp_event_log_map m
WHERE m.type = 'checkin' AND m.event_id IS NOT NULL
GROUP BY m.event_id, m.employee_id
ON CONFLICT (event_id, employee_id) DO UPDATE
SET checkin_at = LEAST(COALESCE(public.event_attendance.checkin_at, EXCLUDED.checkin_at), EXCLUDED.checkin_at);

-- Insert/update checkouts (latest checkout)
INSERT INTO public.event_attendance (event_id, employee_id, checkout_at, manual, note, created_at)
SELECT
  m.event_id,
  m.employee_id,
  MAX(m.ts) AS checkout_at,
  false AS manual,
  NULL::text AS note,
  now() AS created_at
FROM tmp_event_log_map m
WHERE m.type = 'checkout' AND m.event_id IS NOT NULL
GROUP BY m.event_id, m.employee_id
ON CONFLICT (event_id, employee_id) DO UPDATE
SET checkout_at = GREATEST(COALESCE(public.event_attendance.checkout_at, EXCLUDED.checkout_at), EXCLUDED.checkout_at);

COMMIT;

-- 7) Reporting view
CREATE OR REPLACE VIEW public.event_attendance_report AS
SELECT
  e.id AS event_id,
  e.name AS event_name,
  e.start_date,
  e.end_date,
  ea.employee_id,
  emp.name AS employee_name,
  ea.checkin_at,
  ea.checkout_at,
  (ea.checkin_at IS NOT NULL) AS present,
  (ea.checkin_at IS NOT NULL AND ea.checkout_at IS NULL) AS checkin_no_checkout,
  (ea.checkout_at - ea.checkin_at) AS session_duration
FROM public.event_attendance ea
LEFT JOIN public.events e ON e.id = ea.event_id
LEFT JOIN public.employees emp ON emp.id = ea.employee_id;

-- ===========================
-- Examples that avoid literal "<UUID>" placeholders:
-- Use CTE + RETURNING or SELECT to obtain IDs and reuse them atomically.
-- ===========================

-- Example A: Create an event and register employees by CPF (no manual UUID copy)
-- Replace the CPF values by actual CPFs from your employees table.
WITH new_event AS (
  INSERT INTO public.events (name, description, location, start_date, end_date)
  VALUES ('Treinamento Segurança 2025', 'Treinamento anual', 'Auditório A', '2025-11-10 09:00:00+00', '2025-11-10 12:00:00+00')
  RETURNING id
), to_register AS (
  SELECT id AS employee_id
  FROM public.employees
  WHERE cpf IN ('12345678900', '98765432100') -- <- substitua por CPFs reais
)
INSERT INTO public.event_registrations (event_id, employee_id)
SELECT ne.id, t.employee_id
FROM new_event ne
CROSS JOIN to_register t
ON CONFLICT (event_id, employee_id) DO NOTHING;

-- Example B: Insert an attendance_log explicitly associating the event (no placeholder)
-- This uses gen_random_uuid() for log id and looks up employee by CPF.
WITH the_event AS (
  SELECT id FROM public.events WHERE name = 'Treinamento Segurança 2025' LIMIT 1
), the_employee AS (
  SELECT id FROM public.employees WHERE cpf = '12345678900' LIMIT 1
)
INSERT INTO public.attendance_logs (id, employee_id, type, created_at, qr_content, manual, note, event_id)
SELECT gen_random_uuid(), te.id, 'checkin', now(), null, false, null, ev.id
FROM the_employee te
CROSS JOIN the_event ev;

-- Example C: Mark checkout by inserting another attendance_log (mapping trigger will handle attendance table)
WITH the_event AS (
  SELECT id FROM public.events WHERE name = 'Treinamento Segurança 2025' LIMIT 1
), the_employee AS (
  SELECT id FROM public.employees WHERE cpf = '12345678900' LIMIT 1
)
INSERT INTO public.attendance_logs (id, employee_id, type, created_at, manual, note, event_id)
SELECT gen_random_uuid(), te.id, 'checkout', now(), false, null, ev.id
FROM the_employee te
CROSS JOIN the_event ev;

-- Example D: Directly create/update event_attendance (manual/administrative)
WITH the_event AS (SELECT id FROM public.events WHERE name = 'Treinamento Segurança 2025' LIMIT 1),
 the_employee AS (SELECT id FROM public.employees WHERE cpf = '12345678900' LIMIT 1)
INSERT INTO public.event_attendance (event_id, employee_id, checkin_at, manual, note)
SELECT ev.id, emp.id, now(), true, 'Registro manual'
FROM the_event ev CROSS JOIN the_employee emp
ON CONFLICT (event_id, employee_id) DO UPDATE
SET checkin_at = LEAST(COALESCE(public.event_attendance.checkin_at, EXCLUDED.checkin_at), EXCLUDED.checkin_at);

-- ===========================
-- Notes / Recommendations
-- 1) No use literal strings like '<EVENT_ID>' or '<EMPLOYEE_ID>' - Postgres will try to parse them as UUIDs.
-- 2) Prefer CTEs/RETURNING or SELECT lookups as shown above to pass ids between statements safely.
-- 3) Run backfill in batches if attendance_logs is large; filter by date ranges when creating tmp_event_log_map.
-- 4) Review Row Level Security (RLS) policies on Supabase: triggers execute with DB role privileges, but your services need INSERT rights for attendance_logs/events if creating them from the app.
-- 5) If you want server code to explicitly attach event_id when creating attendance_logs (recommended), I can update `src/app/api/auditoria/perform/route.ts` to accept and insert `eventId`.
-- ===========================