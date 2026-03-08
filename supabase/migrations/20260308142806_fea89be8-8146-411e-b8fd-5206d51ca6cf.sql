
-- =============================================
-- NURSES CONNECT DATABASE SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'head_nurse', 'nurse');
CREATE TYPE public.shift_type AS ENUM ('morning', 'evening', 'night');
CREATE TYPE public.swap_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.workload_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');

-- 2. HELPER FUNCTION: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. SECURITY DEFINER: role check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. DIVISIONS TABLE (4 nurse divisions)
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Divisions are viewable by authenticated users" ON public.divisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and head nurses can manage divisions" ON public.divisions
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

-- 6. DEPARTMENTS TABLE
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Departments are viewable by authenticated users" ON public.departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and head nurses can manage departments" ON public.departments
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

-- 7. NURSES TABLE (profiles for nurse users)
CREATE TABLE public.nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 120),
  phone TEXT NOT NULL UNIQUE,
  gender gender_type,
  division_id UUID REFERENCES public.divisions(id),
  current_department_id UUID REFERENCES public.departments(id),
  previous_departments UUID[] DEFAULT '{}',
  exam_score_percentage NUMERIC(5,2) CHECK (exam_score_percentage >= 0 AND exam_score_percentage <= 100),
  experience_years INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nurses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view own profile" ON public.nurses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Nurses can update own profile" ON public.nurses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Head nurses and admins can view all nurses" ON public.nurses
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE POLICY "Head nurses and admins can manage nurses" ON public.nurses
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE TRIGGER update_nurses_updated_at
  BEFORE UPDATE ON public.nurses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. HEAD NURSES TABLE
CREATE TABLE public.head_nurses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.head_nurses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head nurses can view own profile" ON public.head_nurses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage head nurses" ON public.head_nurses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_head_nurses_updated_at
  BEFORE UPDATE ON public.head_nurses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. SCHEDULES TABLE (weekly duty assignments)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID REFERENCES public.nurses(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  shift_type shift_type NOT NULL,
  duty_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nurse_id, duty_date)
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view own schedules" ON public.schedules
  FOR SELECT TO authenticated USING (
    nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid())
  );

CREATE POLICY "Head nurses and admins can view all schedules" ON public.schedules
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE POLICY "Head nurses and admins can manage schedules" ON public.schedules
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_schedules_nurse ON public.schedules(nurse_id);
CREATE INDEX idx_schedules_date ON public.schedules(duty_date);
CREATE INDEX idx_schedules_week ON public.schedules(year, week_number);

-- 10. SHIFT SWAP REQUESTS TABLE
CREATE TABLE public.shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_nurse_id UUID REFERENCES public.nurses(id) ON DELETE CASCADE NOT NULL,
  target_nurse_id UUID REFERENCES public.nurses(id) ON DELETE CASCADE NOT NULL,
  requester_schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  target_schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE NOT NULL,
  status swap_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view own swap requests" ON public.shift_swap_requests
  FOR SELECT TO authenticated USING (
    requester_nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid())
    OR target_nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid())
  );

CREATE POLICY "Nurses can create swap requests" ON public.shift_swap_requests
  FOR INSERT TO authenticated WITH CHECK (
    requester_nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid())
  );

CREATE POLICY "Head nurses and admins can manage swap requests" ON public.shift_swap_requests
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON public.shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  notification_type TEXT NOT NULL DEFAULT 'general',
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System and admins can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- 12. PERFORMANCE EVALUATIONS TABLE
CREATE TABLE public.performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID REFERENCES public.nurses(id) ON DELETE CASCADE NOT NULL,
  evaluated_by UUID REFERENCES auth.users(id) NOT NULL,
  attendance_score NUMERIC(5,2) CHECK (attendance_score >= 0 AND attendance_score <= 100),
  reliability_score NUMERIC(5,2) CHECK (reliability_score >= 0 AND reliability_score <= 100),
  quality_score NUMERIC(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
  overall_score NUMERIC(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  remarks TEXT,
  evaluation_period TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view own evaluations" ON public.performance_evaluations
  FOR SELECT TO authenticated USING (
    nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid())
  );

CREATE POLICY "Head nurses and admins can manage evaluations" ON public.performance_evaluations
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON public.performance_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. NURSE REMOVALS TABLE (records removal reasons)
CREATE TABLE public.nurse_removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL,
  nurse_name TEXT NOT NULL,
  removed_by UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT NOT NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nurse_removals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and head nurses can view removals" ON public.nurse_removals
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

CREATE POLICY "Head nurses and admins can insert removals" ON public.nurse_removals
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'head_nurse')
  );

-- 14. ACTIVITY LOGS TABLE
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Head nurses can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'head_nurse'));

CREATE POLICY "Authenticated users can create logs" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- 15. FUNCTION: Check if phone exists (for nurse registration)
CREATE OR REPLACE FUNCTION public.check_nurse_phone_exists(phone_number TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.nurses
    WHERE phone = phone_number AND user_id IS NULL
  )
$$;

-- 16. FUNCTION: Get nurse workload level
CREATE OR REPLACE FUNCTION public.get_nurse_workload(nurse_uuid UUID)
RETURNS workload_level
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shift_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO shift_count
  FROM public.schedules
  WHERE nurse_id = nurse_uuid
    AND duty_date >= CURRENT_DATE
    AND duty_date < CURRENT_DATE + INTERVAL '7 days';

  IF shift_count >= 5 THEN
    RETURN 'high';
  ELSIF shift_count >= 3 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$;

-- 17. SEED: Divisions
INSERT INTO public.divisions (name, description) VALUES
  ('Division I', 'Senior nurses with 10+ years experience'),
  ('Division II', 'Experienced nurses with 5-10 years experience'),
  ('Division III', 'Mid-level nurses with 2-5 years experience'),
  ('Division IV', 'Junior nurses with under 2 years experience');

-- 18. SEED: Departments
INSERT INTO public.departments (name, description) VALUES
  ('ICU', 'Intensive Care Unit'),
  ('Emergency', 'Emergency Department'),
  ('Pediatrics', 'Pediatrics Department'),
  ('General Ward', 'General Ward'),
  ('Operation Theater', 'Operation Theater / Surgery'),
  ('Outpatient', 'Outpatient Department');
