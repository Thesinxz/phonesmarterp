-- ============================================================
-- Migration 064: FINAL STABLE INVITE TRIGGER (Re-assertion)
-- ============================================================
-- Esta migration garante que o trigger de convite esteja 
-- ATIVO no auth.users e que a função lide corretamente com multi-empresa.

-- 1. Re-criar a função com segurança total
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
    -- Capturar o token de convite dos metadados (várias chaves possíveis por segurança)
    v_meta_token := COALESCE(
        NEW.raw_user_meta_data->>'invite_token',
        NEW.raw_user_meta_data->>'token'
    );

    IF v_meta_token IS NOT NULL THEN
        -- Validar se é um UUID
        BEGIN
            v_token := v_meta_token::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Token de convite inválido recebido no metadata: %', v_meta_token;
            RETURN NEW;
        END;
        
        -- Busca o convite (ignora RLS pois o trigger é SECURITY DEFINER)
        SELECT * INTO v_convite FROM public.equipe_convites 
        WHERE id = v_token AND usado_em IS NULL AND expira_em > NOW()
        FOR UPDATE;

        IF v_convite.id IS NOT NULL THEN
            -- 1. Upsert em public.usuarios (busca por email se já existir um perfil placeholder)
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

            -- 2. Garantir vínculo na tabela multi-empresa
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json)
            ON CONFLICT (usuario_id, empresa_id) 
            DO UPDATE SET papel = EXCLUDED.papel, permissoes_custom_json = EXCLUDED.permissoes_custom_json;

            -- 3. Marcar convite como usado
            UPDATE public.equipe_convites 
            SET usado_em = NOW(), usado_por = NEW.id 
            WHERE id = v_token;

            RAISE WARNING 'USUÁRIO VINCULADO COM SUCESSO VIA CONVITE: Token=% UID=% Empresa=%', v_token, NEW.id, v_convite.empresa_id;
            RETURN NEW;
        ELSE
            RAISE WARNING 'Token de convite encontrado no metadata mas inválido/expirado no banco: %', v_token;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Nunca travar o signUp, mas registrar o erro
        RAISE WARNING 'FALHA LETAL NO TRIGGER DE INVITE: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 2. RE-ATIVAR O TRIGGER (Ponto Crítico)
DROP TRIGGER IF EXISTS on_auth_user_created_invite_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_invite_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_invite();

-- 3. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
