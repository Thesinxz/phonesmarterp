-- Expansion of Realtime for all core tables
-- This ensures that any data change triggers a broadcast to connected clients

-- 1. Ensure publication exists (it usually does in Supabase)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Add tables to the publication
-- We use a DO block to avoid errors if the table is already a member

DO $$ 
DECLARE
  schema_name text := 'public';
  publication_name text := 'supabase_realtime';
  table_list text[] := ARRAY[
    'ordens_servico', 'os_parts', 'compras', 'compra_itens', 
    'catalog_items', 'clientes', 'financeiro_titulos', 'fornecedores', 
    'vendas', 'venda_itens', 'stock_movements', 'unit_stock', 
    'warranty_claims', 'notifications'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION %I ADD TABLE %I.%I', publication_name, schema_name, t);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table is already a member, skip
        NULL;
      WHEN undefined_table THEN
        -- Table doesn't exist yet, skip
        NULL;
    END;
  END LOOP;
END $$;

-- 3. Verify active tables
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;
