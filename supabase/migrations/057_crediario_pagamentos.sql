-- Adicionando campos para suportar pagamentos parciais nativamente e histórico

ALTER TABLE crediario_parcelas 
ADD COLUMN IF NOT EXISTS valor_pago_centavos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pagamentos_json JSONB DEFAULT '[]'::jsonb;

-- O "status" da parcela voltará a ser apenas pendente, pago, atrasado ou cancelado, 
-- como o usuário solicitou que "fique como pendente devendo 40".
-- O status 'parcial' que adicionamos na migration 056 pode ser mantido apenas para segurança, 
-- mas usaremos 'pendente' ou 'parcial' visualmente.
