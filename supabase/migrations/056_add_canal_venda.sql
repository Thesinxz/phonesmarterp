-- ============================================================
-- Migration 056: Add canal_venda to vendas
-- ============================================================

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS canal_venda TEXT;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
