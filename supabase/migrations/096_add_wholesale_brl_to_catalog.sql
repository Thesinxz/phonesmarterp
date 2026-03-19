-- Migration 096: Add Wholesale BRL Pricing
-- Add wholesale BRL pricing columns to catalog_items and produtos

-- 1. Update catalog_items
ALTER TABLE public.catalog_items 
ADD COLUMN IF NOT EXISTS wholesale_price_brl INTEGER DEFAULT 0;

-- 2. Update produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS wholesale_price_brl INTEGER DEFAULT 0;

-- 3. Update the bulk import RPC to handle the new field
CREATE OR REPLACE FUNCTION public.importar_produtos_massa(p_produtos JSONB, p_empresa_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  -- 1. Validação de Segurança Básica
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_vinculos_empresa 
    WHERE auth_user_id = auth.uid() AND empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'Acesso Negado: Você não tem permissão para importar produtos nesta empresa.';
  END IF;

  -- 2. Inserção em Massa em 'produtos' e sincronização com 'catalog_items'
  WITH inserted_produtos AS (
    INSERT INTO public.produtos (
      empresa_id, nome, product_type_id, brand_id, pricing_segment_id,
      preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo,
      ncm, cfop, origem, categoria, subcategoria, condicao, exibir_vitrine,
      descricao, imagem_url, imei, saude_bateria, sale_price_usd, sale_price_usd_rate,
      wholesale_price_brl
    )
    SELECT 
      p_empresa_id,
      COALESCE(elem->>'nome', 'Produto Sem Nome'),
      (elem->>'product_type_id')::UUID,
      (elem->>'brand_id')::UUID,
      (elem->>'pricing_segment_id')::UUID,
      COALESCE((elem->>'preco_custo_centavos')::NUMERIC, 0)::INTEGER,
      COALESCE((elem->>'preco_venda_centavos')::NUMERIC, 0)::INTEGER,
      COALESCE((elem->>'estoque_qtd')::NUMERIC, 1)::INTEGER,
      COALESCE((elem->>'estoque_minimo')::NUMERIC, 1)::INTEGER,
      COALESCE(elem->>'ncm', '85171231'),
      COALESCE(elem->>'cfop', '5102'),
      COALESCE(elem->>'origem', '0'),
      elem->>'categoria',
      elem->>'subcategoria',
      COALESCE(elem->>'condicao', 'novo_lacrado'),
      COALESCE((elem->>'exibir_vitrine')::BOOLEAN, true),
      COALESCE(elem->>'descricao', 'Importação em Massa'),
      elem->>'imagem_url',
      elem->>'imei',
      (elem->>'saude_bateria')::INTEGER,
      COALESCE((elem->>'sale_price_usd')::NUMERIC, 0)::INTEGER,
      COALESCE((elem->>'sale_price_usd_rate')::NUMERIC, 0),
      COALESCE((elem->>'wholesale_price_brl')::NUMERIC, 0)::INTEGER
    FROM jsonb_array_elements(p_produtos) AS elem
    RETURNING *
  )
  INSERT INTO public.catalog_items (
    id, empresa_id, item_type, name, cost_price, sale_price, stock_qty, stock_alert_qty,
    show_in_storefront, description, ncm, cfop, origin_code, image_url,
    brand_id, pricing_segment_id, subcategory, condicao, battery_health, imei,
    sale_price_usd, sale_price_usd_rate, wholesale_price_brl
  )
  SELECT 
    p.id, p.empresa_id, 
    COALESCE((SELECT slug FROM public.product_types WHERE id = p.product_type_id), 'acessorio'),
    p.nome, p.preco_custo_centavos, p.preco_venda_centavos, p.estoque_qtd, p.estoque_minimo,
    p.exibir_vitrine, p.descricao, p.ncm, p.cfop, p.origem, p.imagem_url,
    p.brand_id, p.pricing_segment_id, p.subcategoria, p.condicao, p.saude_bateria, p.imei,
    p.sale_price_usd, p.sale_price_usd_rate, p.wholesale_price_brl
  FROM inserted_produtos p;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  RETURN v_inserted_count;

END;
$$;

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
