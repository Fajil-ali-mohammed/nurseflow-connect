
-- Create a trigger function to handle nurse post-signup setup
CREATE OR REPLACE FUNCTION public.handle_nurse_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  nurse_phone TEXT;
BEGIN
  -- Only process nurse signups (email ends with @nurse.local)
  IF NEW.email LIKE '%@nurse.local' THEN
    -- Extract phone from email
    nurse_phone := replace(NEW.email, '@nurse.local', '');
    
    -- Check if a nurse record exists with this phone
    IF EXISTS (SELECT 1 FROM public.nurses WHERE phone = nurse_phone AND user_id IS NULL) THEN
      -- Insert role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'nurse')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Link nurse record
      UPDATE public.nurses
      SET user_id = NEW.id,
          name = COALESCE(NEW.raw_user_meta_data->>'full_name', name)
      WHERE phone = nurse_phone AND user_id IS NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_nurse_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_nurse_signup();
