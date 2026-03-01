-- ============================================================
-- Migration 003: Fix RLS Policies to use auth_user_id
-- ============================================================

-- Função auxiliar para obter o ID da empresa do usuário logado
CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Update Policies to use the new function instead of JWT claim

-- Clientes
DROP POLICY IF EXISTS "empresa_isolation" ON clientes;
CREATE POLICY "empresa_isolation" ON clientes
  USING (empresa_id = get_my_empresa_id());

-- Equipamentos
DROP POLICY IF EXISTS "empresa_isolation" ON equipamentos;
CREATE POLICY "empresa_isolation" ON equipamentos
  USING (empresa_id = get_my_empresa_id());

-- Ordens de Serviço
DROP POLICY IF EXISTS "empresa_isolation" ON ordens_servico;
CREATE POLICY "empresa_isolation" ON ordens_servico
  USING (empresa_id = get_my_empresa_id());

-- OS Timeline
DROP POLICY IF EXISTS "empresa_isolation" ON os_timeline;
CREATE POLICY "empresa_isolation" ON os_timeline
  USING (empresa_id = get_my_empresa_id());

-- Produtos
DROP POLICY IF EXISTS "empresa_isolation" ON produtos;
CREATE POLICY "empresa_isolation" ON produtos
  USING (empresa_id = get_my_empresa_id());

-- Vendas
DROP POLICY IF EXISTS "empresa_isolation" ON vendas;
CREATE POLICY "empresa_isolation" ON vendas
  USING (empresa_id = get_my_empresa_id());

-- Financeiro
DROP POLICY IF EXISTS "empresa_isolation" ON financeiro;
CREATE POLICY "empresa_isolation" ON financeiro
  USING (empresa_id = get_my_empresa_id());

-- Tecnicos
DROP POLICY IF EXISTS "empresa_isolation" ON tecnicos;
CREATE POLICY "empresa_isolation" ON tecnicos
  USING (empresa_id = get_my_empresa_id());

-- Audit Logs
DROP POLICY IF EXISTS "empresa_isolation" ON audit_logs;
CREATE POLICY "empresa_isolation" ON audit_logs
  USING (empresa_id = get_my_empresa_id());

-- Para a tabela USUARIOS, permitimos ver usuários da mesma empresa
DROP POLICY IF EXISTS "empresa_isolation" ON usuarios;
CREATE POLICY "empresa_isolation" ON usuarios
  USING (empresa_id = get_my_empresa_id());
