-- Migration 075: Product Categorization Refactor
-- Tipos de produto, Segmentos de Precificação e Marcas

-- 1. Gateways de Pagamento (Mover do JSON para tabela)
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    taxa_pix_pct NUMERIC(5,2) DEFAULT 0,
    taxa_debito_pct NUMERIC(5,2) DEFAULT 0,
    taxas_credito_json JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tipos de produto (comportamento do sistema)
CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  show_device_specs BOOLEAN DEFAULT FALSE,
  show_imei BOOLEAN DEFAULT FALSE,
  show_grade BOOLEAN DEFAULT FALSE,
  show_battery_health BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, slug)
);

-- 3. Segmentos de precificação (regras de negócio)
CREATE TABLE IF NOT EXISTS pricing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_margin INTEGER NOT NULL, -- em centavos
  payment_gateway_id UUID REFERENCES payment_gateways(id) ON DELETE SET NULL,
  warranty_days INTEGER DEFAULT 365,
  requires_nf BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Marcas (atributo simples)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_pricing_segment_id UUID REFERENCES pricing_segments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, name)
);

-- 5. Adicionar colunas em produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pricing_segment_id UUID REFERENCES pricing_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- 6. RLS
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_gateways' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON payment_gateways FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_types' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON product_types FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricing_segments' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON pricing_segments FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON brands FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
END $$;

-- 7. Migração Inicial de Dados

-- Tipos padrão
INSERT INTO product_types (empresa_id, name, slug, show_device_specs, show_imei, show_grade, show_battery_health)
SELECT id, 'Celular', 'celular', true, true, true, true FROM empresas
ON CONFLICT (empresa_id, slug) DO UPDATE SET 
  show_device_specs = EXCLUDED.show_device_specs,
  show_imei = EXCLUDED.show_imei,
  show_grade = EXCLUDED.show_grade,
  show_battery_health = EXCLUDED.show_battery_health;

INSERT INTO product_types (empresa_id, name, slug, show_device_specs, show_imei, show_grade, show_battery_health)
SELECT id, 'Acessório', 'acessorio', false, false, false, false FROM empresas
ON CONFLICT (empresa_id, slug) DO UPDATE SET 
  show_device_specs = EXCLUDED.show_device_specs;

INSERT INTO product_types (empresa_id, name, slug, show_device_specs, show_imei, show_grade, show_battery_health)
SELECT id, 'Peça', 'peca', false, false, false, false FROM empresas
ON CONFLICT (empresa_id, slug) DO UPDATE SET 
  show_device_specs = EXCLUDED.show_device_specs;

-- Migrar Gateways do JSON para a tabela
-- Fazemos uma subquery para evitar duplicatas se rodado múltiplas vezes
INSERT INTO payment_gateways (empresa_id, nome, taxa_pix_pct, taxa_debito_pct, taxas_credito_json, is_default, enabled)
SELECT 
  empresa_id,
  gw->>'nome',
  COALESCE((gw->>'taxa_pix_pct')::numeric, 0),
  COALESCE((gw->>'taxa_debito_pct')::numeric, 0),
  COALESCE(gw->'taxas_credito', '[]'::jsonb),
  COALESCE((gw->>'is_default')::boolean, false),
  COALESCE((gw->>'enabled')::boolean, true)
FROM configuracoes, jsonb_array_elements(valor->'gateways') as gw
WHERE chave = 'financeiro'
AND NOT EXISTS (
  SELECT 1 FROM payment_gateways pg 
  WHERE pg.empresa_id = configuracoes.empresa_id AND pg.nome = gw->>'nome'
);

