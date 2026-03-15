-- ============================================================
-- Phone Smart ERP — Migration 077: Multi-Unit Parts Inventory
-- Task 1/6: Database Setup
-- ============================================================

-- 0. Ensure units table exists to prevent relation errors
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "units_isolation" ON units;
CREATE POLICY "units_isolation" ON units USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- 1. Create unit_stock table
-- Tracks inventory levels per item/unit
CREATE TABLE IF NOT EXISTS unit_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  alert_qty INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(unit_id, catalog_item_id)
);

-- 2. Create stock_movements table
-- Full history of stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'entrada', 'saida_os', 'saida_venda',
    'transferencia_saida', 'transferencia_entrada', 'ajuste'
  )),
  qty INTEGER NOT NULL,        -- positive = in, negative = out
  reference_id UUID,           -- OS ID or Sale ID
  notes TEXT,
  created_by UUID REFERENCES auth.users(id), -- Referencing auth.users as specified
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create os_unit_transfers table
-- Tracks device transfers between units linked to an OS
CREATE TABLE IF NOT EXISTS os_unit_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  from_unit_id UUID NOT NULL REFERENCES units(id),
  to_unit_id UUID NOT NULL REFERENCES units(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'em_transito', 'recebido', 'cancelado'
  )),
  sent_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create part_compatibility table
-- Direct map: Item -> Compatible Models
CREATE TABLE IF NOT EXISTS part_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  device_model TEXT NOT NULL,          -- normalized: 'moto-e7-power'
  device_model_display TEXT NOT NULL,  -- display: 'Moto E7 Power'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(catalog_item_id, device_model)
);

CREATE INDEX IF NOT EXISTS idx_part_compat_model ON part_compatibility(tenant_id, device_model);
CREATE INDEX IF NOT EXISTS idx_part_compat_item ON part_compatibility(catalog_item_id);

-- 5. Create os_parts table
-- Parts used in OS with unit tracking
CREATE TABLE IF NOT EXISTS os_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  qty INTEGER NOT NULL DEFAULT 1,
  cost_price INTEGER NOT NULL DEFAULT 0,  -- cents, snapshot price
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Update ordens_servico Status constraint
-- Adding 'em_transito' if not present, and adjusting to standard list
DO $$
BEGIN
    ALTER TABLE ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_status_check;
    ALTER TABLE ordens_servico ADD CONSTRAINT ordens_servico_status_check 
    CHECK (status IN ('aberta', 'em_analise', 'aguardando_peca', 'em_transito', 'em_execucao', 'finalizada', 'entregue', 'cancelada'));
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped or failed: %', SQLERRM;
END $$;

-- 7. RLS Policies
ALTER TABLE unit_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_unit_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_parts ENABLE ROW LEVEL SECURITY;

-- unit_stock: select all in tenant, write only in own unit (logic handled in app, simple RLS here)
DROP POLICY IF EXISTS "unit_stock_isolation" ON unit_stock;
CREATE POLICY "unit_stock_isolation" ON unit_stock USING (tenant_id = (auth.jwt() ->> 'empresa_id')::uuid);

DROP POLICY IF EXISTS "stock_movements_isolation" ON stock_movements;
CREATE POLICY "stock_movements_isolation" ON stock_movements USING (tenant_id = (auth.jwt() ->> 'empresa_id')::uuid);

DROP POLICY IF EXISTS "os_unit_transfers_isolation" ON os_unit_transfers;
CREATE POLICY "os_unit_transfers_isolation" ON os_unit_transfers USING (tenant_id = (auth.jwt() ->> 'empresa_id')::uuid);

DROP POLICY IF EXISTS "part_compatibility_isolation" ON part_compatibility;
CREATE POLICY "part_compatibility_isolation" ON part_compatibility USING (tenant_id = (auth.jwt() ->> 'empresa_id')::uuid);

DROP POLICY IF EXISTS "os_parts_isolation" ON os_parts;
CREATE POLICY "os_parts_isolation" ON os_parts USING (tenant_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- 8. Data Migration: catalog_items -> part_compatibility
DO $$
DECLARE
    item RECORD;
    model_name TEXT;
    normalized_model TEXT;
BEGIN
    FOR item IN SELECT id, empresa_id, compatible_models, compatible_models_parts FROM catalog_items WHERE item_type = 'peca' LOOP
        -- Case 1: compatible_models (String list)
        IF item.compatible_models IS NOT NULL AND item.compatible_models <> '' THEN
            FOR model_name IN SELECT trim(s) FROM unnest(string_to_array(item.compatible_models, ',')) s LOOP
                IF model_name <> '' THEN
                    -- Normalização: lowercase + espaços → hífens + remove caracteres especiais
                    normalized_model := lower(trim(regexp_replace(model_name, '[^a-zA-Z0-9\s]', '', 'g')));
                    normalized_model := regexp_replace(normalized_model, '\s+', '-', 'g');

                    INSERT INTO part_compatibility (tenant_id, catalog_item_id, device_model, device_model_display)
                    VALUES (item.empresa_id, item.id, normalized_model, model_name)
                    ON CONFLICT (catalog_item_id, device_model) DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        -- Case 2: compatible_models_parts (String array)
        IF item.compatible_models_parts IS NOT NULL THEN
            FOR model_name IN SELECT unnest(item.compatible_models_parts) LOOP
                IF model_name <> '' THEN
                    normalized_model := lower(trim(regexp_replace(model_name, '[^a-zA-Z0-9\s]', '', 'g')));
                    normalized_model := regexp_replace(normalized_model, '\s+', '-', 'g');

                    INSERT INTO part_compatibility (tenant_id, catalog_item_id, device_model, device_model_display)
                    VALUES (item.empresa_id, item.id, normalized_model, model_name)
                    ON CONFLICT (catalog_item_id, device_model) DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;
