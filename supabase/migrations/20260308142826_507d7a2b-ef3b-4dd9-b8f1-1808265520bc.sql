
-- Tighten activity_logs insert policy to require user_id match
DROP POLICY "Authenticated users can create logs" ON public.activity_logs;

CREATE POLICY "Users can create own activity logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
