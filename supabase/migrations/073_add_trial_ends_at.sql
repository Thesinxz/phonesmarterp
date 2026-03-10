-- Migration 073: Add trial_ends_at to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.empresas.trial_ends_at IS 'Data manual de expiração do trial. Se nulo, usa o padrão de 14 dias a partir de created_at.';
