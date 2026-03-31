
-- Allow admin to insert user_roles
CREATE POLICY "Admin can insert user_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admin to delete user_roles
CREATE POLICY "Admin can delete user_roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to delete system_lists
CREATE POLICY "Admin can delete system_lists" ON public.system_lists
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to update system_lists
CREATE POLICY "Admin can update system_lists" ON public.system_lists
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin to insert system_lists (if not covered by existing ALL policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_lists' AND policyname = 'Admin can insert system_lists') THEN
    CREATE POLICY "Admin can insert system_lists" ON public.system_lists
    FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
