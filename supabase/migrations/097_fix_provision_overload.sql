-- ============================================================
-- Migration 097: Fix provision_new_company Overload (PGRST203)
-- ============================================================
-- O PostgREST não consegue decidir entre múltiplas versões da mesma função.
-- Dropamos TODAS as versões e recriamos a definitiva.

-- 1. Dropar TODAS as versões existentes
DROP FUNCTION IF EXISTS provision_new_company(TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS provision_new_company(TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS provision_new_company(TEXT, TEXT, TEXT, TEXT, UUID, TEXT, JSONB);

-- 2. Recriar a versão definitiva (com units + vinculos)
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
  -- 1. Criar a empresa
  INSERT INTO public.empresas (nome, subdominio, plano, cnpj)
  VALUES (p_nome_empresa, p_subdominio, 'starter', p_cnpj)
  RETURNING id INTO v_empresa_id;

  -- 2. Criar o perfil de usuário (PAPEL ADMIN)
  INSERT INTO public.usuarios (
    empresa_id, auth_user_id, nome, email, papel, ativo, 
    plano, max_empresas, trial_start, trial_end
  )
  VALUES (
    v_empresa_id, p_auth_user_id, p_nome_usuario, p_email_usuario, 'admin', true,
    'starter', 1, now(), now() + INTERVAL '14 days'
  )
  RETURNING id INTO v_usuario_id;

  -- 3. Criar a UNIDADE padrão (Matriz)
  INSERT INTO public.units (empresa_id, name, has_repair_lab, has_parts_stock, has_sales)
  VALUES (v_empresa_id, 'Matriz', true, true, true);

  -- 4. Criar o vínculo oficial na tabela de multi-empresa
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, auth_user_id)
  VALUES (v_usuario_id, v_empresa_id, 'admin', p_auth_user_id);

  -- 5. Inserir configurações iniciais
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

-- 3. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
