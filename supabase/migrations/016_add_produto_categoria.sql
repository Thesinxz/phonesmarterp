-- =============================================
-- Migração 016: Adicionar categoria aos produtos
-- =============================================

-- 1. Adicionar coluna categoria
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT NULL;

-- 2. Índice para busca rápida por categoria
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(empresa_id, categoria);

-- NOTA: As categorias são definidas nas configurações financeiras (chave "financeiro").
-- Este campo armazena o NOME da categoria (ex: "Smartphone", "Peça", "Acessório").
-- A margem, garantia e NF obrigatória são obtidos da configuração, não duplicados no produto.
