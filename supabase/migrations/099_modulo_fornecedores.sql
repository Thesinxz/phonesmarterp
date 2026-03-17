-- Verificar se tabela já existe e adicionar campos faltando
ALTER TABLE fornecedores
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'geral'
    CHECK (categoria IN ('pecas','aparelhos','acessorios','servicos','geral')),
  ADD COLUMN IF NOT EXISTS prazo_medio_pagamento INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS logradouro TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS banco_nome TEXT,
  ADD COLUMN IF NOT EXISTS banco_agencia TEXT,
  ADD COLUMN IF NOT EXISTS banco_conta TEXT,
  ADD COLUMN IF NOT EXISTS banco_tipo TEXT CHECK (banco_tipo IN ('corrente','poupanca','pix')),
  ADD COLUMN IF NOT EXISTS pix_chave TEXT;

-- Garantir que razao_social tenha valor (migrar de 'nome' se existir)
UPDATE fornecedores SET razao_social = nome WHERE razao_social IS NULL AND nome IS NOT NULL;

-- Se a tabela não existir, criar do zero
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  ie TEXT,
  categoria TEXT DEFAULT 'geral'
    CHECK (categoria IN ('pecas','aparelhos','acessorios','servicos','geral')),
  prazo_medio_pagamento INTEGER DEFAULT 30,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  site TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  banco_nome TEXT,
  banco_agencia TEXT,
  banco_conta TEXT,
  banco_tipo TEXT CHECK (banco_tipo IN ('corrente','poupanca','pix')),
  pix_chave TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresa_fornecedores" ON fornecedores;
CREATE POLICY "empresa_fornecedores" ON fornecedores
  USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

-- Índices
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