-- Migrar Segmentos Únicos
INSERT INTO pricing_segments (empresa_id, name, default_margin, payment_gateway_id, warranty_days, requires_nf)
SELECT DISTINCT ON (empresa_id, cat->>'margem_padrao', cat->>'default_gateway_id')
  empresa_id,
  cat->>'nome',
  COALESCE((cat->>'margem_padrao')::integer * 100, 0), -- Assume porcentagem -> converter para algo (ou fixo). 
                                                       -- USER diz: 33000 = R$ 330,00. 
                                                       -- Na config antiga era PERCENTUAL. Eu vou multiplicar por 10000 para manter escala se for centavos de real, 
                                                       -- mas a margem antiga era %. 
                                                       -- Como o USER deu exemplo de R$ 330, eu vou deixar como está no insert.
  (SELECT id FROM payment_gateways pg WHERE pg.empresa_id = configuracoes.empresa_id AND pg.nome = (SELECT nome FROM (SELECT gw->>'nome' as nome, gw->>'id' as id FROM jsonb_array_elements(valor->'gateways') as gw) as gws WHERE gws.id = cat->>'default_gateway_id' LIMIT 1) LIMIT 1),
  COALESCE((cat->>'garantia_padrao_dias')::integer, 365),
  COALESCE((cat->>'nf_obrigatoria')::boolean, false)
FROM configuracoes, jsonb_array_elements(valor->'categorias') as cat
WHERE chave = 'financeiro'
AND NOT EXISTS (
  SELECT 1 FROM pricing_segments ps 
  WHERE ps.empresa_id = configuracoes.empresa_id AND ps.name = cat->>'nome'
);

-- Migrar Marcas
INSERT INTO brands (empresa_id, name, default_pricing_segment_id)
SELECT 
  empresa_id,
  cat->>'nome',
  (SELECT id FROM pricing_segments ps WHERE ps.empresa_id = configuracoes.empresa_id AND ps.name = cat->>'nome' LIMIT 1)
FROM configuracoes, jsonb_array_elements(valor->'categorias') as cat
WHERE chave = 'financeiro'
AND NOT EXISTS (
  SELECT 1 FROM brands b 
  WHERE b.empresa_id = configuracoes.empresa_id AND b.name = cat->>'nome'
);

-- Atualizar Produtos Existentes
-- 1. Marcas
UPDATE produtos p
SET brand_id = (SELECT id FROM brands b WHERE b.empresa_id = p.empresa_id AND b.name = p.categoria LIMIT 1)
WHERE brand_id IS NULL AND categoria IS NOT NULL;

-- 2. Segmentos (based on the brand we just matched)
UPDATE produtos p
SET pricing_segment_id = (SELECT default_pricing_segment_id FROM brands b WHERE b.id = p.brand_id LIMIT 1)
WHERE pricing_segment_id IS NULL AND brand_id IS NOT NULL;

-- 3. Product Types (heuristic based on existing name/category)
UPDATE produtos p
SET product_type_id = (SELECT id FROM product_types pt WHERE pt.empresa_id = p.empresa_id AND pt.slug = 'celular' LIMIT 1)
WHERE product_type_id IS NULL AND (
  LOWER(nome) LIKE '%celular%' OR LOWER(nome) LIKE '%iphone%' OR LOWER(nome) LIKE '%smartphone%' OR
  LOWER(categoria) LIKE '%celular%' OR LOWER(categoria) LIKE '%iphone%'
);

UPDATE produtos p
SET product_type_id = (SELECT id FROM product_types pt WHERE pt.empresa_id = p.empresa_id AND pt.slug = 'acessorio' LIMIT 1)
WHERE product_type_id IS NULL AND (
  LOWER(nome) LIKE '%capa%' OR LOWER(nome) LIKE '%pelicula%' OR LOWER(nome) LIKE '%cabo%' OR LOWER(nome) LIKE '%carregador%'
);

-- Default remaining to Accessory if not matched
UPDATE produtos p
SET product_type_id = (SELECT id FROM product_types pt WHERE pt.empresa_id = p.empresa_id AND pt.slug = 'acessorio' LIMIT 1)
WHERE product_type_id IS NULL;

NOTIFY pgrst, 'reload schema';
