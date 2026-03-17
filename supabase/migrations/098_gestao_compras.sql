-- Tabela principal de compras
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL DEFAULT 0,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  valor_total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','pago','cancelado')),
  origem TEXT NOT NULL DEFAULT 'manual'
    CHECK (origem IN ('manual','xml_nfe','ocr_pdf','ocr_imagem')),
  nota_fiscal_numero TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Número sequencial por empresa
CREATE OR REPLACE FUNCTION set_compra_numero()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO NEW.numero
  FROM compras
  WHERE empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compra_numero_trigger ON compras;
CREATE TRIGGER compra_numero_trigger
  BEFORE INSERT ON compras
  FOR EACH ROW EXECUTE FUNCTION set_compra_numero();

-- Itens da compra
CREATE TABLE IF NOT EXISTS compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_unitario INTEGER NOT NULL DEFAULT 0,
  custo_total INTEGER GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
  preco_venda_varejo INTEGER DEFAULT 0,
  preco_venda_atacado INTEGER DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'peca'
    CHECK (item_type IN ('peca','celular','acessorio','outro')),
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compra_itens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on overwrite
DROP POLICY IF EXISTS "empresa_compras" ON compras;
DROP POLICY IF EXISTS "empresa_compra_itens" ON compra_itens;

CREATE POLICY "empresa_compras" ON compras
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "empresa_compra_itens" ON compra_itens
  USING (empresa_id IN (
    SELECT empresa_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_empresa ON compras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_status ON compras(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_compra_itens_compra ON compra_itens(compra_id);
