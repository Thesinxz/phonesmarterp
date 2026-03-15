-- ============================================================
-- Migration 083: IMEI Traceability & Anatel Integration
-- ============================================================

-- 1. Create device_imeis table (Central Traceability)
CREATE TABLE IF NOT EXISTS public.device_imeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- IMEI info
  imei TEXT NOT NULL,
  catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'em_estoque' CHECK (status IN (
    'em_estoque',     -- disponível para venda
    'em_transito',    -- entre unidades/lojas
    'vendido',        -- vinculado a cliente e venda
    'em_garantia',    -- retornou, OS de garantia aberta
    'bloqueado'       -- IMEI na lista Anatel
  )),
  
  -- Location
  current_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  
  -- Sale info (when status = 'vendido')
  sale_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
  sold_to_customer_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  sold_at TIMESTAMPTZ,
  
  -- Audit
  registered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, imei)
);

CREATE INDEX IF NOT EXISTS idx_imei_tenant ON public.device_imeis(tenant_id, imei);
CREATE INDEX IF NOT EXISTS idx_imei_status ON public.device_imeis(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_imei_item ON public.device_imeis(catalog_item_id);

-- 2. Create imei_history (Immutable log)
CREATE TABLE IF NOT EXISTS public.imei_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  imei_id UUID NOT NULL REFERENCES public.device_imeis(id) ON DELETE CASCADE,
  imei TEXT NOT NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'cadastrado',       -- entrada no estoque
    'transferido',      -- mudou de unidade
    'vendido',          -- venda realizada
    'retornou',         -- cliente devolveu (garantia)
    'garantia_aberta',  -- OS de garantia vinculada
    'desbloqueado',     -- dono liberou IMEI bloqueado
    'bloqueado'         -- marcado como bloqueado
  )),
  
  from_status TEXT,
  to_status TEXT,
  unit_id UUID REFERENCES public.units(id),
  reference_id UUID,    -- ID da venda, OS ou transferência
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imei_history_imei ON public.imei_history(imei_id);

-- 3. Create imei_anatel_checks (Global Cache)
CREATE TABLE IF NOT EXISTS public.imei_anatel_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imei TEXT NOT NULL,
  is_blocked BOOLEAN NOT NULL,
  block_reason TEXT,
  raw_response JSONB,
  checked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(imei)
);

CREATE INDEX IF NOT EXISTS idx_anatel_imei ON public.imei_anatel_checks(imei);
CREATE INDEX IF NOT EXISTS idx_anatel_expires ON public.imei_anatel_checks(expires_at);

-- 4. RLS Policies
ALTER TABLE public.device_imeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imei_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imei_anatel_checks ENABLE ROW LEVEL SECURITY;

-- Utility function for isolation (ensure it's updated as per previous step)
CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() 
  ORDER BY (CASE WHEN empresa_id = ultimo_acesso_empresa_id THEN 0 ELSE 1 END), created_at DESC 
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for device_imeis
DROP POLICY IF EXISTS "device_imeis_isolation" ON public.device_imeis;
CREATE POLICY "device_imeis_isolation" ON public.device_imeis 
USING (tenant_id = get_my_empresa_id());

-- Policies for imei_history
DROP POLICY IF EXISTS "imei_history_isolation" ON public.imei_history;
CREATE POLICY "imei_history_isolation" ON public.imei_history 
USING (tenant_id = get_my_empresa_id());

-- Policies for imei_anatel_checks (Read only for all auth users)
DROP POLICY IF EXISTS "imei_anatel_read_policy" ON public.imei_anatel_checks;
CREATE POLICY "imei_anatel_read_policy" ON public.imei_anatel_checks
FOR SELECT TO authenticated USING (true);

-- 5. Migration: Populate device_imeis from legacy catalog_items.imei
DO $$
DECLARE
  v_item RECORD;
  v_main_unit_id UUID;
BEGIN
  FOR v_item IN SELECT id, imei, empresa_id FROM public.catalog_items WHERE imei IS NOT NULL AND imei <> '' LOOP
    -- Get first unit of the company as current location
    SELECT id INTO v_main_unit_id FROM public.units WHERE empresa_id = v_item.empresa_id LIMIT 1;
    
    INSERT INTO public.device_imeis (tenant_id, imei, catalog_item_id, status, current_unit_id)
    VALUES (v_item.empresa_id, v_item.imei, v_item.id, 'em_estoque', v_main_unit_id)
    ON CONFLICT (tenant_id, imei) DO NOTHING;
    
    -- Add initial history event
    INSERT INTO public.imei_history (tenant_id, imei_id, imei, event_type, to_status, unit_id, notes)
    SELECT v_item.empresa_id, id, imei, 'cadastrado', 'em_estoque', v_main_unit_id, 'Migrado do catálogo legacy'
    FROM public.device_imeis 
    WHERE tenant_id = v_item.empresa_id AND imei = v_item.imei
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
