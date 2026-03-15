-- Migration 084: Add IMEI tracking to penjualan items
-- This migration adds imei_id and imei column to venda_itens for traceability

ALTER TABLE venda_itens ADD COLUMN imei_id UUID REFERENCES device_imeis(id);
ALTER TABLE venda_itens ADD COLUMN imei TEXT;

-- Index for performance when searching sales by IMEI
CREATE INDEX idx_venda_itens_imei ON venda_itens(imei);
CREATE INDEX idx_venda_itens_imei_id ON venda_itens(imei_id);

-- Update RLS if needed (venda_itens already has empresa_id and policies usually cover it)

COMMENT ON COLUMN venda_itens.imei_id IS 'Link para a rastreabilidade do IMEI no sistema';
COMMENT ON COLUMN venda_itens.imei IS 'Dígitos do IMEI para referência rápida em recibos e buscas';
