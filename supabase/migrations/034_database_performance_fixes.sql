-- ============================================================
-- Migration 034: Database Performance & Cleanup
-- ============================================================

-- 1. OTIMIZAÇÃO DE RLS (Performance - auth_rls_initplan)
-- Envolve chamadas auth.uid() e auth.jwt() em subconsultas (SELECT ...) 
-- para evitar reavaliação linha a linha (Inlining).

-- Tabelas: empresas, usuarios, pecas_catalogo, push_subscriptions, fornecedores, etc.

-- pecas_catalogo
DROP POLICY IF EXISTS "pecas_catalogo_select" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_select" ON public.pecas_catalogo FOR SELECT USING (empresa_id = (SELECT public.get_my_empresa_id()));

DROP POLICY IF EXISTS "pecas_catalogo_insert" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_insert" ON public.pecas_catalogo FOR INSERT WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()));

DROP POLICY IF EXISTS "pecas_catalogo_update" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_update" ON public.pecas_catalogo FOR UPDATE USING (empresa_id = (SELECT public.get_my_empresa_id()));

DROP POLICY IF EXISTS "pecas_catalogo_delete" ON public.pecas_catalogo;
CREATE POLICY "pecas_catalogo_delete" ON public.pecas_catalogo FOR DELETE USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- push_subscriptions (Consolidação de Múltiplas Políticas Permissivas)
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Ler próprias subscrições" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Inserir próprias subscrições" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Atualizar próprias subscrições" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Deletar próprias subscrições" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_performance_policy" ON public.push_subscriptions FOR ALL 
USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = (SELECT auth.uid())))
WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = (SELECT auth.uid())));

-- fornecedores (Consolidação de Múltiplas Políticas Permissivas)
DROP POLICY IF EXISTS "Fornecedores: empresa vê os seus" ON public.fornecedores;
DROP POLICY IF EXISTS "Isolamento Empresa - fornecedores" ON public.fornecedores;
CREATE POLICY "fornecedores_performance_policy" ON public.fornecedores FOR ALL
USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- usuarios
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
CREATE POLICY "usuarios_select_policy" ON public.usuarios
  FOR SELECT
  USING (
    auth_user_id = (SELECT auth.uid()) 
    OR 
    empresa_id = (SELECT public.get_my_empresa_id())
  );

DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios
  FOR UPDATE
  USING (
    auth_user_id = (SELECT auth.uid()) 
    OR 
    email = (SELECT auth.jwt() ->> 'email')
  );

-- solicitacoes
DROP POLICY IF EXISTS "Acesso total por empresa" ON public.solicitacoes;
CREATE POLICY "solicitacoes_performance_policy" ON public.solicitacoes FOR ALL
USING (empresa_id = (SELECT public.get_my_empresa_id()))
WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()));

-- produtos_historico
DROP POLICY IF EXISTS "Usuários podem ver histórico da própria empresa" ON public.produtos_historico;
CREATE POLICY "produtos_historico_select" ON public.produtos_historico FOR SELECT USING (empresa_id = (SELECT public.get_my_empresa_id()));

DROP POLICY IF EXISTS "Usuários logados podem inserir histórico" ON public.produtos_historico;
CREATE POLICY "produtos_historico_insert" ON public.produtos_historico FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Tabelas de Isolamento Simples (apenas SELECT public.get_my_empresa_id())
-- caixas, caixa_movimentacoes, financeiro_titulos, xml_importacoes, compras, compra_itens, equipe_metas, equipe_metas_categorias

-- caixas
DROP POLICY IF EXISTS "Isolamento Empresa - caixas" ON public.caixas;
CREATE POLICY "caixas_performance_policy" ON public.caixas FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- caixa_movimentacoes
DROP POLICY IF EXISTS "Isolamento Empresa - caixa_movimentacoes" ON public.caixa_movimentacoes;
CREATE POLICY "caixa_movimentacoes_performance_policy" ON public.caixa_movimentacoes FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- financeiro_titulos
DROP POLICY IF EXISTS "Isolamento Empresa - financeiro_titulos" ON public.financeiro_titulos;
CREATE POLICY "financeiro_titulos_performance_policy" ON public.financeiro_titulos FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- xml_importacoes
DROP POLICY IF EXISTS "Isolamento Empresa - xml_importacoes" ON public.xml_importacoes;
CREATE POLICY "xml_importacoes_performance_policy" ON public.xml_importacoes FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- compras
DROP POLICY IF EXISTS "Compras: empresa vê as suas" ON public.compras;
CREATE POLICY "compras_performance_policy" ON public.compras FOR SELECT USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- compra_itens
DROP POLICY IF EXISTS "Compra itens: empresa vê os seus" ON public.compra_itens;
CREATE POLICY "compra_itens_performance_policy" ON public.compra_itens FOR SELECT USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- equipe_metas
DROP POLICY IF EXISTS "equipe_metas_empresa" ON public.equipe_metas;
CREATE POLICY "equipe_metas_performance_policy" ON public.equipe_metas FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- equipe_metas_categorias
DROP POLICY IF EXISTS "equipe_metas_cat_empresa" ON public.equipe_metas_categorias;
CREATE POLICY "equipe_metas_cat_performance_policy" ON public.equipe_metas_categorias FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- configuracoes_fiscais
DROP POLICY IF EXISTS "Acesso seguro configurações fiscais" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_performance_policy" ON public.configuracoes_fiscais FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- documentos_fiscais
DROP POLICY IF EXISTS "Acesso aos documentos fiscais" ON public.documentos_fiscais;
CREATE POLICY "documentos_fiscais_performance_policy" ON public.documentos_fiscais FOR ALL USING (empresa_id = (SELECT public.get_my_empresa_id()));

-- empresas (INSERT policy fix)
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
CREATE POLICY "empresas_insert_policy" ON public.empresas FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);


-- 2. LIMPEZA DE ÍNDICES DUPLICADOS (duplicate_index)
DROP INDEX IF EXISTS public.idx_empresas_subdominio_unique;

-- O linter aponta como índice duplicado, mas na verdade é uma constraint (UNIQUE).
ALTER TABLE IF EXISTS public.push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_usuario_id_endpoint_key;

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
