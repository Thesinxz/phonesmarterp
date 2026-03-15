-- Migration 076: Unified Catalog Items

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Campos universais
  item_type TEXT NOT NULL CHECK (item_type IN ('celular', 'acessorio', 'peca')),
  name TEXT NOT NULL,
  cost_price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  stock_alert_qty INTEGER DEFAULT 1,
  show_in_storefront BOOLEAN DEFAULT true,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  image_url TEXT,

  -- Dados fiscais
  ncm TEXT,
  cfop TEXT,
  origin_code TEXT DEFAULT '0',
  cest TEXT,

  -- Campos exclusivos de CELULAR
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  pricing_segment_id UUID REFERENCES pricing_segments(id) ON DELETE SET NULL,
  subcategory TEXT,
  condicao TEXT,
  color TEXT,
  grade TEXT,
  storage TEXT,
  ram TEXT,
  battery_health INTEGER,
  imei TEXT,
  imei2 TEXT,

  -- Campos exclusivos de ACESSÓRIO
  accessory_type TEXT,
  compatible_models TEXT,

  -- Campos exclusivos de PEÇA
  part_type TEXT,
  quality TEXT CHECK (quality IN ('original', 'oem', 'paralela', 'china', '') OR quality IS NULL),
  compatible_models_parts TEXT[],
  supplier TEXT,
  part_brand TEXT,
  model TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_catalog_items_empresa ON catalog_items(empresa_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_type ON catalog_items(empresa_id, item_type);
-- Full text search index
CREATE INDEX IF NOT EXISTS idx_catalog_items_search ON catalog_items USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(subcategory,'') || ' ' || COALESCE(compatible_models,'') || ' ' || COALESCE(imei,'') || ' ' || COALESCE(barcode,'')));

-- RLS
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'catalog_items' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON catalog_items FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
END $$;

-- MIGRATION OF EXISTING DATA

-- 1. Celulares e Acessórios a partir de "produtos" (Se já foi criado)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos') THEN
    INSERT INTO catalog_items (
      id, empresa_id, item_type, name, cost_price, sale_price, stock_qty, stock_alert_qty, show_in_storefront,
      description, sku, barcode, image_url, ncm, cfop, origin_code, cest,
      brand_id, pricing_segment_id, subcategory, condicao, battery_health, imei,
      created_at, updated_at
    )
    SELECT 
      p.id, p.empresa_id, 
      CASE WHEN pt.slug = 'celular' THEN 'celular' ELSE 'acessorio' END as item_type,
      p.nome, COALESCE(p.preco_custo_centavos, 0), COALESCE(p.preco_venda_centavos, 0), COALESCE(p.estoque_qtd, 0), COALESCE(p.estoque_minimo, 1), COALESCE(p.exibir_vitrine, true),
      p.descricao, p.sku, NULL, p.imagem_url, p.ncm, p.cfop, p.origem, p.cest,
      p.brand_id, p.pricing_segment_id, COALESCE(p.subcategoria, p.categoria), p.condicao, p.saude_bateria, p.imei,
      p.created_at, p.updated_at
    FROM produtos p
    LEFT JOIN product_types pt ON pt.id = p.product_type_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Peças a partir de "pecas_catalogo"
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pecas_catalogo') THEN
    INSERT INTO catalog_items (
      id, empresa_id, item_type, name, cost_price, sale_price, stock_qty, show_in_storefront,
      part_type, quality, compatible_models_parts, supplier, part_brand, model,
      created_at
    )
    SELECT
      pc.id, pc.empresa_id, 'peca', pc.nome, COALESCE(pc.preco_custo_centavos, 0), COALESCE(pc.preco_venda_centavos, 0), COALESCE(pc.estoque_qtd, 0), true,
      pc.tipo_peca, pc.qualidade, pc.modelos_compativeis, pc.fornecedor, pc.marca, pc.modelo,
      pc.created_at
    FROM pecas_catalogo pc
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
