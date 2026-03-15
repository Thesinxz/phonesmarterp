-- ============================================================
-- Migration 094: Comprehensive Cascade Delete
-- ============================================================

-- 1. Apply ON DELETE CASCADE to all tables referencing empresas
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_empresa_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_empresa_id_fkey;
ALTER TABLE brands ADD CONSTRAINT brands_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE caixa_movimentacoes DROP CONSTRAINT IF EXISTS caixa_movimentacoes_empresa_id_fkey;
ALTER TABLE caixa_movimentacoes ADD CONSTRAINT caixa_movimentacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE caixas DROP CONSTRAINT IF EXISTS caixas_empresa_id_fkey;
ALTER TABLE caixas ADD CONSTRAINT caixas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE catalog_items DROP CONSTRAINT IF EXISTS catalog_items_empresa_id_fkey;
ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_empresa_id_fkey;
ALTER TABLE clientes ADD CONSTRAINT clientes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE compra_itens DROP CONSTRAINT IF EXISTS compra_itens_empresa_id_fkey;
ALTER TABLE compra_itens ADD CONSTRAINT compra_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE compras DROP CONSTRAINT IF EXISTS compras_empresa_id_fkey;
ALTER TABLE compras ADD CONSTRAINT compras_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE configuracoes DROP CONSTRAINT IF EXISTS configuracoes_empresa_id_fkey;
ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE configuracoes_fiscais DROP CONSTRAINT IF EXISTS configuracoes_fiscais_empresa_id_fkey;
ALTER TABLE configuracoes_fiscais ADD CONSTRAINT configuracoes_fiscais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE convites DROP CONSTRAINT IF EXISTS convites_empresa_id_fkey;
ALTER TABLE convites ADD CONSTRAINT convites_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE crediario_parcelas DROP CONSTRAINT IF EXISTS crediario_parcelas_empresa_id_fkey;
ALTER TABLE crediario_parcelas ADD CONSTRAINT crediario_parcelas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE crediarios DROP CONSTRAINT IF EXISTS crediarios_empresa_id_fkey;
ALTER TABLE crediarios ADD CONSTRAINT crediarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE device_imeis DROP CONSTRAINT IF EXISTS device_imeis_tenant_id_fkey;
ALTER TABLE device_imeis ADD CONSTRAINT device_imeis_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE documentos_fiscais DROP CONSTRAINT IF EXISTS documentos_fiscais_empresa_id_fkey;
ALTER TABLE documentos_fiscais ADD CONSTRAINT documentos_fiscais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE equipamentos DROP CONSTRAINT IF EXISTS equipamentos_empresa_id_fkey;
ALTER TABLE equipamentos ADD CONSTRAINT equipamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE equipe_convites DROP CONSTRAINT IF EXISTS equipe_convites_empresa_id_fkey;
ALTER TABLE equipe_convites ADD CONSTRAINT equipe_convites_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE equipe_metas DROP CONSTRAINT IF EXISTS equipe_metas_empresa_id_fkey;
ALTER TABLE equipe_metas ADD CONSTRAINT equipe_metas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE equipe_metas_categorias DROP CONSTRAINT IF EXISTS equipe_metas_categorias_empresa_id_fkey;
ALTER TABLE equipe_metas_categorias ADD CONSTRAINT equipe_metas_categorias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE financeiro DROP CONSTRAINT IF EXISTS financeiro_empresa_id_fkey;
ALTER TABLE financeiro ADD CONSTRAINT financeiro_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE financeiro_titulos DROP CONSTRAINT IF EXISTS financeiro_titulos_empresa_id_fkey;
ALTER TABLE financeiro_titulos ADD CONSTRAINT financeiro_titulos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_empresa_id_fkey;
ALTER TABLE fornecedores ADD CONSTRAINT fornecedores_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE imei_history DROP CONSTRAINT IF EXISTS imei_history_tenant_id_fkey;
ALTER TABLE imei_history ADD CONSTRAINT imei_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE marketing_campanhas DROP CONSTRAINT IF EXISTS marketing_campanhas_empresa_id_fkey;
ALTER TABLE marketing_campanhas ADD CONSTRAINT marketing_campanhas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE marketing_logs DROP CONSTRAINT IF EXISTS marketing_logs_empresa_id_fkey;
ALTER TABLE marketing_logs ADD CONSTRAINT marketing_logs_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tenant_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_empresa_id_fkey;
ALTER TABLE ordens_servico ADD CONSTRAINT ordens_servico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE os_parts DROP CONSTRAINT IF EXISTS os_parts_tenant_id_fkey;
ALTER TABLE os_parts ADD CONSTRAINT os_parts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE os_timeline DROP CONSTRAINT IF EXISTS os_timeline_empresa_id_fkey;
ALTER TABLE os_timeline ADD CONSTRAINT os_timeline_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE os_unit_transfers DROP CONSTRAINT IF EXISTS os_unit_transfers_tenant_id_fkey;
ALTER TABLE os_unit_transfers ADD CONSTRAINT os_unit_transfers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE part_compatibility DROP CONSTRAINT IF EXISTS part_compatibility_tenant_id_fkey;
ALTER TABLE part_compatibility ADD CONSTRAINT part_compatibility_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE payment_gateways DROP CONSTRAINT IF EXISTS payment_gateways_empresa_id_fkey;
ALTER TABLE payment_gateways ADD CONSTRAINT payment_gateways_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE pecas_catalogo DROP CONSTRAINT IF EXISTS pecas_catalogo_empresa_id_fkey;
ALTER TABLE pecas_catalogo ADD CONSTRAINT pecas_catalogo_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE pricing_segments DROP CONSTRAINT IF EXISTS pricing_segments_empresa_id_fkey;
ALTER TABLE pricing_segments ADD CONSTRAINT pricing_segments_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE product_types DROP CONSTRAINT IF EXISTS product_types_empresa_id_fkey;
ALTER TABLE product_types ADD CONSTRAINT product_types_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_empresa_id_fkey;
ALTER TABLE produtos ADD CONSTRAINT produtos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE produtos_historico DROP CONSTRAINT IF EXISTS produtos_historico_empresa_id_fkey;
ALTER TABLE produtos_historico ADD CONSTRAINT produtos_historico_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_empresa_id_fkey;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_empresa_id_fkey;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tenant_id_fkey;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE tecnicos DROP CONSTRAINT IF EXISTS tecnicos_empresa_id_fkey;
ALTER TABLE tecnicos ADD CONSTRAINT tecnicos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE trade_ins DROP CONSTRAINT IF EXISTS trade_ins_empresa_id_fkey;
ALTER TABLE trade_ins ADD CONSTRAINT trade_ins_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE unit_stock DROP CONSTRAINT IF EXISTS unit_stock_tenant_id_fkey;
ALTER TABLE unit_stock ADD CONSTRAINT unit_stock_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_empresa_id_fkey;
ALTER TABLE units ADD CONSTRAINT units_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE usuario_vinculos_empresa DROP CONSTRAINT IF EXISTS usuario_vinculos_empresa_empresa_id_fkey;
ALTER TABLE usuario_vinculos_empresa ADD CONSTRAINT usuario_vinculos_empresa_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_empresa_id_fkey;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE venda_itens DROP CONSTRAINT IF EXISTS venda_itens_empresa_id_fkey;
ALTER TABLE venda_itens ADD CONSTRAINT venda_itens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_empresa_id_fkey;
ALTER TABLE vendas ADD CONSTRAINT vendas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE warranty_checklist_snapshot DROP CONSTRAINT IF EXISTS warranty_checklist_snapshot_tenant_id_fkey;
ALTER TABLE warranty_checklist_snapshot ADD CONSTRAINT warranty_checklist_snapshot_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE warranty_claims DROP CONSTRAINT IF EXISTS warranty_claims_tenant_id_fkey;
ALTER TABLE warranty_claims ADD CONSTRAINT warranty_claims_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE warranty_evidences DROP CONSTRAINT IF EXISTS warranty_evidences_tenant_id_fkey;
ALTER TABLE warranty_evidences ADD CONSTRAINT warranty_evidences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES empresas(id) ON DELETE CASCADE;

ALTER TABLE xml_importacoes DROP CONSTRAINT IF EXISTS xml_importacoes_empresa_id_fkey;
ALTER TABLE xml_importacoes ADD CONSTRAINT xml_importacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- 2. Create DELETE policy for empresas
DROP POLICY IF EXISTS "owner_can_delete_empresa" ON public.empresas;
CREATE TABLE IF NOT EXISTS public.usuarios (id uuid); -- Ensure table exists for policy check if needed (it should)
CREATE POLICY "owner_can_delete_empresa" ON public.empresas
  FOR DELETE
  USING (
    id IN (
      SELECT empresa_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid() 
        AND papel = 'admin'
    )
  );

-- 3. Clean up test companies
DELETE FROM public.empresas 
WHERE nome IN ('Guia Lopes', 'Filial Guia Lopes', 'Minha Empresa');

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
