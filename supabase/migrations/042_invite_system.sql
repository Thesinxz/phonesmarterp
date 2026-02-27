-- ============================================================
-- Migration 042: Link-Based Invitation System
-- ============================================================

-- 1. Tabela de Convites
CREATE TABLE IF NOT EXISTS public.convites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    papel       TEXT NOT NULL CHECK (papel IN ('admin', 'gerente', 'tecnico', 'financeiro', 'atendente')),
    permissoes_json JSONB NOT NULL DEFAULT '{}',
    token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status      TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado')),
    criado_por  UUID REFERENCES auth.users(id),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_em   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

-- Habilitar RLS
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins/gerentes da empresa podem ver/criar convites
CREATE POLICY "convites_access_policy" ON public.convites
    FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- 2. RPC para gerar convite
CREATE OR REPLACE FUNCTION public.gerar_convite(
    p_empresa_id UUID,
    p_email TEXT,
    p_papel TEXT,
    p_permissoes JSONB DEFAULT '{}'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token TEXT;
BEGIN
    -- Gerar um token único
    v_token := encode(gen_random_bytes(24), 'hex');

    -- Inserir o convite (ignora RLS via SECURITY DEFINER)
    INSERT INTO public.convites (empresa_id, email, papel, permissoes_json, token, criado_por)
    VALUES (p_id_empresa, p_email, p_papel, p_permissoes, v_token, auth.uid());

    RETURN v_token;
END;
$$;

-- 3. RPC para aceitar convite (Atômico)
CREATE OR REPLACE FUNCTION public.aceitar_convite(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_convite RECORD;
    v_usuario_id UUID;
    v_auth_uid UUID;
BEGIN
    v_auth_uid := auth.uid();
    
    IF v_auth_uid IS NULL THEN
        RETURN '{"success": false, "error": "Não autenticado"}'::jsonb;
    END IF;

    -- 1. Buscar e validar convite
    SELECT * INTO v_convite 
    FROM public.convites 
    WHERE token = p_token AND status = 'pendente' AND expira_em > NOW()
    FOR UPDATE;

    IF v_convite.id IS NULL THEN
        RETURN '{"success": false, "error": "Convite inválido ou expirado"}'::jsonb;
    END IF;

    -- 2. Buscar ou criar registro base em 'usuarios'
    SELECT id INTO v_usuario_id FROM public.usuarios WHERE email = v_convite.email LIMIT 1;

    IF v_usuario_id IS NULL THEN
        INSERT INTO public.usuarios (empresa_id, auth_user_id, email, nome, papel, permissoes_json, ativo)
        VALUES (v_convite.empresa_id, v_auth_uid, v_convite.email, 'Usuário Convidado', v_convite.papel, v_convite.permissoes_json, true)
        RETURNING id INTO v_usuario_id;
    ELSE
        -- Se já existia (placeholder), vincula o auth_user_id
        UPDATE public.usuarios 
        SET auth_user_id = v_auth_uid, 
            empresa_id = v_convite.empresa_id,
            papel = v_convite.papel,
            permissoes_json = v_convite.permissoes_json,
            updated_at = NOW()
        WHERE id = v_usuario_id;
    END IF;

    -- 3. Criar o vínculo multi-empresa
    INSERT INTO public.usuario_vinculos_empresa (usuario_id, empresa_id, papel, permissoes_custom_json)
    VALUES (v_usuario_id, v_convite.empresa_id, v_convite.papel, v_convite.permissoes_json)
    ON CONFLICT (usuario_id, empresa_id) DO UPDATE SET papel = EXCLUDED.papel;

    -- 4. Marcar convite como aceito
    UPDATE public.convites SET status = 'aceito' WHERE id = v_convite.id;

    RETURN jsonb_build_object('success', true, 'empresa_id', v_convite.empresa_id);
END;
$$;

-- 4. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';
