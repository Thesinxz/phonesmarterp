-- ============================================================
-- Migration 037: Final Performance Lints (auth_rls_initplan & redundancy)
-- ============================================================

-- 1. CORREÇÃO EM `usuarios` (auth_rls_initplan)
-- A política de INSERT ainda usava auth.uid() em vez de (SELECT auth.uid())
-- A política de UPDATE usava auth.jwt() ->> 'email', que deve ser isolado como ((SELECT auth.jwt()) ->> 'email')

DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios
  FOR UPDATE
  USING (
    auth_user_id = (SELECT auth.uid()) 
    OR 
    email = ((SELECT auth.jwt()) ->> 'email')
  );

-- 2. CORREÇÃO EM `usuario_vinculos_empresa` (auth_rls_initplan & multiple_permissive_policies)
-- Removendo as políticas concorrentes e consolidando em uma única política de performance.

DROP POLICY IF EXISTS "Usuários podem ver seus próprios vínculos" ON public.usuario_vinculos_empresa;
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos da empresa" ON public.usuario_vinculos_empresa;

CREATE POLICY "usuario_vinculos_empresa_performance_policy" ON public.usuario_vinculos_empresa FOR ALL
USING (
  usuario_id = (SELECT auth.uid()) 
  OR 
  empresa_id = (SELECT public.get_my_empresa_id())
)
WITH CHECK (
  usuario_id = (SELECT auth.uid()) 
  OR 
  empresa_id = (SELECT public.get_my_empresa_id())
);

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
