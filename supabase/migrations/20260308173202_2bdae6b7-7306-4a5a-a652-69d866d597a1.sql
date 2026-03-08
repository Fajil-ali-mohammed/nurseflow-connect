
-- Table to track sent reminders so we don't duplicate
CREATE TABLE public.duty_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- '5h', '3h', '1h'
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, reminder_type)
);

ALTER TABLE public.duty_reminders ENABLE ROW LEVEL SECURITY;

-- Only admins/head_nurses and the system (service role) need access
CREATE POLICY "Admins and head nurses can view reminders"
  ON public.duty_reminders FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
