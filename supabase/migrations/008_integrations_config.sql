-- ============================================================
-- Migration 008: Tabela de Configurações e Integrações
-- ============================================================

-- 1. Tabela para armazenar configurações do sistema (Chave: Valor)
CREATE TABLE IF NOT EXISTS configuracoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave           TEXT NOT NULL,
  valor           JSONB NOT NULL,
  descricao       TEXT,
  is_secret       BOOLEAN DEFAULT false, -- Se true, não deve retornar para o frontend comum
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, chave)
);

-- 2. Habilitar RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
-- Apenas admins/gerentes podem VER configurações sensíveis
CREATE POLICY "config_select_policy" ON configuracoes
  FOR SELECT
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      NOT is_secret 
      OR 
      EXISTS (
        SELECT 1 FROM usuarios 
        WHERE auth_user_id = auth.uid() 
        AND papel IN ('admin', 'gerente')
      )
    )
  );

-- Apenas admins/gerentes podem EDITAR configurações
CREATE POLICY "config_modify_policy" ON configuracoes
  FOR ALL
  USING (
    empresa_id = get_my_empresa_id()
    AND EXISTS (
      SELECT 1 FROM usuarios 
      WHERE auth_user_id = auth.uid() 
      AND papel IN ('admin', 'gerente')
    )
  );

-- 4. Função auxiliar para upsert de configurações (facilita o front)
CREATE OR REPLACE FUNCTION upsert_config(
  p_chave TEXT,
  p_valor JSONB,
  p_descricao TEXT DEFAULT NULL,
  p_is_secret BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  v_empresa_id := get_my_empresa_id();
  
  INSERT INTO configuracoes (empresa_id, chave, valor, descricao, is_secret, updated_at)
  VALUES (v_empresa_id, p_chave, p_valor, p_descricao, p_is_secret, NOW())
  ON CONFLICT (empresa_id, chave)
  DO UPDATE SET
    valor = EXCLUDED.valor,
    descricao = COALESCE(EXCLUDED.descricao, configuracoes.descricao),
    is_secret = EXCLUDED.is_secret,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
