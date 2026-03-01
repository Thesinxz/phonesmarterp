-- ============================================================
-- Migration 014: Fix configuracoes INSERT/UPDATE RLS policy
-- ============================================================
-- Problema: A policy "config_modify_policy" anterior usava FOR ALL
-- com USING mas sem WITH CHECK, causando timeout/deadlock em INSERTs.
-- A subquery EXISTS em usuarios + get_my_empresa_id() também pode
-- causar recursão dependendo do estado das policies de usuarios.
--
-- Solução: Recriar as policies separadamente para SELECT, INSERT, UPDATE, DELETE
-- usando apenas get_my_empresa_id() (que é SECURITY DEFINER e não recursiva).

-- 1. Remover policies antigas
DROP POLICY IF EXISTS "config_modify_policy" ON configuracoes;
DROP POLICY IF EXISTS "config_select_policy" ON configuracoes;
DROP POLICY IF EXISTS "config_insert_policy" ON configuracoes;
DROP POLICY IF EXISTS "config_update_policy" ON configuracoes;
DROP POLICY IF EXISTS "config_delete_policy" ON configuracoes;

-- 2. SELECT: qualquer membro da empresa pode ler configs não-secretas;
--    admins/gerentes podem ler tudo
CREATE POLICY "config_select_policy" ON configuracoes
  FOR SELECT
  USING (
    empresa_id = get_my_empresa_id()
  );

-- 3. INSERT: membros da empresa podem criar configs
CREATE POLICY "config_insert_policy" ON configuracoes
  FOR INSERT
  WITH CHECK (
    empresa_id = get_my_empresa_id()
  );

-- 4. UPDATE: membros da empresa podem atualizar configs
CREATE POLICY "config_update_policy" ON configuracoes
  FOR UPDATE
  USING (
    empresa_id = get_my_empresa_id()
  )
  WITH CHECK (
    empresa_id = get_my_empresa_id()
  );

-- 5. DELETE: membros da empresa podem deletar configs
CREATE POLICY "config_delete_policy" ON configuracoes
  FOR DELETE
  USING (
    empresa_id = get_my_empresa_id()
  );
