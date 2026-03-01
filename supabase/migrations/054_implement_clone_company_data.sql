-- ============================================================
-- Migration 054: Clone Company Data RPC
-- ============================================================

DROP FUNCTION IF EXISTS clone_company_data(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION clone_company_data(
  p_source_empresa_id UUID,
  p_target_empresa_id UUID,
  p_options JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_clone_products BOOLEAN := COALESCE((p_options->>'products')::BOOLEAN, false);
  v_clone_clients BOOLEAN := COALESCE((p_options->>'clients')::BOOLEAN, false);
  v_clone_configs BOOLEAN := COALESCE((p_options->>'configs')::BOOLEAN, true); -- Default true as per user feedback
BEGIN
  -- 1. Clonar Configurações (Taxas, Margens, Gateways)
  IF v_clone_configs THEN
    -- Inserir ou atualizar configurações, exceto as fiscais que são únicas por CNPJ
    INSERT INTO public.configuracoes (empresa_id, chave, valor, descricao, is_secret)
    SELECT 
      p_target_empresa_id,
      chave,
      valor,
      descricao,
      is_secret
    FROM public.configuracoes
    WHERE empresa_id = p_source_empresa_id
      AND chave NOT IN ('nfe_emitente', 'nfe_certificado', 'vitrine_subdominio')
    ON CONFLICT (empresa_id, chave) DO UPDATE SET
      valor = EXCLUDED.valor,
      descricao = EXCLUDED.descricao,
      is_secret = EXCLUDED.is_secret;
  END IF;

  -- 2. Clonar Clientes
  IF v_clone_clients THEN
    INSERT INTO public.clientes (
      empresa_id, nome, cpf_cnpj, telefone, email, endereco_json, pontos_fidelidade, segmento
    )
    SELECT 
      p_target_empresa_id, nome, cpf_cnpj, telefone, email, endereco_json, pontos_fidelidade, segmento
    FROM public.clientes
    WHERE empresa_id = p_source_empresa_id;
  END IF;

  -- 3. Clonar Produtos
  IF v_clone_products THEN
    INSERT INTO public.produtos (
      empresa_id, nome, preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo, 
      ncm, cfop, origem, categoria, subcategoria, condicao, exibir_vitrine, descricao
    )
    SELECT 
      p_target_empresa_id, nome, preco_custo_centavos, preco_venda_centavos, estoque_qtd, estoque_minimo, 
      ncm, cfop, origem, categoria, subcategoria, condicao, exibir_vitrine, descricao
    FROM public.produtos
    WHERE empresa_id = p_source_empresa_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
