-- ============================================================
-- Migration 024: Tornar equipamento_id nullable na ordens_servico
-- ============================================================
-- O Wizard V2 armazena dados do equipamento diretamente em colunas
-- (marca_equipamento, modelo_equipamento, etc.), então o equipamento_id
-- não é mais obrigatório para OS criadas pelo wizard.

ALTER TABLE public.ordens_servico
    ALTER COLUMN equipamento_id DROP NOT NULL;

-- Refresh do cache do PostgREST
NOTIFY pgrst, 'reload schema';
