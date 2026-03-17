-- Migration 101: Fix RLS Policies for Compras and Fornecedores
-- The previous migrations (098, 099) incorrectly used a "profiles" table 
-- instead of the "usuarios" table.

-- Fix Compras
DROP POLICY IF EXISTS "empresa_compras" ON compras;
CREATE POLICY "empresa_compras" ON compras
  USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

-- Fix Compra Itens
DROP POLICY IF EXISTS "empresa_compra_itens" ON compra_itens;
CREATE POLICY "empresa_compra_itens" ON compra_itens
  USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

-- Fix Fornecedores
DROP POLICY IF EXISTS "empresa_fornecedores" ON fornecedores;
CREATE POLICY "empresa_fornecedores" ON fornecedores
  USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));
