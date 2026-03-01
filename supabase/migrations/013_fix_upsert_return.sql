-- ============================================================
-- Migration 013: Corrigir Retorno da Função upsert_config
-- ============================================================

-- Problema: A função original retornava VOID (204 No Content).
-- O cliente Supabase configurado com 'Accept: application/json' pode travar ao tentar parsear a resposta vazia.
-- Solução: Alterar a função para retornar um JSON simples {"ok": true}.

DROP FUNCTION IF EXISTS upsert_config(text, jsonb, text, boolean);

CREATE OR REPLACE FUNCTION upsert_config(
  p_chave TEXT,
  p_valor JSONB,
  p_descricao TEXT DEFAULT NULL,
  p_is_secret BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  v_empresa_id := get_my_empresa_id();
  
  INSERT INTO configuracoes (empresa_id, chave, valor, descricao, is_secret, updated_at)
  VALUES (v_empresa_id, p_chave, p_valor, p_descricao, p_is_secret, NOW())
  ON CONFLICT (empresa_id, chave)
  DO UPDATE SET
    valor = EXCLUDED.valor,
    descricao = COALESCE(EXCLUDED.descricao, configuracoes.descricao),
    is_secret = EXCLUDED.is_secret,
    updated_at = NOW();
    
  RETURN '{"ok": true}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
