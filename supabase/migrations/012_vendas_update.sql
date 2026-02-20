-- ============================================================
-- Migration 012: Atualização tabela Vendas (Tipo e Status)
-- ============================================================

-- 1. Adicionar colunas faltantes para suportar fluxo de Pedidos e PDV
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'pdv' CHECK (tipo IN ('pdv', 'pedido')),
ADD COLUMN IF NOT EXISTS status_pedido TEXT DEFAULT 'entregue',
ADD COLUMN IF NOT EXISTS codigo_pedido SERIAL; -- Opcional, para ter um número curto de pedido

-- 2. Índices para performance nas queries frequentes
CREATE INDEX IF NOT EXISTS idx_vendas_tipo ON vendas(tipo);
CREATE INDEX IF NOT EXISTS idx_vendas_status_pedido ON vendas(status_pedido);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);

-- 3. Atualizar registros antigos (se houver) para garantir consistência
UPDATE vendas SET tipo = 'pdv', status_pedido = 'entregue' WHERE tipo IS NULL;
