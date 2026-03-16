-- Migration 095: Global Crowdsourced Catalog
-- Description: Learns from all companies to provide a shared catalog for all users.

-- 1. Shared Catalog Table (No empresa_id)
CREATE TABLE IF NOT EXISTS catalogo_equipamentos_publico (
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    frequencia INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (marca, modelo)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_public_catalog_popular ON catalogo_equipamentos_publico (frequencia DESC);

-- 2. Trigger Function to Feed the Global Catalog
CREATE OR REPLACE FUNCTION sync_to_public_catalog()
RETURNS TRIGGER AS $$
DECLARE
    v_marca TEXT;
    v_modelo TEXT;
BEGIN
    -- Normalization
    v_marca := UPPER(TRIM(NEW.marca));
    v_modelo := INITCAP(TRIM(NEW.modelo));

    -- Ignore very short or junk data
    IF LENGTH(v_marca) < 2 OR LENGTH(v_modelo) < 2 THEN
        RETURN NEW;
    END IF;

    -- Upsert into public catalog
    INSERT INTO catalogo_equipamentos_publico (marca, modelo, frequencia)
    VALUES (v_marca, v_modelo, 1)
    ON CONFLICT (marca, modelo) 
    DO UPDATE SET 
        frequencia = catalogo_equipamentos_publico.frequencia + 1,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trg_sync_public_catalog ON equipamentos;
CREATE TRIGGER trg_sync_public_catalog
AFTER INSERT ON equipamentos
FOR EACH ROW EXECUTE FUNCTION sync_to_public_catalog();

-- 4. Update the Suggestion RPC to Merge Local and Global Data
DROP FUNCTION IF EXISTS get_sugestoes_equipamento(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_sugestoes_equipamento(
  p_empresa_id UUID,
  p_min_ocorrencias INTEGER DEFAULT 1
)
RETURNS TABLE (marca_label TEXT, modelo_label TEXT, total BIGINT, is_global BOOLEAN) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH local_usage AS (
    SELECT 
      UPPER(TRIM(e.marca)) as m_marca, 
      INITCAP(TRIM(e.modelo)) as m_modelo, 
      COUNT(*) as count_local
    FROM equipamentos e
    WHERE e.empresa_id = p_empresa_id
    GROUP BY UPPER(TRIM(e.marca)), INITCAP(TRIM(e.modelo))
  ),
  global_usage AS (
    SELECT 
      marca as m_marca, 
      modelo as m_modelo, 
      frequencia as count_global
    FROM catalogo_equipamentos_publico
    WHERE frequencia >= 5 -- Só sugere globalmente se for realmente comum
  )
  SELECT 
    COALESCE(l.m_marca, g.m_marca) as marca_label,
    COALESCE(l.m_modelo, g.m_modelo) as modelo_label,
    (COALESCE(l.count_local, 0) * 10 + COALESCE(g.count_global, 1))::BIGINT as total, -- Peso maior para uso local
    (l.m_marca IS NULL) as is_global
  FROM local_usage l
  FULL OUTER JOIN global_usage g ON l.m_marca = g.m_marca AND l.m_modelo = g.m_modelo
  ORDER BY total DESC
  LIMIT 50;
END;
$$;

-- Pre-populate with some basics to not start empty
INSERT INTO catalogo_equipamentos_publico (marca, modelo, frequencia) VALUES
('APPLE', 'iPhone 11', 100),
('APPLE', 'iPhone 12', 100),
('APPLE', 'iPhone 13', 100),
('APPLE', 'iPhone 14', 100),
('APPLE', 'iPhone 15', 50),
('SAMSUNG', 'Galaxy S23', 80),
('SAMSUNG', 'Galaxy S24', 20),
('SAMSUNG', 'A54', 120),
('MOTOROLA', 'Moto G84', 90)
ON CONFLICT DO NOTHING;
