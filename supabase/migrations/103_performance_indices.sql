-- OS
CREATE INDEX IF NOT EXISTS idx_os_empresa_status
  ON ordens_servico(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_os_empresa_created
  ON ordens_servico(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_data_prevista
  ON ordens_servico(empresa_id, data_prevista)
  WHERE status NOT IN ('finalizada', 'entregue', 'cancelada');

-- Compras
CREATE INDEX IF NOT EXISTS idx_compras_empresa_created
  ON compras(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compras_status
  ON compras(empresa_id, status);

-- Catálogo
CREATE INDEX IF NOT EXISTS idx_catalog_empresa_type
  ON catalog_items(empresa_id, item_type);
CREATE INDEX IF NOT EXISTS idx_catalog_stock_alert
  ON catalog_items(empresa_id, stock_qty)
  WHERE stock_qty <= 2;

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_created
  ON clientes(empresa_id, created_at DESC);

-- Financeiro
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_tipo
  ON financeiro(empresa_id, tipo, pago);
CREATE INDEX IF NOT EXISTS idx_financeiro_vencimento
  ON financeiro(empresa_id, vencimento)
  WHERE pago = false;
CREATE INDEX IF NOT EXISTS idx_titulos_empresa_tipo
  ON financeiro_titulos(empresa_id, tipo, status);

-- Vendas
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_created
  ON vendas(empresa_id, created_at DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_empresa_created
  ON audit_logs(empresa_id, criado_em DESC);

-- Fornecedores
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa
  ON fornecedores(empresa_id);

-- Garantias
CREATE INDEX IF NOT EXISTS idx_warranty_empresa_status
  ON warranty_claims(empresa_id, status);

-- Documentos fiscais
CREATE INDEX IF NOT EXISTS idx_docs_fiscais_empresa_tipo
  ON documentos_fiscais(empresa_id, tipo);

-- Verificar criação:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename;
