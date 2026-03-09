
CREATE TABLE public.nurse_leaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nurse_id UUID NOT NULL REFERENCES public.nurses(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  reason TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nurse_id, leave_date)
);

ALTER TABLE public.nurse_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and head nurses can manage leaves"
  ON public.nurse_leaves FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'head_nurse'::app_role));

CREATE POLICY "Nurses can view own leaves"
  ON public.nurse_leaves FOR SELECT
  TO authenticated
  USING (nurse_id IN (SELECT id FROM public.nurses WHERE user_id = auth.uid()));
