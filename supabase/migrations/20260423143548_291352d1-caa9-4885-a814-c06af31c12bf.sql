-- 1) Add status_aprovacao column with default 'aprovado' (existing users stay approved)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_aprovacao text NOT NULL DEFAULT 'aprovado'
  CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado'));

-- 2) Add sobrenome column (nome already exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sobrenome text;

-- 3) Update handle_new_user trigger to read metadata from signup
-- and set status_aprovacao = 'pendente' for new self-service signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    nome,
    sobrenome,
    email,
    funcao,
    base,
    status_aprovacao
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'sobrenome',
    NEW.email,
    NEW.raw_user_meta_data->>'funcao',
    COALESCE(NEW.raw_user_meta_data->>'base', 'Gestão'),
    -- Self-service signups start as pendente; admin-created users stay aprovado via metadata flag
    COALESCE(NEW.raw_user_meta_data->>'status_aprovacao', 'pendente')
  );
  RETURN NEW;
END;
$function$;

-- 4) Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Index for fast filter by status in admin panel
CREATE INDEX IF NOT EXISTS idx_profiles_status_aprovacao ON public.profiles(status_aprovacao);