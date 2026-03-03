-- ============================================================
-- Migration 067: Fix Empresa Isolation and Invite Trigger
-- ============================================================
-- Garante que todos os funcionários vejam as OS da mesma empresa,
-- corrigindo falhas na propagação do auth_user_id.

-- 1. Sincronizar auth_user_id na tabela de vínculos (Caso tenha ficado NULL)
UPDATE public.usuario_vinculos_empresa uve
SET auth_user_id = u.auth_user_id
FROM public.usuarios u
WHERE uve.usuario_id = u.id 
  AND uve.auth_user_id IS NULL 
  AND u.auth_user_id IS NOT NULL;

-- 2. Atualizar o Trigger de Convite para sempre incluir o auth_user_id no vínculo
CREATE OR REPLACE FUNCTION public.handle_new_user_invite()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_token UUID;
    v_convite RECORD;
    v_usuario_id UUID;
    v_meta_token TEXT;
BEGIN
    v_meta_token := COALESCE(
        NEW.raw_user_meta_data->>'invite_token',
        NEW.raw_user_meta_data->>'token'
    );

    IF v_meta_token IS NOT NULL THEN
        BEGIN
            v_token := v_meta_token::UUID;
        EXCEPTION WHEN OTHERS THEN
            RETURN NEW;
        END;
        
        SELECT * INTO v_convite FROM public.equipe_convites 
        WHERE id = v_token AND usado_em IS NULL AND expira_em > NOW()
        FOR UPDATE;

        IF v_convite.id IS NOT NULL THEN
            SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = NEW.email LIMIT 1;

            IF v_usuario_id IS NOT NULL THEN
                UPDATE public.usuarios 
                SET auth_user_id = NEW.id,
                    empresa_id = v_convite.empresa_id,
                    nome = COALESCE(NEW.raw_user_meta_data->>'nome', nome, v_convite.nome),
                    papel = v_convite.papel,
                    permissoes_json = v_convite.permissoes_json,
                    ativo = true,
                    updated_at = NOW()
                WHERE id = v_usuario_id;
            ELSE
                INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, permissoes_json, ativo)
                VALUES (
                    v_convite.empresa_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'nome', v_convite.nome),
                    COALESCE(NEW.email, v_convite.email), 
                    v_convite.papel, 
                    v_convite.permissoes_json, 
                    true
                )
                RETURNING id INTO v_usuario_id;
            END IF;

            -- CORREÇÃO: Incluir auth_user_id no INSERT do vínculo
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, auth_user_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, NEW.id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json)
            ON CONFLICT (usuario_id, empresa_id) 
            DO UPDATE SET 
                auth_user_id = EXCLUDED.auth_user_id,
                papel = EXCLUDED.papel, 
                permissoes_custom_json = EXCLUDED.permissoes_custom_json;

            UPDATE public.equipe_convites 
            SET usado_em = NOW(), usado_por = NEW.id 
            WHERE id = v_token;

            RETURN NEW;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Reforçar a função get_my_empresa_id para ser mais "tolerante"
-- Se não achar no vínculo com auth_user_id, tenta na tabela usuarios diretamente.
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
    v_empresa_id UUID;
BEGIN
    -- 1. Tenta pelo vínculo (Performance/Multi-empresa)
    SELECT empresa_id INTO v_empresa_id
    FROM public.usuario_vinculos_empresa 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1;

    -- 2. Fallback para tabela usuarios (Legado/Novo cadastro sem vínculo pronto)
    IF v_empresa_id IS NULL THEN
        SELECT empresa_id INTO v_empresa_id
        FROM public.usuarios
        WHERE auth_user_id = auth.uid()
        LIMIT 1;
    END IF;

    RETURN v_empresa_id;
END;
$$;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
