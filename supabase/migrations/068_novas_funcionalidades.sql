-- Migration 068: Novas funcionalidades SmartOS v2.1

-- 1. Habilitar Realtime para caixa (Fase 1)
ALTER TABLE caixas REPLICA IDENTITY FULL;
ALTER TABLE caixa_movimentacoes REPLICA IDENTITY FULL;

DO $$ DECLARE t text;
  tables text[] := ARRAY['caixas', 'caixa_movimentacoes'];
BEGIN FOREACH t IN ARRAY tables LOOP
  BEGIN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END LOOP; END $$;

-- 2. Campo de orçamento pré-aprovado na OS (Fase 4)
ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS orcamento_aprovado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS orcamento_aprovado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS orcamento_aprovado_por TEXT;
