-- ============================================================
-- Migration 051: Bulk Import RPC for Products (Hanging Fix)
-- ============================================================

-- Este RPC permite inserir produtos em massa ignorando as travas de RLS
-- que estão causando recursão infinita (Hanging) no PostgREST.
-- Mudamos para retornar INTEGER para evitar que o PostgREST tente aplicar RLS no retorno.

DROP FUNCTION IF EXISTS public.importar_produtos_massa(p_produtos JSONB);

CREATE OR REPLACE FUNCTION public.importar_produtos_massa(p_produtos JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_inserted_count INTEGER;
BEGIN
  -- 1. Identificar a empresa do usuário logado de forma ultra-segura
  -- (Usamos Security Definer para pular o RLS da tabela de vínculos se houver loop)
  SELECT empresa_id INTO v_empresa_id 
  FROM public.usuario_vinculos_empresa 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;

  IF v_empresa_id IS NULL THEN  
    RAISE EXCEPTION 'Erro de Segurança: Empresa não encontrada para sua conta.';
  END IF;

  -- 2. Inserção em Massa
  -- Removemos a coluna 'ativo' que não existe na tabela 'produtos'
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
    descricao
  )
  SELECT 
    v_empresa_id,
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
    COALESCE(elem->>'descricao', 'Importação em Massa')
  FROM jsonb_array_elements(p_produtos) AS elem;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  
  -- 3. Retornar a contagem de inserções
  RETURN v_inserted_count;

END;
$$;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
