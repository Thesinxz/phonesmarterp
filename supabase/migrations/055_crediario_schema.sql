-- ============================================================
-- Migration 055: Crediário — Sistema de Parcelamento Próprio
-- ============================================================

-- ─── CREDIÁRIOS (Contratos) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS crediarios (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id            UUID NOT NULL REFERENCES clientes(id),
  venda_id              UUID REFERENCES vendas(id),
  numero                SERIAL,
  valor_total_centavos  INTEGER NOT NULL,
  entrada_centavos      INTEGER DEFAULT 0,
  num_parcelas          INTEGER NOT NULL CHECK (num_parcelas >= 1 AND num_parcelas <= 48),
  tipo                  TEXT NOT NULL DEFAULT 'interno'
                        CHECK (tipo IN ('efibank', 'interno')),
  juros_percentual      NUMERIC(5,2) DEFAULT 0,
  multa_percentual      NUMERIC(5,2) DEFAULT 2.00,
  status                TEXT NOT NULL DEFAULT 'ativo'
                        CHECK (status IN ('ativo', 'quitado', 'inadimplente', 'cancelado')),
  efibank_carnet_id     INTEGER,
  observacoes           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PARCELAS DO CREDIÁRIO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS crediario_parcelas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crediario_id          UUID NOT NULL REFERENCES crediarios(id) ON DELETE CASCADE,
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_parcela        INTEGER NOT NULL,
  valor_centavos        INTEGER NOT NULL,
  vencimento            DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  data_pagamento        TIMESTAMPTZ,
  forma_pagamento       TEXT,
  efibank_charge_id     INTEGER,
  efibank_barcode       TEXT,
  efibank_link          TEXT,
  efibank_pix_qrcode    TEXT,
  recibo_url            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE crediarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE crediario_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_isolation" ON crediarios
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY "empresa_isolation" ON crediario_parcelas
  USING (empresa_id = get_my_empresa_id());

-- ─── ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crediarios_empresa ON crediarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_crediarios_cliente ON crediarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crediarios_status ON crediarios(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_crediarios_venda ON crediarios(venda_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_crediario ON crediario_parcelas(crediario_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_empresa ON crediario_parcelas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON crediario_parcelas(empresa_id, vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON crediario_parcelas(empresa_id, status);

-- ─── TRIGGER: Atualizar status do crediário automaticamente ─
CREATE OR REPLACE FUNCTION update_crediario_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_pagas INTEGER;
  v_atrasadas INTEGER;
BEGIN
  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE status = 'pago'),
         COUNT(*) FILTER (WHERE status = 'atrasado')
  INTO v_total, v_pagas, v_atrasadas
  FROM crediario_parcelas
  WHERE crediario_id = NEW.crediario_id;

  IF v_pagas = v_total THEN
    UPDATE crediarios SET status = 'quitado', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  ELSIF v_atrasadas > 0 THEN
    UPDATE crediarios SET status = 'inadimplente', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  ELSE
    UPDATE crediarios SET status = 'ativo', updated_at = NOW()
    WHERE id = NEW.crediario_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_crediario_status
AFTER UPDATE ON crediario_parcelas
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_crediario_status();

-- ─── FUNÇÃO: Marcar parcelas vencidas como atrasadas ────────
CREATE OR REPLACE FUNCTION marcar_parcelas_atrasadas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE crediario_parcelas
  SET status = 'atrasado', updated_at = NOW()
  WHERE status = 'pendente'
    AND vencimento < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE crediarios;
ALTER PUBLICATION supabase_realtime ADD TABLE crediario_parcelas;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
