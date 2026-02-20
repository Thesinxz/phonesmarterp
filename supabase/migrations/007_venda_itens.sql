-- ============================================================
-- Migration 007: Itens de Venda e Ajustes PDV
-- ============================================================

-- 1. Tabela de Itens de Venda
CREATE TABLE IF NOT EXISTS venda_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id        UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id      UUID REFERENCES produtos(id),
  quantidade      INTEGER NOT NULL DEFAULT 1,
  preco_unitario_centavos INTEGER NOT NULL,
  total_centavos  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Isolamento
CREATE POLICY "empresa_isolation" ON venda_itens
  USING (empresa_id = get_my_empresa_id());

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_empresa ON venda_itens(empresa_id);

-- 5. Adicionar coluna de desconto em vendas (opcional mas útil)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS desconto_centavos INTEGER DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;
