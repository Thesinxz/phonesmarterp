-- ==============================================================================
-- Migration 011: RPC para atualização GLOBAL da cotação do dólar
-- ==============================================================================

-- Esta função atualiza o valor 'cotacao_dolar_paraguai' dentro do JSONB 'valor'
-- em TODAS as configurações financeiras de TODAS as empresas.
CREATE OR REPLACE FUNCTION update_global_exchange_rate(p_new_rate NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE configuracoes
  SET valor = jsonb_set(valor, '{cotacao_dolar_paraguai}', to_jsonb(p_new_rate))
  WHERE chave = 'financeiro';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
