-- ============================================================
-- Migration 044: Native Invite System (Auth Trigger)
-- ============================================================

-- 1. Cria a tabela de convites
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_equipe_convites_empresa ON public.equipe_convites(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipe_convites_email ON public.equipe_convites(email);

-- Segurança (RLS) para a tabela de convites
ALTER TABLE public.equipe_convites ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Admins podem ver convites da empresa" ON public.equipe_convites;
CREATE POLICY "Admins podem ver convites da empresa" ON public.equipe_convites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuario_vinculos_empresa
            WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente')
        )
    );

DROP POLICY IF EXISTS "Qualquer um com token pode ler o convite" ON public.equipe_convites;
CREATE POLICY "Qualquer um com token pode ler o convite" ON public.equipe_convites FOR SELECT
    USING (usado_em IS NULL AND expira_em > NOW());

DROP POLICY IF EXISTS "Admins podem criar convites" ON public.equipe_convites;
CREATE POLICY "Admins podem criar convites" ON public.equipe_convites FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuario_vinculos_empresa
            WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente')
        )
    );

DROP POLICY IF EXISTS "Admins podem deletar convites" ON public.equipe_convites;
CREATE POLICY "Admins podem deletar convites" ON public.equipe_convites FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.usuario_vinculos_empresa
            WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
            AND empresa_id = public.equipe_convites.empresa_id
            AND papel IN ('admin', 'gerente')
        )
    );

-- ============================================================
-- 2. FUNÇÃO E TRIGGER NA TABELA AUTH.USERS
-- ============================================================
-- Esta função será executada pelo Supabase DENTRO da mesma transação
-- quando um novo usuário for criado (auth.signUp).
-- Ela confere o `raw_user_meta_data`, extrai o 'invite_token', valida e atrela à empresa.

CREATE OR REPLACE FUNCTION public.handle_new_user_invite()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
    v_convite RECORD;
    v_empresa_id UUID;
    v_usuario_id UUID;
BEGIN
    -- 1. Verifica se existe um token de convite no metadata do Supabase signUp options
    -- Quando chamarmos signUp() no frontend, passaremos:
    -- options: { data: { invite_token: "UUID" } }
    IF NEW.raw_user_meta_data ? 'invite_token' THEN
        -- O cast aqui ignora as aspas duplas do JSON
        v_token := (NEW.raw_user_meta_data->>'invite_token')::UUID;
        
        -- Busca o convite se for válido
        SELECT * INTO v_convite FROM public.equipe_convites 
        WHERE id = v_token AND usado_em IS NULL AND expira_em > NOW()
        FOR UPDATE; -- Lock na linha para evitar uso duplicado concorrente

        -- Se o convite for válido, prossegue com o cadastro
        IF v_convite.id IS NOT NULL THEN
            
            -- Cria o usuário principal (public.usuarios)
            INSERT INTO public.usuarios (empresa_id, auth_user_id, nome, email, papel, permissoes_json, ativo)
            VALUES (
                v_convite.empresa_id, 
                NEW.id, 
                COALESCE(NEW.raw_user_meta_data->>'nome', v_convite.nome), -- Usa nome do metadata do signup ou do convite
                COALESCE(NEW.email, v_convite.email), 
                v_convite.papel, 
                v_convite.permissoes_json, 
                true
            )
            RETURNING id INTO v_usuario_id;

            -- Cria o vínculo multi-empresa
            INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
            VALUES (v_usuario_id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json);

            -- Marca o convite como usado
            UPDATE public.equipe_convites 
            SET usado_em = NOW(), usado_por = NEW.id 
            WHERE id = v_token;

            -- O convite foi processado com sucesso e o usuário vinculado.
            RETURN NEW;
        END IF;
    END IF;

    -- Se (A) Não tem invite_token OU (B) O convite é inválido/expirado,
    -- Simplesmente deixamos a transação continuar. O AuthContext tratará usuários sem vínculo
    -- chamando a provision_new_company (fluxo padrão).
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro letal, evitamos derrubar o signUp. 
        -- Logamos no postgres, mas permitimos criar o auth.user de qualquer forma.
        -- O front vai cair na auto-provisão, ou o Admin convida de novo.
        RAISE WARNING 'Falha fatal no Trigger de Invite: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Aplica o Trigger na tabela de auth
DROP TRIGGER IF EXISTS on_auth_user_created_invite_trigger ON auth.users;
CREATE TRIGGER on_auth_user_created_invite_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_invite();

-- NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
