-- ============================================================
-- Migration 065: Fix Equipe Management RLS (Update/Delete)
-- ============================================================
-- Esta migration corrige as políticas de RLS para permitir que
-- Administradores e Gerentes desativem ou excluam membros da equipe.

-- 1. Helper function para verificar se o usuário atual é gestor da empresa
CREATE OR REPLACE FUNCTION public.is_gestor_da_empresa(p_empresa_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuario_vinculos_empresa 
    WHERE auth_user_id = auth.uid() 
      AND empresa_id = p_empresa_id
      AND papel IN ('admin', 'gerente')
  );
END;
$$;

-- 2. Atualizar políticas para a tabela 'usuarios'
-- SELECT: Já deve estar ok (usuarios_select), mas vamos reforçar se necessário.
-- DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios; -- (Manter a atual)

-- UPDATE: Permitir se for o próprio usuário OU se for um gestor daquela empresa
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (
    auth_user_id = auth.uid() -- O próprio
    OR
    public.is_gestor_da_empresa(empresa_id) -- Gestor da empresa
  );

-- DELETE: Permitir se for um gestor daquela empresa (O próprio não pode excluir a si mesmo pela UI geralmente)
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
CREATE POLICY "usuarios_delete" ON public.usuarios
  FOR DELETE USING (
    public.is_gestor_da_empresa(empresa_id)
  );

-- 3. Atualizar políticas para a tabela 'usuario_vinculos_empresa'
-- Para que ao excluir um usuario, o vinculo possa ser removido (Cascata ou manual)
DROP POLICY IF EXISTS "vinculos_delete" ON public.usuario_vinculos_empresa;
CREATE POLICY "vinculos_delete" ON public.usuario_vinculos_empresa
  FOR DELETE USING (
    public.is_gestor_da_empresa(empresa_id)
  );

DROP POLICY IF EXISTS "vinculos_update" ON public.usuario_vinculos_empresa;
CREATE POLICY "vinculos_update" ON public.usuario_vinculos_empresa
  FOR UPDATE USING (
    public.is_gestor_da_empresa(empresa_id)
  );

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
