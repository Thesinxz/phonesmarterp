-- ============================================================
-- Phone Smart ERP — Migration 089: Onboarding & Cloning Fix
-- ============================================================

-- 1. Add onboarding status columns to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS copied_from_empresa_id UUID REFERENCES public.empresas(id);

-- 2. Improved clone_company_data function
-- Handles ID remapping for complex relational structures
CREATE OR REPLACE FUNCTION clone_company_data(
  p_source_empresa_id UUID,
  p_target_empresa_id UUID,
  p_options JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_clone_products BOOLEAN := COALESCE((p_options->>'products')::BOOLEAN, false);
  v_clone_clients BOOLEAN := COALESCE((p_options->>'clients')::BOOLEAN, false);
  v_clone_configs BOOLEAN := COALESCE((p_options->>'configs')::BOOLEAN, true);
  
  v_unit_map JSONB := '{}'::jsonb;
  v_type_map JSONB := '{}'::jsonb;
  v_gw_map JSONB := '{}'::jsonb;
  v_segment_map JSONB := '{}'::jsonb;
  
  r RECORD;
  v_new_id UUID;
BEGIN
  -- 1. CLONE CONFIGS (JSON configurations in 'configuracoes' table)
  IF v_clone_configs THEN
    INSERT INTO public.configuracoes (empresa_id, chave, valor, descricao, is_secret)
    SELECT 
      p_target_empresa_id,
      chave,
      CASE 
        WHEN chave = 'system_onboarding' THEN jsonb_build_object('completed', true, 'step', 8, 'skipped', false)
        ELSE valor
      END,
      descricao,
      is_secret
    FROM public.configuracoes
    WHERE empresa_id = p_source_empresa_id
      AND chave NOT IN ('nfe_emitente', 'nfe_certificado', 'vitrine_subdominio')
    ON CONFLICT (empresa_id, chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      descricao = EXCLUDED.descricao,
      is_secret = EXCLUDED.is_secret;

    -- Update the main empresa flag
    UPDATE public.empresas SET onboarding_completed = TRUE, copied_from_empresa_id = p_source_empresa_id
    WHERE id = p_target_empresa_id;
  END IF;

  -- 2. CLONE UNITS (with mapping)
  -- We skip cloning if target already has units (provisioning might have created one)
  -- But we need to ensure at least one active unit exists
  FOR r IN SELECT * FROM public.units WHERE empresa_id = p_source_empresa_id LOOP
    -- Try to find matching unit in target by name or create new
    SELECT id INTO v_new_id FROM public.units WHERE empresa_id = p_target_empresa_id AND name = r.name;
    
    IF v_new_id IS NULL THEN
        INSERT INTO public.units (empresa_id, name, address, is_active)
        VALUES (p_target_empresa_id, r.name, r.address, r.is_active)
        RETURNING id INTO v_new_id;
    ELSE
        UPDATE public.units SET address = r.address, is_active = r.is_active WHERE id = v_new_id;
    END IF;
    
    v_unit_map := v_unit_map || jsonb_build_object(r.id::text, v_new_id);
  END LOOP;

  -- 3. CLONE PAYMENT GATEWAYS
  FOR r IN SELECT * FROM public.payment_gateways WHERE empresa_id = p_source_empresa_id LOOP
    INSERT INTO public.payment_gateways (empresa_id, nome, taxa_pix_pct, taxa_debito_pct, taxas_credito_json, is_default, enabled)
    VALUES (p_target_empresa_id, r.nome, r.taxa_pix_pct, r.taxa_debito_pct, r.taxas_credito_json, r.is_default, r.enabled)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_id;
    
    IF v_new_id IS NULL THEN
      SELECT id INTO v_new_id FROM public.payment_gateways WHERE empresa_id = p_target_empresa_id AND nome = r.nome;
    END IF;
    
    v_gw_map := v_gw_map || jsonb_build_object(r.id::text, v_new_id);
  END LOOP;

  -- 4. CLONE PRODUCT TYPES
  FOR r IN SELECT * FROM public.product_types WHERE empresa_id = p_source_empresa_id LOOP
    INSERT INTO public.product_types (empresa_id, name, slug, show_device_specs, show_imei, show_grade, show_battery_health)
    VALUES (p_target_empresa_id, r.name, r.slug, r.show_device_specs, r.show_imei, r.show_grade, r.show_battery_health)
    ON CONFLICT (empresa_id, slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_new_id;
    
    v_type_map := v_type_map || jsonb_build_object(r.id::text, v_new_id);
  END LOOP;

  -- 5. CLONE PRICING SEGMENTS (Depends on Gateways)
  FOR r IN SELECT * FROM public.pricing_segments WHERE empresa_id = p_source_empresa_id LOOP
    INSERT INTO public.pricing_segments (empresa_id, name, default_margin, payment_gateway_id, warranty_days, requires_nf)
    VALUES (
      p_target_empresa_id, 
      r.name, 
      r.default_margin, 
      (v_gw_map->>(r.payment_gateway_id::text))::uuid, 
      r.warranty_days, 
      r.requires_nf
    )
    RETURNING id INTO v_new_id;
    
    v_segment_map := v_segment_map || jsonb_build_object(r.id::text, v_new_id);
  END LOOP;

  -- 6. CLONE BRANDS (Depends on Segments)
  FOR r IN SELECT * FROM public.brands WHERE empresa_id = p_source_empresa_id LOOP
    INSERT INTO public.brands (empresa_id, name, default_pricing_segment_id)
    VALUES (
      p_target_empresa_id, 
      r.name, 
      (v_segment_map->>(r.default_pricing_segment_id::text))::uuid
    )
    ON CONFLICT (empresa_id, name) DO NOTHING;
  END LOOP;

  -- 7. CLONE CLIENTS
  IF v_clone_clients THEN
    INSERT INTO public.clientes (
      empresa_id, nome, cpf_cnpj, telefone, email, endereco_json, pontos_fidelidade, segmento
    )
    SELECT 
      p_target_empresa_id, nome, cpf_cnpj, telefone, email, endereco_json, pontos_fidelidade, segmento
    FROM public.clientes
    WHERE empresa_id = p_source_empresa_id;
  END IF;

  -- 8. CLONE PRODUCTS
  IF v_clone_products THEN
    INSERT INTO public.produtos (
      empresa_id, nome, preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo, 
      ncm, cfop, origem, categoria, subcategoria, condicao, exibir_vitrine, descricao,
      product_type_id, pricing_segment_id, brand_id
    )
    SELECT 
      p_target_empresa_id, nome, preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo, 
      ncm, cfop, origem, categoria, subcategoria, condicao, exibir_vitrine, descricao,
      (v_type_map->>(product_type_id::text))::uuid,
      (v_segment_map->>(pricing_segment_id::text))::uuid,
      (SELECT id FROM public.brands WHERE empresa_id = p_target_empresa_id AND name = (SELECT name FROM public.brands b2 WHERE b2.id = brands.id))
    FROM public.produtos
    WHERE empresa_id = p_source_empresa_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Legacy status migration
-- Set onboarding_completed = true for companies that already finished it in configuracoes
UPDATE public.empresas e
SET onboarding_completed = TRUE
FROM public.configuracoes c
WHERE c.empresa_id = e.id
  AND c.chave = 'system_onboarding'
  AND (c.valor->>'completed')::BOOLEAN = TRUE;

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';
