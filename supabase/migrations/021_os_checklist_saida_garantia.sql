-- Fase 5: Adicionar checklist de saída e campos de garantia/assinatura

-- Renomear checklist_json para checklist_entrada_json (mais semântico)
-- Como não temos ALTER COLUMN RENAME em algumas versões, adicionamos novas colunas
ALTER TABLE public.ordens_servico
    ADD COLUMN IF NOT EXISTS checklist_entrada_json JSONB,
    ADD COLUMN IF NOT EXISTS checklist_saida_json JSONB,
    ADD COLUMN IF NOT EXISTS termo_garantia_texto TEXT,
    ADD COLUMN IF NOT EXISTS garantia_dias INTEGER DEFAULT 90;

-- Migrar dados existentes do checklist_json para checklist_entrada_json
UPDATE public.ordens_servico 
SET checklist_entrada_json = checklist_json 
WHERE checklist_json IS NOT NULL AND checklist_entrada_json IS NULL;
