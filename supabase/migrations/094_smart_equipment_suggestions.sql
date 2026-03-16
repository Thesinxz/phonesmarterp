-- Migration: Add Smart Equipment Suggestions
-- Description: Learns common brands and models from usage history

CREATE OR REPLACE FUNCTION get_sugestoes_equipamento(
  p_empresa_id UUID,
  p_min_ocorrencias INTEGER DEFAULT 05 -- Baixei para 1 para facilitar testes iniciais
)
RETURNS TABLE (marca_label TEXT, modelo_label TEXT, total BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DISTINCT ON (UPPER(e.marca), UPPER(e.modelo))
    TRIM(e.marca) as marca_label, 
    TRIM(e.modelo) as modelo_label, 
    COUNT(*) OVER(PARTITION BY UPPER(e.marca), UPPER(e.modelo)) as total
  FROM equipamentos e
  WHERE e.empresa_id = p_empresa_id
  GROUP BY e.marca, e.modelo, UPPER(e.marca), UPPER(e.modelo)
  HAVING COUNT(*) >= p_min_ocorrencias
  ORDER BY UPPER(e.marca), UPPER(e.modelo), total DESC;
END;
$$;

-- Ícones para busca rápida
CREATE INDEX IF NOT EXISTS idx_equipamentos_marca_modelo ON equipamentos(empresa_id, marca, modelo);
