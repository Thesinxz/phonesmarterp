-- ============================================================
-- Migration 039: Implement claim_user_profile RPC and fix team linking
-- ============================================================

-- 1. Cria a RPC utilizada pelo AuthContext e Cadastro para reivindicar perfis
CREATE OR REPLACE FUNCTION public.claim_user_profile(p_email_usuario TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id UUID;
    v_empresa_id UUID;
    v_papel TEXT;
    v_permissoes JSONB;
    v_auth_uid UUID;
BEGIN
    v_auth_uid := auth.uid();

    IF v_auth_uid IS NULL THEN
        RETURN '{"success": false, "error": "Usuário não autenticado no Supabase Auth"}'::jsonb;
    END IF;

    -- Tentar encontrar um registro de convite pendente para este e-mail
    SELECT id, empresa_id, papel, permissoes_json
    INTO v_usuario_id, v_empresa_id, v_papel, v_permissoes
    FROM public.usuarios
    WHERE email = p_email_usuario 
      AND auth_user_id IS NULL
    LIMIT 1;

    IF v_usuario_id IS NOT NULL THEN
        -- 1. Vincula o auth_user_id ao registro principal
        UPDATE public.usuarios
        SET auth_user_id = v_auth_uid,
            updated_at = NOW()
        WHERE id = v_usuario_id;
        
        -- 2. Garante que exista um vínculo na tabela multi-empresa (usuario_vinculos_empresa)
        IF NOT EXISTS (
            SELECT 1 FROM public.usuario_vinculos_empresa 
            WHERE usuario_id = v_usuario_id AND empresa_id = v_empresa_id
        ) THEN
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, v_empresa_id, v_papel, COALESCE(v_permissoes, '{}'::jsonb));
        END IF;

        RETURN '{"success": true}'::jsonb;
    END IF;

    RETURN '{"success": false, "error": "Nenhum perfil de convite pendente encontrado"}'::jsonb;
END;
$$;

-- 2. Consertar a RPC vincular_usuario_equipe para apontar para a tabela correta
-- A migration 032 usava `empresa_vinculos` em vez de `usuario_vinculos_empresa`
CREATE OR REPLACE FUNCTION public.vincular_usuario_equipe(
  p_id_empresa UUID,
  p_email TEXT,
  p_nome TEXT,
  p_papel TEXT,
  p_permissoes JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Verificar se já existe vínculo
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_vinculos_empresa ev
    JOIN public.usuarios u ON ev.usuario_id = u.id
    WHERE ev.empresa_id = p_id_empresa AND u.email = p_email
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'Usuário já está vinculado a esta equipe.';
  END IF;

  -- Buscar usuário existente por email
  SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = p_email LIMIT 1;

  -- Se não existir, criar usuário placeholder (auth_user_id nulo)
  IF v_usuario_id IS NULL THEN
    INSERT INTO public.usuarios (empresa_id, email, nome, papel, permissoes_json, ativo)
    VALUES (p_id_empresa, p_email, p_nome, p_papel, COALESCE(p_permissoes, '{}'::jsonb), true)
    RETURNING id INTO v_usuario_id;
  END IF;

  -- Criar o vínculo usando a tabela correta
  INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
  VALUES (v_usuario_id, p_id_empresa, p_papel, COALESCE(p_permissoes, '{}'::jsonb));

  RETURN v_usuario_id;
END;
$$;

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
