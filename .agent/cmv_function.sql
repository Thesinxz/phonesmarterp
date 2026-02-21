CREATE OR REPLACE FUNCTION calcular_cmv_periodo(p_empresa_id UUID, p_data_inicio DATE, p_data_fim DATE)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cmv_total BIGINT := 0;
BEGIN
    -- Isso soma o (preco_custo_centavos * quantidade) de todos os itens de vendas finalizadas no período
    SELECT COALESCE(SUM(p.preco_custo_centavos * vi.quantidade), 0)
    INTO v_cmv_total
    FROM vendas v
    JOIN venda_itens vi ON v.id = vi.venda_id
    JOIN produtos p ON p.id = vi.produto_id
    WHERE v.empresa_id = p_empresa_id
      AND v.status = 'concluida'
      AND DATE(v.created_at) >= p_data_inicio
      AND DATE(v.created_at) <= p_data_fim;

    -- Aqui pode-se adicionar lógica para Custo de peças de OS também se necessário futuramente
    -- ...

    RETURN v_cmv_total;
END;
$$;
