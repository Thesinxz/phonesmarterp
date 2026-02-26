-- ============================================================
-- SUPER FIX: RESOLVER RECURSÃO RLS NA TABELA USUARIOS (MANUAL)
-- Copie e execute este código no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Garantir que a função de segurança existe e é SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID AS $$
BEGIN
  -- Security Definer ignora RLS para este SELECT interno
  RETURN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpar políticas antigas que podem estar causando recursão
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "empresa_isolation" ON public.usuarios;
DROP POLICY IF EXISTS "usuario_ver_proprio_registro" ON public.usuarios;

-- 3. Criar a nova política de SELECT usando a função segura
-- Isso evita que o SELECT no USING chame a si mesmo infinitamente
CREATE POLICY "usuarios_select_policy" ON public.usuarios
  FOR SELECT
  USING (
    auth_user_id = auth.uid() 
    OR 
    empresa_id = public.get_my_empresa_id()
  );

-- 4. Garantir que a política de INSERT seja permissiva para novos convites
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
CREATE POLICY "usuarios_insert_policy" ON public.usuarios
  FOR INSERT
  WITH CHECK (true);

-- 5. Garantir que a política de UPDATE permita que o usuário complete seu perfil
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios
  FOR UPDATE
  USING (
    auth_user_id = auth.uid() 
    OR 
    email = auth.jwt() ->> 'email'
  );
