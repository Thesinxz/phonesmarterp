-- ============================================================
-- Migration 041: Radical RLS Cleanup & Team Stabilization
-- ============================================================

-- Essa migration "passa a régua" em todas as políticas anteriores para evitar
-- recursão (congelamento) do banco durante convites.

-- 1. LIMPEZA RADICAL DE POLÍTICAS (usuarios)
DROP POLICY IF EXISTS "empresa_isolation" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuario_ver_proprio_registro" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
DROP POLICY IF EXISTS "empresa_isolation" ON usuarios;
DROP POLICY IF EXISTS "usuario_ver_proprio_registro" ON usuarios;

-- 2. LIMPEZA RADICAL DE POLÍTICAS (usuario_vinculos_empresa)
DROP POLICY IF EXISTS "usuario_vinculos_empresa_performance_policy" ON public.usuario_vinculos_empresa;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios vínculos" ON public.usuario_vinculos_empresa;
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos da empresa" ON public.usuario_vinculos_empresa;
DROP POLICY IF EXISTS "usuario_vinculos_empresa_performance_policy" ON usuario_vinculos_empresa;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios vínculos" ON usuario_vinculos_empresa;
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos da empresa" ON usuario_vinculos_empresa;

-- 3. RECRIAR FUNÇÃO get_my_empresa_id (SECURITY DEFINER)
-- Indispensável para quebrar recursão infinita.
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$;

-- 4. POLÍTICAS LIMPAS E ÚNICAS (usuarios)
-- SELECT: Ver colegas da mesma empresa ou a si mesmo
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT USING (
    (SELECT auth.uid()) = auth_user_id 
    OR 
    empresa_id = public.get_my_empresa_id()
  );

-- INSERT: Apenas autenticados (Convites são criados via RPC SECURITY DEFINER)
CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- UPDATE: Apenas o dono
CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING ((SELECT auth.uid()) = auth_user_id);

-- 5. POLÍTICAS LIMPAS E ÚNICAS (usuario_vinculos_empresa)
CREATE POLICY "vinculos_select" ON public.usuario_vinculos_empresa
  FOR SELECT USING (
    empresa_id = public.get_my_empresa_id()
    OR
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = (SELECT auth.uid()))
  );

-- 6. RPC vincular_usuario_equipe (ATÔMICO)
CREATE OR REPLACE FUNCTION public.vincular_usuario_equipe(
  p_id_empresa UUID,
  p_email TEXT,
  p_nome TEXT,
  p_papel TEXT,
  p_permissoes JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- 1. Buscar usuário existente por email
  SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = p_email LIMIT 1;

  -- 2. Se não existir, criar registro base
  IF v_usuario_id IS NULL THEN
    INSERT INTO public.usuarios (empresa_id, email, nome, papel, permissoes_json, ativo)
    VALUES (p_id_empresa, p_email, p_nome, p_papel, COALESCE(p_permissoes, '{}'::jsonb), true)
    RETURNING id INTO v_usuario_id;
  END IF;

  -- 3. Criar o vínculo se não existir
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_vinculos_empresa 
    WHERE usuario_id = v_usuario_id AND empresa_id = p_id_empresa
  ) THEN
    INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
    VALUES (v_usuario_id, p_id_empresa, p_papel, COALESCE(p_permissoes, '{}'::jsonb));
  END IF;

  RETURN v_usuario_id;
END;
$$;

-- 7. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
