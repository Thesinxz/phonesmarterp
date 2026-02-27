-- ============================================================
-- Migration 038: Revert RLS Subquery Loops & Fix IDs
-- ============================================================

-- 1. REVERTER SUBQUERIES EM public.get_my_empresa_id()
-- O Linter recomenda (SELECT auth.uid()) para otimização de funções internas, 
-- mas aplicar isso em funções customizadas (como get_my_empresa_id) que também 
-- consultam tabelas (ex: usuarios) causa recursões infinitas no planner do Postgres 
-- (Query Planner Hang), resultando em travamento do banco (ex: INSERTs infinitos).
-- Aqui revertemos "empresa_id = (SELECT public.get_my_empresa_id())" para 
-- "empresa_id = public.get_my_empresa_id()".

-- pecas_catalogo
DROP POLICY IF EXISTS "pecas_catalogo_select" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_select" ON public.pecas_catalogo FOR SELECT USING (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "pecas_catalogo_insert" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_insert" ON public.pecas_catalogo FOR INSERT WITH CHECK (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "pecas_catalogo_update" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_update" ON public.pecas_catalogo FOR UPDATE USING (empresa_id = public.get_my_empresa_id());

DROP POLICY IF EXISTS "pecas_catalogo_delete" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_delete" ON public.pecas_catalogo FOR DELETE USING (empresa_id = public.get_my_empresa_id());

-- fornecedores
DROP POLICY IF EXISTS "fornecedores_performance_policy" ON public.fornecedores;
CREATE POLICY "fornecedores_performance_policy" ON public.fornecedores FOR ALL
USING (empresa_id = public.get_my_empresa_id());

-- usuarios
-- Mantém o (SELECT auth.uid()) mas remove o SELECT do get_my_empresa_id
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
CREATE POLICY "usuarios_select_policy" ON public.usuarios
  FOR SELECT
  USING (
    auth_user_id = (SELECT auth.uid()) 
    OR 
    empresa_id = public.get_my_empresa_id()
  );

-- solicitacoes
DROP POLICY IF EXISTS "solicitacoes_performance_policy" ON public.solicitacoes;
CREATE POLICY "solicitacoes_performance_policy" ON public.solicitacoes FOR ALL
USING (empresa_id = public.get_my_empresa_id())
WITH CHECK (empresa_id = public.get_my_empresa_id());

-- produtos_historico
DROP POLICY IF EXISTS "produtos_historico_select" ON public.produtos_historico;
CREATE POLICY "produtos_historico_select" ON public.produtos_historico FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- caixas
DROP POLICY IF EXISTS "caixas_performance_policy" ON public.caixas;
CREATE POLICY "caixas_performance_policy" ON public.caixas FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- caixa_movimentacoes
DROP POLICY IF EXISTS "caixa_movimentacoes_performance_policy" ON public.caixa_movimentacoes;
CREATE POLICY "caixa_movimentacoes_performance_policy" ON public.caixa_movimentacoes FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- financeiro_titulos
DROP POLICY IF EXISTS "financeiro_titulos_performance_policy" ON public.financeiro_titulos;
CREATE POLICY "financeiro_titulos_performance_policy" ON public.financeiro_titulos FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- xml_importacoes
DROP POLICY IF EXISTS "xml_importacoes_performance_policy" ON public.xml_importacoes;
CREATE POLICY "xml_importacoes_performance_policy" ON public.xml_importacoes FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- compras
DROP POLICY IF EXISTS "compras_performance_policy" ON public.compras;
CREATE POLICY "compras_performance_policy" ON public.compras FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- compra_itens
DROP POLICY IF EXISTS "compra_itens_performance_policy" ON public.compra_itens;
CREATE POLICY "compra_itens_performance_policy" ON public.compra_itens FOR SELECT USING (empresa_id = public.get_my_empresa_id());

-- equipe_metas
DROP POLICY IF EXISTS "equipe_metas_performance_policy" ON public.equipe_metas;
CREATE POLICY "equipe_metas_performance_policy" ON public.equipe_metas FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- equipe_metas_categorias
DROP POLICY IF EXISTS "equipe_metas_cat_performance_policy" ON public.equipe_metas_categorias;
CREATE POLICY "equipe_metas_cat_performance_policy" ON public.equipe_metas_categorias FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- configuracoes_fiscais
DROP POLICY IF EXISTS "configuracoes_fiscais_performance_policy" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_performance_policy" ON public.configuracoes_fiscais FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- documentos_fiscais
DROP POLICY IF EXISTS "documentos_fiscais_performance_policy" ON public.documentos_fiscais;
CREATE POLICY "documentos_fiscais_performance_policy" ON public.documentos_fiscais FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- 2. FIX usuario_vinculos_empresa
-- Além do problema da subquery, a coluna usuario_id desta tabela aponta para usuarios.id (interno), 
-- não para auth.users.id. Comparar "usuario_id = auth.uid()" causa falha silenciosa de autorização.
DROP POLICY IF EXISTS "usuario_vinculos_empresa_performance_policy" ON public.usuario_vinculos_empresa;
CREATE POLICY "usuario_vinculos_empresa_performance_policy" ON public.usuario_vinculos_empresa FOR ALL
USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = (SELECT auth.uid())) 
  OR 
  empresa_id = public.get_my_empresa_id()
)
WITH CHECK (
  usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = (SELECT auth.uid())) 
  OR 
  empresa_id = public.get_my_empresa_id()
);

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
