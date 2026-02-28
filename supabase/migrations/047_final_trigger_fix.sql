-- ============================================================
-- Migration 047: Final Protocol for Invites and Multi-Company
-- ============================================================

-- 1. Garantir tabelas base (Seguro para re-execução)
CREATE TABLE IF NOT EXISTS public.usuario_vinculos_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    papel TEXT NOT NULL DEFAULT 'atendente',
    permissoes_custom_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, empresa_id)
);

-- 2. Sincronizar usuários legados que estão em 'usuarios' mas não em 'vinculos'
INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
SELECT id, empresa_id, papel, permissoes_json
FROM public.usuarios
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;

-- 3. Trigger robusto que resolve conflitos de e-mail e metadados
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
    v_meta_token TEXT;
BEGIN
    -- Tentar capturar o token de convite dos metadados (várias chaves possíveis)
    v_meta_token := COALESCE(
        NEW.raw_user_meta_data->>'invite_token',
        NEW.raw_user_meta_data->>'token'
    );

    IF v_meta_token IS NOT NULL THEN
        BEGIN
            v_token := v_meta_token::UUID;
        EXCEPTION WHEN OTHERS THEN
            -- Se não for um UUID válido, ignoramos o fluxo de convite
            RETURN NEW;
        END;
        
        -- Busca o convite na nova tabela
        SELECT * INTO v_convite FROM public.equipe_convites 
        WHERE id = v_token AND usado_em IS NULL AND expira_em > NOW()
        FOR UPDATE;

        IF v_convite.id IS NOT NULL THEN
            -- ESTRATÉGIA DE UPSERT PARA USUÁRIOS:
            -- 1. Verificar se o e-mail já existe (placeholder criado pelo Admin)
            SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = NEW.email LIMIT 1;

            IF v_usuario_id IS NOT NULL THEN
                -- Se já existe o perfil (vazio ou placeholder), apenas atrela o auth_user_id
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
                -- Se não existe, cria um novo perfil
                INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, permissoes_json, ativo)
                VALUES (
                    v_convite.empresa_id, 
                    NEW.id, 
                    COALESCE(NEW.raw_user_meta_data->>'nome', v_convite.nome),
                    NEW.email, 
                    v_convite.papel, 
                    v_convite.permissoes_json, 
                    true
                )
                RETURNING id INTO v_usuario_id;
            END IF;

            -- 2. Garantir o vínculo na tabela multi-empresa
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json)
            ON CONFLICT (usuario_id, empresa_id) 
            DO UPDATE SET papel = EXCLUDED.papel, permissoes_custom_json = EXCLUDED.permissoes_custom_json;

            -- 3. Marcar o convite como usado
            UPDATE public.equipe_convites 
            SET usado_em = NOW(), usado_por = NEW.id 
            WHERE id = v_token;

            -- Sucesso: O usuário está vinculado antes do AuthContext carregar.
            RETURN NEW;
        END IF;
    END IF;

    -- Fluxo sem convite (ou token inválido): Deixamos o AuthContext prover a nova empresa.
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Logamos o erro mas não impedimos o cadastro ( fallback no provision_new_company ).
        RAISE WARNING 'FALHA CRÍTICA NO TRIGGER DE INVITE: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
