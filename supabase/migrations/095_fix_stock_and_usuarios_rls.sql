-- Migration 095: Fix RLS and Relationships for Stock Management

-- 1. Restore usuarios visibility for colleagues (fixing regression from 082)
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT USING (
    auth_user_id = auth.uid() 
    OR 
    empresa_id = public.get_my_empresa_id()
  );

-- 2. Update stock_movements RLS to use the more robust get_my_empresa_id()
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movements_isolation" ON public.stock_movements;
CREATE POLICY "stock_movements_isolation" ON public.stock_movements 
  USING (tenant_id = public.get_my_empresa_id());

-- 3. Update unit_stock RLS for robustness
ALTER TABLE public.unit_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unit_stock_isolation" ON public.unit_stock;
CREATE POLICY "unit_stock_isolation" ON public.unit_stock 
  USING (tenant_id = public.get_my_empresa_id());

-- 4. Fix stock_movements created_by relationship
-- Change FK from auth.users(id) to public.usuarios(id) to match app usage and allow joins.
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE public.stock_movements 
  ADD CONSTRAINT stock_movements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.usuarios(id);

-- 5. Add ON DELETE CASCADE to stock_movements.catalog_item_id
-- Prevents 23503 error when deleting items from the catalog.
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_catalog_item_id_fkey;
ALTER TABLE public.stock_movements 
  ADD CONSTRAINT stock_movements_catalog_item_id_fkey 
  FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE CASCADE;

-- NOTIFY PostgREST to refresh
NOTIFY pgrst, 'reload schema';
