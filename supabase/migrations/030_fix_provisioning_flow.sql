-- ============================================================
-- Migration 030: Fix Provisioning Flow (RPC for atomic creation)
-- ============================================================

-- Função para criar empresa e perfil de uma só vez com segurança
-- Isso evita o erro 403 de RLS ao tentar dar INSERT e depois SELECT no frontend
CREATE OR REPLACE FUNCTION provision_new_company(
  p_nome_empresa TEXT,
  p_subdominio TEXT,
  p_nome_usuario TEXT,
  p_email_usuario TEXT,
  p_auth_user_id UUID
)
RETURNS TABLE (
  empresa_id UUID,
  usuario_id UUID
) AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_id UUID;
BEGIN
  -- 1. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano)
  VALUES (p_nome_empresa, p_subdominio, 'starter')
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o perfil de usuário vinculado
  INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, ativo)
  VALUES (v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true)
  RETURNING id INTO v_usuario_id;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
