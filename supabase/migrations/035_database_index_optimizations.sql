-- ============================================================
-- Migration 035: Database Index Optimizations
-- ============================================================

-- 1. ADICIONAR ÍNDICES PARA CHAVES ESTRANGEIRAS (unindexed_foreign_keys)

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_id ON public.audit_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario_id ON public.audit_logs(usuario_id);

-- caixa_movimentacoes
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_caixa_id ON public.caixa_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_empresa_id ON public.caixa_movimentacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_usuario_id ON public.caixa_movimentacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_vendedor_id ON public.caixa_movimentacoes(vendedor_id);

-- caixas
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_usuario_abertura_id ON public.caixas(usuario_abertura_id);
CREATE INDEX IF NOT EXISTS idx_caixas_usuario_fechamento_id ON public.caixas(usuario_fechamento_id);

-- compra_itens
CREATE INDEX IF NOT EXISTS idx_compra_itens_compra_id ON public.compra_itens(compra_id);
CREATE INDEX IF NOT EXISTS idx_compra_itens_empresa_id ON public.compra_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compra_itens_produto_id ON public.compra_itens(produto_id);

-- compras
CREATE INDEX IF NOT EXISTS idx_compras_empresa_id ON public.compras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor_id ON public.compras(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_titulo_id ON public.compras(titulo_id);
CREATE INDEX IF NOT EXISTS idx_compras_xml_importacao_id ON public.compras(xml_importacao_id);

-- documentos_fiscais
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_empresa_id ON public.documentos_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_os_id ON public.documentos_fiscais(os_id);
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_venda_id ON public.documentos_fiscais(venda_id);

-- equipamentos
CREATE INDEX IF NOT EXISTS idx_equipamentos_cliente_id ON public.equipamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_empresa_id ON public.equipamentos(empresa_id);

-- equipe_metas
CREATE INDEX IF NOT EXISTS idx_equipe_metas_usuario_id ON public.equipe_metas(usuario_id);

-- equipe_metas_categorias
CREATE INDEX IF NOT EXISTS idx_equipe_metas_cat_empresa_id ON public.equipe_metas_categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipe_metas_cat_meta_id ON public.equipe_metas_categorias(meta_id);
CREATE INDEX IF NOT EXISTS idx_equipe_metas_cat_produto_id ON public.equipe_metas_categorias(produto_id);

-- financeiro_titulos
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_cliente_id ON public.financeiro_titulos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_empresa_id ON public.financeiro_titulos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_titulos_fornecedor_id ON public.financeiro_titulos(fornecedor_id);

-- fornecedores
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON public.fornecedores(empresa_id);

-- ordens_servico
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON public.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_equipamento_id ON public.ordens_servico(equipamento_id);

-- os_timeline
CREATE INDEX IF NOT EXISTS idx_os_timeline_empresa_id ON public.os_timeline(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_timeline_usuario_id ON public.os_timeline(usuario_id);

-- pecas_catalogo
CREATE INDEX IF NOT EXISTS idx_pecas_catalogo_produto_id ON public.pecas_catalogo(produto_id);

-- produtos_historico
CREATE INDEX IF NOT EXISTS idx_produtos_historico_usuario_id ON public.produtos_historico(usuario_id);

-- push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_empresa_id ON public.push_subscriptions(empresa_id);

-- solicitacoes
CREATE INDEX IF NOT EXISTS idx_solicitacoes_atribuido_a ON public.solicitacoes(atribuido_a);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa_id ON public.solicitacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_usuario_id ON public.solicitacoes(usuario_id);

-- tecnicos
CREATE INDEX IF NOT EXISTS idx_tecnicos_empresa_id ON public.tecnicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tecnicos_usuario_id ON public.tecnicos(usuario_id);

-- usuario_vinculos_empresa
CREATE INDEX IF NOT EXISTS idx_usuario_vinculos_empresa_empresa_id ON public.usuario_vinculos_empresa(empresa_id);

-- usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso_empresa_id ON public.usuarios(ultimo_acesso_empresa_id);

-- venda_itens
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto_id ON public.venda_itens(produto_id);

-- vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas(cliente_id);

-- xml_importacoes
CREATE INDEX IF NOT EXISTS idx_xml_importacoes_compra_id ON public.xml_importacoes(compra_id);
CREATE INDEX IF NOT EXISTS idx_xml_importacoes_empresa_id ON public.xml_importacoes(empresa_id);


-- 2. REMOVER ÍNDICES NÃO UTILIZADOS (unused_index)
DROP INDEX IF EXISTS public.idx_os_empresa;
DROP INDEX IF EXISTS public.idx_financeiro_empresa;
DROP INDEX IF EXISTS public.idx_venda_itens_venda;
DROP INDEX IF EXISTS public.idx_venda_itens_empresa;
DROP INDEX IF EXISTS public.idx_produtos_ncm;
DROP INDEX IF EXISTS public.idx_produtos_historico_produto_id;
DROP INDEX IF EXISTS public.idx_produtos_historico_empresa_id;
DROP INDEX IF EXISTS public.idx_vendas_empresa;
DROP INDEX IF EXISTS public.idx_produtos_historico_created_at;
DROP INDEX IF EXISTS public.idx_vendas_status_pedido;
DROP INDEX IF EXISTS public.idx_pecas_catalogo_modelos;
DROP INDEX IF EXISTS public.idx_vendas_vendedor_id;
DROP INDEX IF EXISTS public.idx_vendas_vendedor_periodo;

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
