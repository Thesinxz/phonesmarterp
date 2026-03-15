-- Migration 085: Módulo Trade-in

-- 1. Adicionar referência de trade-in na venda
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS trade_in_id UUID;

-- 2. Tabela trade_ins
CREATE TABLE IF NOT EXISTS trade_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),

  -- Venda vinculada (preenchida após confirmar a venda)
  sale_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,

  -- Aparelho recebido do cliente
  device_name TEXT NOT NULL,          -- ex: 'iPhone 12 Pro Max 256GB'
  device_imei TEXT,                   -- IMEI do aparelho recebido
  device_condition TEXT NOT NULL CHECK (device_condition IN (
    'otimo',       -- sem marcas, tudo funcionando
    'bom',         -- marcas leves, tudo funcionando
    'regular',     -- marcas visíveis, funciona
    'ruim'         -- problemas funcionais
  )),
  device_notes TEXT,                  -- observações da avaliação

  -- Valor
  evaluated_value INTEGER NOT NULL,   -- valor avaliado em centavos
  applied_value INTEGER NOT NULL,     -- valor efetivamente aplicado (pode ser menor)

  -- Destino do aparelho recebido
  destination TEXT NOT NULL DEFAULT 'estoque_direto' CHECK (destination IN (
    'estoque_direto',    -- entra direto para revenda
    'assistencia'        -- vai para assistência técnica antes
  )),

  -- Se entrou no estoque: referência ao catalog_item criado
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,

  -- Se foi para assistência: referência à OS criada
  service_order_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,

  -- Auditoria
  evaluated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tradein_empresa ON trade_ins(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tradein_sale ON trade_ins(sale_id);
CREATE INDEX IF NOT EXISTS idx_tradein_imei ON trade_ins(device_imei);

-- 3. RLS Pattern do projeto
ALTER TABLE trade_ins ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trade_ins' AND policyname = 'empresa_isolation') THEN
    CREATE POLICY "empresa_isolation" ON trade_ins FOR ALL USING (empresa_id = public.get_my_empresa_id());
  END IF;
END $$;

-- 4. Constraint na tabela vendas após criação da tabela trade_ins
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vendas_trade_in') THEN
        ALTER TABLE vendas ADD CONSTRAINT fk_vendas_trade_in FOREIGN KEY (trade_in_id) REFERENCES trade_ins(id) ON DELETE SET NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
