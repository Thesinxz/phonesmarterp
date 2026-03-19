-- Performance Optimization Indices
-- Target: Speed up common listing and filtering queries

-- 1. Ordens de Serviço (Tabela principal)
CREATE INDEX IF NOT EXISTS idx_os_empresa_status
  ON public.ordens_servico(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_os_empresa_created
  ON public.ordens_servico(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_empresa_numero
  ON public.ordens_servico(empresa_id, numero DESC);

-- 2. Compras
CREATE INDEX IF NOT EXISTS idx_compras_empresa_created
  ON public.compras(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compras_empresa_status
  ON public.compras(empresa_id, status);

-- 3. Catálogo / Itens do Estoque
CREATE INDEX IF NOT EXISTS idx_catalog_empresa_type
  ON public.catalog_items(empresa_id, item_type);
CREATE INDEX IF NOT EXISTS idx_catalog_empresa_name
  ON public.catalog_items(empresa_id, name);
CREATE INDEX IF NOT EXISTS idx_catalog_stock
  ON public.catalog_items(empresa_id, stock_qty);

-- 4. Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_nome
  ON public.clientes(empresa_id, nome);

-- 5. Financeiro (Títulos)
CREATE INDEX IF NOT EXISTS idx_titulos_empresa_tipo_status
  ON public.financeiro_titulos(empresa_id, tipo, status);
CREATE INDEX IF NOT EXISTS idx_titulos_vencimento
  ON public.financeiro_titulos(empresa_id, data_vencimento);

-- 6. Vendas
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_created
  ON public.vendas(empresa_id, created_at DESC);

-- 7. Estoque por Unidade
CREATE INDEX IF NOT EXISTS idx_unit_stock_unit_item
  ON public.unit_stock(unit_id, catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_unit_stock_tenant
  ON public.unit_stock(tenant_id);

-- 8. Movimentações de Caixa (Geralmente carregadas no PDV/Financeiro)
CREATE INDEX IF NOT EXISTS idx_caixa_mov_caixa_id
  ON public.caixa_movimentacoes(caixa_id);

-- Verificar o que foi criado:
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename;
