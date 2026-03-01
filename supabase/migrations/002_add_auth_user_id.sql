-- ============================================================
-- Migration 002: Vincula tabela publica usuarios ao auth.users
-- ============================================================

-- Adiciona coluna auth_user_id para vincular com o usuário de autenticação do Supabase
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Cria índice para performance em buscas por auth_id
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON usuarios(auth_user_id);

-- Atualiza política RLS para permitir que o usuário veja seu próprio registro
-- (Necessário para o primeiro login/load do contexto)
CREATE POLICY "usuario_ver_proprio_registro" ON usuarios
  FOR SELECT
  USING (auth_user_id = auth.uid());
