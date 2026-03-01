-- ============================================================
-- Migration 057: Add instagram to clientes
-- ============================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
