-- ============================================================
-- Migration 036: Fix calcular_cmv_periodo search_path
-- ============================================================

-- A função calcular_cmv_periodo estava sendo reportada mesmo após a migration 033.
-- Recriando explicitamente para garantir que a versão mais recente com search_path seguro
-- sobrescreva qualquer assinatura antiga que o Supabase linter esteja identificando.

CREATE OR REPLACE FUNCTION public.calcular_cmv_periodo(p_empresa_id UUID, p_data_inicio DATE, p_data_fim DATE)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cmv_total BIGINT := 0;
BEGIN
    SELECT COALESCE(SUM(p.preco_custo_centavos * vi.quantidade), 0)
    INTO v_cmv_total
    FROM vendas v
    JOIN venda_itens vi ON v.id = vi.venda_id
    JOIN produtos p ON p.id = vi.produto_id
    WHERE v.empresa_id = p_empresa_id
      AND v.status = 'concluida'
      AND DATE(v.created_at) >= p_data_inicio
      AND DATE(v.created_at) <= p_data_fim;

    RETURN v_cmv_total;
END;
$$;
