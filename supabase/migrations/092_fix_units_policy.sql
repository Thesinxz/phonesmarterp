-- Migration 092: Fix units policy for multi-company access
-- Remove the restrictive policy
DROP POLICY IF EXISTS "units_isolation" ON public.units;

-- Create a more permissive policy that allows viewing units if the user has a link to the company
CREATE POLICY "units_multicompany_access" ON public.units
FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Also allow admins to update their own units
CREATE POLICY "units_admin_update" ON public.units
FOR UPDATE
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() AND papel = 'admin'
  )
);
