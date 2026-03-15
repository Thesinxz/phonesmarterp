-- Migration 080: Warranty System Tables

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),

  -- OS original que gerou a garantia
  original_os_id UUID NOT NULL REFERENCES ordens_servico(id),

  -- OS de reparo aberta para atender a garantia (quando coberta)
  warranty_os_id UUID REFERENCES ordens_servico(id),

  -- Classificação
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'peca_defeituosa',    -- peça falhou: empresa cobre, tenta ressarcir fornecedor
    'erro_tecnico',       -- serviço mal feito: empresa cobre, registra responsável
    'dano_acidental',     -- cliente danificou: não coberto, nova OS com cobrança
    'nao_relacionado'     -- outro problema: cobra diagnóstico
  )),

  -- Cobertura
  is_covered BOOLEAN NOT NULL,          -- true = empresa cobre, false = cliente paga
  coverage_reason TEXT,                 -- justificativa da decisão

  -- Financeiro
  diagnosis_charged BOOLEAN DEFAULT false,  -- cobrou diagnóstico?
  diagnosis_amount INTEGER DEFAULT 0,       -- valor em centavos

  -- Fornecedor (só para peca_defeituosa)
  supplier_claim_status TEXT CHECK (supplier_claim_status IN (
    'nao_aplicavel', 'pendente', 'enviado', 'ressarcido', 'negado'
  )) DEFAULT 'nao_aplicavel',
  supplier_name TEXT,
  supplier_claim_notes TEXT,

  -- Técnico responsável (só para erro_tecnico — não exibir ao cliente)
  responsible_technician_id UUID REFERENCES usuarios(id),

  -- Descrição do problema relatado pelo cliente
  customer_complaint TEXT NOT NULL,

  -- Status da garantia
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN (
    'aberta', 'em_analise', 'aprovada', 'reparo_em_andamento', 'concluida', 'negada'
  )),

  -- Auditoria
  opened_by UUID REFERENCES usuarios(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_by UUID REFERENCES usuarios(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_tenant ON warranty_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warranty_original_os ON warranty_claims(original_os_id);
CREATE INDEX IF NOT EXISTS idx_warranty_status ON warranty_claims(tenant_id, status);

CREATE TABLE IF NOT EXISTS warranty_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  warranty_claim_id UUID NOT NULL REFERENCES warranty_claims(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'foto_defeito',       -- foto do defeito relatado pelo cliente
    'foto_aparelho',      -- foto geral do aparelho no retorno
    'foto_saida',         -- foto tirada quando saiu (retrospectiva)
    'documento',          -- termo, nota, outro arquivo
    'outro'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warranty_checklist_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  warranty_claim_id UUID NOT NULL REFERENCES warranty_claims(id) ON DELETE CASCADE,
  original_os_id UUID NOT NULL REFERENCES ordens_servico(id),
  checklist_data JSONB NOT NULL,   -- cópia exata do checklist no momento da abertura
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_checklist_snapshot ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_claims' AND policyname = 'empresa_isolation_claims') THEN
    CREATE POLICY "empresa_isolation_claims" ON warranty_claims FOR ALL USING (tenant_id = public.get_my_empresa_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_evidences' AND policyname = 'empresa_isolation_evidences') THEN
    CREATE POLICY "empresa_isolation_evidences" ON warranty_evidences FOR ALL USING (tenant_id = public.get_my_empresa_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warranty_checklist_snapshot' AND policyname = 'empresa_isolation_snapshot') THEN
    CREATE POLICY "empresa_isolation_snapshot" ON warranty_checklist_snapshot FOR ALL USING (tenant_id = public.get_my_empresa_id());
  END IF;
END $$;
