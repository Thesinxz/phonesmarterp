-- ============================================================
-- Migration 005: Resgate do Sistema (Fix Recursão e Signup)
-- ============================================================

-- 1. Remover polícias que causam recursão
DROP POLICY IF EXISTS "empresa_isolation" ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
DROP POLICY IF EXISTS "usuario_ver_proprio_registro" ON usuarios;

-- 2. Nova política de SELECT para USUARIOS (Evita recursão)
-- Permite que o usuário veja seu próprio registro e de outros da mesma empresa
CREATE POLICY "usuarios_select_policy" ON usuarios
  FOR SELECT
  USING (
    auth_user_id = auth.uid() 
    OR 
    empresa_id = (SELECT u.empresa_id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  );

-- 3. Nova política de INSERT para USUARIOS (Permite cadastro)
CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT
  WITH CHECK (true); -- Permitir criação durante o fluxo de cadastro

-- 4. Corrigir EMPRESAS para permitir criação e visualização
DROP POLICY IF EXISTS "Permitir insert para novos usuarios" ON empresas;
DROP POLICY IF EXISTS "empresa_isolation" ON empresas;

CREATE POLICY "empresas_insert_policy" ON empresas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "empresas_select_policy" ON empresas
  FOR SELECT
  USING (
    id IN (SELECT u.empresa_id FROM usuarios u WHERE u.auth_user_id = auth.uid())
  );

-- 5. Atualizar função get_my_empresa_id para ser mais segura
CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
