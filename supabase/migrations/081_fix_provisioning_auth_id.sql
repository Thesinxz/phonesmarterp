-- ============================================================
-- Migration 081: Fix provision_additional_company auth_user_id
-- ============================================================

CREATE OR REPLACE FUNCTION provision_additional_company(
  p_nome_empresa TEXT,
  p_subdominio TEXT,
  p_nome_usuario TEXT,
  p_email_usuario TEXT,
  p_auth_user_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_emitente_json JSONB DEFAULT '{}'::jsonb
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
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, 'starter', p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o perfil de usuário vinculado (PAPEL ADMIN para quem cria)
  INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, ativo)
  VALUES (v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true)
  RETURNING id INTO v_usuario_id;

  -- 3. Criar o vínculo na tabela de multi-empresa
  -- Incluímos explicitamente p_auth_user_id para evitar links órfãos ou nulos
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usuario_vinculos_empresa') THEN
      INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
      VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);
  END IF;

  -- 4. Se houver dados de emitente (CNPJ, endereço, etc), salvar em configuracoes
  IF p_emitente_json IS NOT NULL AND p_emitente_json <> '{}'::jsonb THEN
      INSERT INTO public.configuracoes (empresa_id, chave, valor)
      VALUES (v_empresa_id, 'nfe_emitente', p_emitente_json);
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
