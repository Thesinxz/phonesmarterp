-- ============================================================
-- Migration 015: Fix User Linking and Config Upsert
-- ============================================================

-- 1. Permitir que usuários atualizem seus próprios perfis
-- Essencial para o fluxo de auto-vinculação (AuthContext.tsx)
DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
CREATE POLICY "usuarios_update_policy" ON usuarios
  FOR UPDATE
  USING (
    auth_user_id = auth.uid() 
    OR 
    email = auth.jwt() ->> 'email'
  )
  WITH CHECK (
    auth_user_id = auth.uid() 
    OR 
    email = auth.jwt() ->> 'email'
  );

-- 2. Melhorar a função upsert_config para validar a empresa
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
  
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de empresa não identificado. Se você acabou de se cadastrar, tente recarregar a página para concluir o vínculo.';
  END IF;

  INSERT INTO configuracoes (empresa_id, chave, valor, descricao, is_secret, updated_at)
  VALUES (v_empresa_id, p_chave, p_valor, p_descricao, p_is_secret, NOW())
  ON CONFLICT (empresa_id, chave)
  DO UPDATE SET
    valor = configuracoes.valor || EXCLUDED.valor,
    descricao = COALESCE(EXCLUDED.descricao, configuracoes.descricao),
    is_secret = EXCLUDED.is_secret,
    updated_at = NOW();
    
  RETURN '{"ok": true}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
