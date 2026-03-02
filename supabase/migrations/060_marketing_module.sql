-- ============================================================
-- Migration 060: Marketing Module
-- ============================================================

-- 1. Logs de mensagens enviadas (automações, campanhas, manuais)
CREATE TABLE IF NOT EXISTS marketing_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('automacao', 'campanha', 'manual')),
    template_nome   TEXT,
    destinatario_telefone TEXT,
    destinatario_nome TEXT,
    cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'entregue', 'lido', 'falha')),
    erro            TEXT,
    campanha_id     UUID,
    message_id      TEXT,
    metadata_json   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Campanhas de marketing
CREATE TABLE IF NOT EXISTS marketing_campanhas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome                TEXT NOT NULL,
    template_nome       TEXT NOT NULL,
    segmento            JSONB NOT NULL DEFAULT '{}',
    mensagem_preview    TEXT,
    status              TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviando', 'concluida', 'erro', 'cancelada')),
    total_destinatarios INTEGER NOT NULL DEFAULT 0,
    total_enviados      INTEGER NOT NULL DEFAULT 0,
    total_falhas        INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    enviado_em          TIMESTAMPTZ
);

-- 3. RLS
ALTER TABLE marketing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_isolation" ON marketing_logs
    FOR ALL USING (empresa_id = public.get_my_empresa_id());

CREATE POLICY "empresa_isolation" ON marketing_campanhas
    FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_marketing_logs_empresa ON marketing_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_marketing_logs_created ON marketing_logs(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_logs_campanha ON marketing_logs(campanha_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campanhas_empresa ON marketing_campanhas(empresa_id);

-- 5. FK da campanha_id nos logs
ALTER TABLE marketing_logs
    ADD CONSTRAINT marketing_logs_campanha_id_fkey
    FOREIGN KEY (campanha_id) REFERENCES marketing_campanhas(id) ON DELETE SET NULL;

-- 6. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
