CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid,
  qr_content text,
  type text,
  created_at timestamptz DEFAULT now(),
  note text,
  manual boolean DEFAULT false
);

GRANT SELECT ON public.attendance_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO authenticated;