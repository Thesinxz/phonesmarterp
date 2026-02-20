-- ============================================================
-- Phone Smart ERP — Migration 001: Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── EMPRESAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  cnpj            TEXT,
  subdominio      TEXT NOT NULL UNIQUE,
  plano           TEXT NOT NULL DEFAULT 'starter' CHECK (plano IN ('starter', 'profissional', 'enterprise')),
  certificado_a1  TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USUARIOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  papel           TEXT NOT NULL DEFAULT 'atendente'
                    CHECK (papel IN ('admin', 'gerente', 'tecnico', 'financeiro', 'atendente')),
  permissoes_json JSONB NOT NULL DEFAULT '{}',
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLIENTES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  cpf_cnpj            TEXT,
  telefone            TEXT,
  email               TEXT,
  endereco_json       JSONB,
  pontos_fidelidade   INTEGER NOT NULL DEFAULT 0,
  segmento            TEXT CHECK (segmento IN ('novo', 'vip', 'atacadista')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EQUIPAMENTOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipamentos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  marca       TEXT NOT NULL,
  modelo      TEXT NOT NULL,
  imei        TEXT CHECK (imei ~ '^[0-9]{15}$'),
  cor         TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ORDENS DE SERVIÇO ───────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS os_numero_seq;

CREATE TABLE IF NOT EXISTS ordens_servico (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                INTEGER NOT NULL DEFAULT nextval('os_numero_seq'),
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id            UUID NOT NULL REFERENCES clientes(id),
  equipamento_id        UUID NOT NULL REFERENCES equipamentos(id),
  tecnico_id            UUID REFERENCES usuarios(id),
  status                TEXT NOT NULL DEFAULT 'aberta'
                          CHECK (status IN ('aberta','em_analise','aguardando_peca','em_execucao','finalizada','entregue','cancelada')),
  problema_relatado     TEXT NOT NULL,
  diagnostico           TEXT,
  checklist_json        JSONB,
  valor_total_centavos  INTEGER NOT NULL DEFAULT 0,
  forma_pagamento       TEXT,
  garantia_ate          DATE,
  assinatura_base64     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── OS TIMELINE (append-only) ───────────────────────────────
CREATE TABLE IF NOT EXISTS os_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id       UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  evento      TEXT NOT NULL,
  dados_json  JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRODUTOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                    TEXT NOT NULL,
  imei                    TEXT CHECK (imei ~ '^[0-9]{15}$'),
  grade                   TEXT CHECK (grade IN ('A','B','C')),
  cor                     TEXT,
  capacidade              TEXT,
  preco_custo_centavos    INTEGER NOT NULL DEFAULT 0,
  preco_venda_centavos    INTEGER NOT NULL DEFAULT 0,
  estoque_qtd             INTEGER NOT NULL DEFAULT 0,
  estoque_minimo          INTEGER NOT NULL DEFAULT 1,
  fornecedor_id           UUID,
  descricao               TEXT,
  codigo_barras           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VENDAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id          UUID REFERENCES clientes(id),
  total_centavos      INTEGER NOT NULL DEFAULT 0,
  forma_pagamento     TEXT NOT NULL,
  nfce_chave          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FINANCEIRO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financeiro (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  valor_centavos    INTEGER NOT NULL,
  categoria         TEXT NOT NULL,
  centro_custo      TEXT,
  descricao         TEXT,
  vencimento        DATE,
  pago              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TECNICOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tecnicos (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id              UUID NOT NULL REFERENCES usuarios(id),
  comissao_pct            NUMERIC(5,2) NOT NULL DEFAULT 0,
  meta_mensal_centavos    INTEGER NOT NULL DEFAULT 0,
  especialidades          TEXT[] NOT NULL DEFAULT '{}',
  ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOGS (append-only) ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id          UUID NOT NULL REFERENCES usuarios(id),
  tabela              TEXT NOT NULL,
  acao                TEXT NOT NULL CHECK (acao IN ('INSERT','UPDATE','DELETE')),
  dado_anterior_json  JSONB,
  dado_novo_json      JSONB,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_os_updated_at
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico    ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_timeline       ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecnicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see data from their own empresa
CREATE POLICY "empresa_isolation" ON usuarios
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON clientes
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON equipamentos
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON ordens_servico
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON os_timeline
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON produtos
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON vendas
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON financeiro
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON tecnicos
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "empresa_isolation" ON audit_logs
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- os_timeline and audit_logs are append-only (no UPDATE/DELETE)
CREATE POLICY "append_only_timeline" ON os_timeline
  AS RESTRICTIVE FOR UPDATE USING (FALSE);
CREATE POLICY "append_only_timeline_del" ON os_timeline
  AS RESTRICTIVE FOR DELETE USING (FALSE);

CREATE POLICY "append_only_audit" ON audit_logs
  AS RESTRICTIVE FOR UPDATE USING (FALSE);
CREATE POLICY "append_only_audit_del" ON audit_logs
  AS RESTRICTIVE FOR DELETE USING (FALSE);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_empresa ON ordens_servico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_os_tecnico ON ordens_servico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa ON financeiro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_vencimento ON financeiro(empresa_id, vencimento);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_timeline_os ON os_timeline(os_id);
