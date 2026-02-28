-- ============================================================
-- Migration 046: Ensure Multi-Company Schema and Trigger Fix
-- ============================================================

-- 1. Garantir que a tabela de vínculos existe (Caso tenha sido pulada)
CREATE TABLE IF NOT EXISTS public.usuario_vinculos_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    papel TEXT NOT NULL DEFAULT 'atendente',
    permissoes_custom_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, empresa_id)
);

-- 2. Garantir que a tabela de convites nativos existe
CREATE TABLE IF NOT EXISTS public.equipe_convites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'atendente',
    permissoes_json JSONB DEFAULT '{}'::jsonb,
    criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    expira_em TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    usado_em TIMESTAMPTZ,
    usado_por UUID
);

-- 3. Recriar Trigger com LOG de erro para facilitar debug futuro
CREATE OR REPLACE FUNCTION public.handle_new_user_invite()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
    v_convite RECORD;
    v_usuario_id UUID;
BEGIN
    -- Log inicial (visível no Supabase Logs / Postgres Logs)
    -- RAISE NOTICE 'handle_new_user_invite disparado para o UID: %', NEW.id;

    IF NEW.raw_user_meta_data ? 'invite_token' THEN
        v_token := (NEW.raw_user_meta_data->>'invite_token')::UUID;
        
        -- Busca o convite
        SELECT * INTO v_convite FROM public.equipe_convites 
        WHERE id = v_token AND usado_em IS NULL AND expira_em > NOW()
        FOR UPDATE;

        IF v_convite.id IS NULL THEN
             RAISE EXCEPTION 'Convite inválido, expirado ou já utilizado (Token: %)', v_token;
        END IF;

        -- INSERT em usuarios
        BEGIN
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

            -- INSERT em vinculos
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json);

            -- UPDATE convite
            UPDATE public.equipe_convites 
            SET usado_em = NOW(), usado_por = NEW.id 
            WHERE id = v_token;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Falha ao vincular usuário à empresa convidada: %', SQLERRM;
        END;

        -- Sucesso!
        RETURN NEW;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Aqui capturamos o erro real (ex: 'table "usuario_vinculos_empresa" does not exist')
        -- e enviamos para o log do PostgreSQL.
        RAISE WARNING 'ERRO NO TRIGGER DE INVITE: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
