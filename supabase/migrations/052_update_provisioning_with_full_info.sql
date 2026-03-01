-- ============================================================
-- Migration 052: Update Provisioning with Full Company Info
-- ============================================================

CREATE OR REPLACE FUNCTION provision_new_company(
  p_nome_empresa TEXT,
  p_subdominio TEXT,
  p_nome_usuario TEXT,
  p_email_usuario TEXT,
  p_auth_user_id UUID,
  p_cnpj TEXT DEFAULT NULL,
  p_configs JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  empresa_id UUID,
  usuario_id UUID
) AS $$
DECLARE
  v_empresa_id UUID;
  v_usuario_id UUID;
  v_chave TEXT;
  v_valor JSONB;
BEGIN
  -- 1. Criar a empresa com CNPJ opcional
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, 'starter', p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o perfil de usuário vinculado
  INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, ativo)
  VALUES (v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true)
  RETURNING id INTO v_usuario_id;

  -- 3. Inserir configurações iniciais se fornecidas
  -- p_configs é um objeto onde as chaves são os nomes das configs e os valores são os JSONBs
  IF p_configs IS NOT NULL AND p_configs <> '{}'::jsonb THEN
      FOR v_chave, v_valor IN SELECT * FROM jsonb_each(p_configs)
      LOOP
          INSERT INTO public.configuracoes (empresa_id, chave, valor)
          VALUES (v_empresa_id, v_chave, v_valor)
          ON CONFLICT (empresa_id, chave) DO UPDATE SET valor = EXCLUDED.valor;
      END LOOP;
  END IF;

  RETURN QUERY SELECT v_empresa_id, v_usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
