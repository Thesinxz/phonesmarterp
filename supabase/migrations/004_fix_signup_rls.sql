-- ============================================================
-- Migration 004: Permite Cadastro Inicial (Versão Dev-Permissive)
-- ============================================================

-- 1. Permitir que qualquer um insira uma empresa (necessário para o cadastro inicial)
DROP POLICY IF EXISTS "Permitir insert para novos usuarios" ON empresas;
CREATE POLICY "Permitir insert para novos usuarios" ON empresas
  FOR INSERT 
  WITH CHECK (true);

-- 2. Permitir que usuários vejam sua própria empresa via função auxiliar
DROP POLICY IF EXISTS "empresa_isolation" ON empresas;
CREATE POLICY "empresa_isolation" ON empresas
  FOR SELECT
  USING (id = get_my_empresa_id());

-- 3. Permitir que o registro inicial de usuário seja criado (vínculo com auth_user_id)
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT
  WITH CHECK (true);

-- 4. Ajuste na política de SELECT de usuários para evitar recursão infinita
DROP POLICY IF EXISTS "empresa_isolation" ON usuarios;
CREATE POLICY "empresa_isolation" ON usuarios
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT u.empresa_id 
      FROM public.usuarios u 
      WHERE u.auth_user_id = auth.uid()
    )
  );
