
-- Fix existing broken nurse data: assign role and link nurse record
INSERT INTO public.user_roles (user_id, role)
VALUES ('52a2d968-9a16-4dcb-85c2-fbd8c701dfb0', 'nurse')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.nurses
SET user_id = '52a2d968-9a16-4dcb-85c2-fbd8c701dfb0'
WHERE phone = '1234567890' AND user_id IS NULL;
