-- ============================================================
-- Migration 093: Fix Empresa Deletion RLS & Cascade
-- ============================================================

-- 1. Create DELETE policy for empresas
-- Allows owners (admins) to delete their own company
DROP POLICY IF EXISTS "owner_can_delete_empresa" ON public.empresas;
CREATE POLICY "owner_can_delete_empresa" ON public.empresas
  FOR DELETE
  USING (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid() 
        AND papel = 'admin'
    )
  );

-- 2. Ensure ON DELETE CASCADE for critical related tables
-- If users are managed in 'usuarios', ensure they are wiped when company is deleted
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_empresa_id_fkey,
  ADD CONSTRAINT usuarios_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE CASCADE;

-- 3. Ensure ON DELETE CASCADE for configurations
ALTER TABLE public.configuracoes
  DROP CONSTRAINT IF EXISTS configuracoes_empresa_id_fkey,
  ADD CONSTRAINT configuracoes_empresa_id_fkey
    FOREIGN KEY (empresa_id)
    REFERENCES public.empresas(id)
    ON DELETE CASCADE;

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
