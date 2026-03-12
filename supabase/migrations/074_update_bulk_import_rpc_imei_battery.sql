-- ============================================================
-- Migration 074: Update Bulk Import RPC for IMEI and Battery
-- ============================================================

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

  -- 2. Inserção em Massa
  INSERT INTO public.produtos (
    empresa_id,
    nome,
    preco_custo_centavos,
    preco_venda_centavos,
    estoque_qtd,
    estoque_minimo,
    ncm,
    cfop,
    origem,
    categoria,
    subcategoria,
    condicao,
    exibir_vitrine,
    descricao,
    imagem_url,
    imei,
    saude_bateria
  )
  SELECT 
    p_empresa_id,
    COALESCE(elem->>'nome', 'Produto Sem Nome'),
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
    (elem->>'saude_bateria')::INTEGER
  FROM jsonb_array_elements(p_produtos) AS elem;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  RETURN v_inserted_count;

END;
$$;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
