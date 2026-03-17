-- Migration 102: Compras Extras
-- Adicionar colunas faltantes para melhor tracking financeiro e observações

ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS parcelas INTEGER DEFAULT 1;

COMMENT ON COLUMN public.compras.forma_pagamento IS 'Forma de pagamento utilizada (pix, boleto, etc)';
COMMENT ON COLUMN public.compras.parcelas IS 'Número de parcelas do pagamento';
