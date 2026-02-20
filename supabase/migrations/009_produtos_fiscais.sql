-- ============================================================
-- Migration 009: Campos Fiscais em Produtos
-- ============================================================

ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS ncm TEXT DEFAULT '85171231', -- NCM Padrão (Celular)
ADD COLUMN IF NOT EXISTS cfop TEXT DEFAULT '5102',    -- Venda de mercadoria adquirida de terceiros
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0',     -- 0 - Nacional
ADD COLUMN IF NOT EXISTS cest TEXT DEFAULT NULL;      -- Código Especificador da Substituição Tributária

-- Índices para busca rápida se necessário
CREATE INDEX IF NOT EXISTS idx_produtos_ncm ON produtos(ncm);
