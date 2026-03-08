
-- Fix activity_logs policies (all were RESTRICTIVE)
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Head nurses can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can create own activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Head nurses can view activity logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Users can create own activity logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix departments policies
DROP POLICY IF EXISTS "Admins and head nurses can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;

CREATE POLICY "Departments are viewable by authenticated users"
ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and head nurses can manage departments"
ON public.departments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix divisions policies
DROP POLICY IF EXISTS "Admins and head nurses can manage divisions" ON public.divisions;
DROP POLICY IF EXISTS "Divisions are viewable by authenticated users" ON public.divisions;

CREATE POLICY "Divisions are viewable by authenticated users"
ON public.divisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and head nurses can manage divisions"
ON public.divisions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix head_nurses policies
DROP POLICY IF EXISTS "Admins can manage head nurses" ON public.head_nurses;
DROP POLICY IF EXISTS "Head nurses can view own profile" ON public.head_nurses;

CREATE POLICY "Head nurses can view own profile"
ON public.head_nurses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage head nurses"
ON public.head_nurses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix notifications policies
DROP POLICY IF EXISTS "System and admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System and admins can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix nurse_removals policies
DROP POLICY IF EXISTS "Admins and head nurses can view removals" ON public.nurse_removals;
DROP POLICY IF EXISTS "Head nurses and admins can insert removals" ON public.nurse_removals;

CREATE POLICY "Admins and head nurses can view removals"
ON public.nurse_removals FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Head nurses and admins can insert removals"
ON public.nurse_removals FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix nurses policies
DROP POLICY IF EXISTS "Head nurses and admins can manage nurses" ON public.nurses;
DROP POLICY IF EXISTS "Head nurses and admins can view all nurses" ON public.nurses;
DROP POLICY IF EXISTS "Nurses can update own profile" ON public.nurses;
DROP POLICY IF EXISTS "Nurses can view own profile" ON public.nurses;

CREATE POLICY "Nurses can view own profile"
ON public.nurses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Head nurses and admins can view all nurses"
ON public.nurses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Head nurses and admins can manage nurses"
ON public.nurses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Nurses can update own profile"
ON public.nurses FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Fix performance_evaluations policies
DROP POLICY IF EXISTS "Head nurses and admins can manage evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Nurses can view own evaluations" ON public.performance_evaluations;

CREATE POLICY "Nurses can view own evaluations"
ON public.performance_evaluations FOR SELECT TO authenticated
USING (nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()));

CREATE POLICY "Head nurses and admins can manage evaluations"
ON public.performance_evaluations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix schedules policies
DROP POLICY IF EXISTS "Head nurses and admins can manage schedules" ON public.schedules;
DROP POLICY IF EXISTS "Head nurses and admins can view all schedules" ON public.schedules;
DROP POLICY IF EXISTS "Nurses can view own schedules" ON public.schedules;

CREATE POLICY "Nurses can view own schedules"
ON public.schedules FOR SELECT TO authenticated
USING (nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()));

CREATE POLICY "Head nurses and admins can view all schedules"
ON public.schedules FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Head nurses and admins can manage schedules"
ON public.schedules FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

-- Fix shift_swap_requests policies
DROP POLICY IF EXISTS "Head nurses and admins can manage swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Nurses can create swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Nurses can view own swap requests" ON public.shift_swap_requests;

CREATE POLICY "Nurses can view own swap requests"
ON public.shift_swap_requests FOR SELECT TO authenticated
USING (requester_nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()) OR target_nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()));

CREATE POLICY "Nurses can create swap requests"
ON public.shift_swap_requests FOR INSERT TO authenticated
WITH CHECK (requester_nurse_id IN (SELECT id FROM nurses WHERE user_id = auth.uid()));

CREATE POLICY "Head nurses and admins can manage swap requests"
ON public.shift_swap_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));
