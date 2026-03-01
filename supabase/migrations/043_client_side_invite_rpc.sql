-- ============================================================
-- Migration 043: Create RPC for client-side invite acceptance
-- ============================================================

-- Essa função lida com o novo fluxo de convites (onde o convite vive apenas na URL base64)
-- Ela cria o perfil do usuário diretamente na empresa correta, vinculando-o ao Auth
CREATE OR REPLACE FUNCTION public.aceitar_convite_base64(
    p_empresa_id UUID,
    p_email TEXT,
    p_nome TEXT,
    p_auth_user_id UUID,
    p_papel TEXT,
    p_permissoes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    -- 1. Verifica se já existe um usuário com este auth_id
    SELECT id INTO v_usuario_id FROM public.usuarios WHERE auth_user_id = p_auth_user_id LIMIT 1;

    -- Se não existe, cria o usuário na tabela principal (usuarios)
    IF v_usuario_id IS NULL THEN
        INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, permissoes_json, ativo)
        VALUES (p_empresa_id, p_auth_user_id, p_nome, p_email, p_papel, COALESCE(p_permissoes, '{}'::jsonb), true)
        RETURNING id INTO v_usuario_id;
    ELSE
        -- Se já existir (talvez criado por outro fluxo), apenas atualiza o nome se necessário
        UPDATE public.usuarios SET nome = p_nome WHERE id = v_usuario_id AND nome = 'Convidado';
    END IF;

    -- 2. Garante que exista um vínculo na tabela multi-empresa (usuario_vinculos_empresa)
    IF NOT EXISTS (
        SELECT 1 FROM public.usuario_vinculos_empresa 
        WHERE usuario_id = v_usuario_id AND empresa_id = p_empresa_id
    ) THEN
        INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
        VALUES (v_usuario_id, p_empresa_id, p_papel, COALESCE(p_permissoes, '{}'::jsonb));
    END IF;

    RETURN '{"success": true}'::jsonb;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
