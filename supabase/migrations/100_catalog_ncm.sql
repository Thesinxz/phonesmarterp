-- Adicionar campos NCM e CEST para suporte fiscal
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS ncm TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT;

-- Comentários para documentação
COMMENT ON COLUMN catalog_items.ncm IS 'Nomenclatura Comum do Mercosul (8 dígitos)';
COMMENT ON COLUMN catalog_items.cest IS 'Código Especificador da Substituição Tributária';
