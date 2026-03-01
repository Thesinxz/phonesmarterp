-- ============================================================
-- Migration 010: Fix RLS Recursion (Resolvendo Erro 500)
-- ============================================================

-- O erro 500 ocorria porque a política de SELECT da tabela 'usuarios'
-- realizava um SELECT na própria tabela 'usuarios' de forma direta,
-- causando uma recursão infinita no Postgres.

-- 1. Remover política recursiva
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;

-- 2. Recriar política usando a função SECURITY DEFINER 
-- Isso interrompe a recursão pois a função executa com privilégios de dono,
-- ignorando a checagem de RLS interna apenas para aquele sub-select.
CREATE POLICY "usuarios_select_policy" ON usuarios
  FOR SELECT
  USING (
    auth_user_id = auth.uid() 
    OR 
    empresa_id = get_my_empresa_id()
  );

-- 3. Aplicar o mesmo padrão para a tabela de configurações para garantir estabilidade
DROP POLICY IF EXISTS "config_select_policy" ON configuracoes;
CREATE POLICY "config_select_policy" ON configuracoes
  FOR SELECT
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      NOT is_secret 
      OR 
      EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE auth_user_id = auth.uid() 
        AND papel IN ('admin', 'gerente')
      )
    )
  );

-- 4. Garantir que a tabela de empresas também não tenha recursão
DROP POLICY IF EXISTS "empresas_select_policy" ON empresas;
CREATE POLICY "empresas_select_policy" ON empresas
  FOR SELECT
  USING (
    id = get_my_empresa_id()
  );
