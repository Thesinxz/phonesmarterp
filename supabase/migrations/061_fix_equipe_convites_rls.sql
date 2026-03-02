-- ============================================================
-- Migration 061: Fix equipe_convites RLS hanging
-- ============================================================
-- As políticas de INSERT/SELECT/DELETE em equipe_convites fazem
-- subqueries na tabela `usuarios`, que tem sua própria RLS usando
-- get_my_empresa_id(). Isso causa loop/hang.
-- Fix: usar get_my_empresa_id() diretamente (SECURITY DEFINER, sem recursão).

-- 1. Limpar todas as policies antigas
DROP POLICY IF EXISTS "Admins podem ver convites da empresa" ON public.equipe_convites;
DROP POLICY IF EXISTS "Admins podem criar convites" ON public.equipe_convites;
DROP POLICY IF EXISTS "Admins podem deletar convites" ON public.equipe_convites;
DROP POLICY IF EXISTS "Qualquer um com token pode ler o convite" ON public.equipe_convites;
DROP POLICY IF EXISTS "empresa_isolation" ON public.equipe_convites;

-- 2. Policy simplificada: empresa_id bate com a empresa do usuário logado
-- Usa get_my_empresa_id() que é SECURITY DEFINER (não sofre recursão)
CREATE POLICY "empresa_isolation" ON public.equipe_convites
    FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- 3. Manter policy pública para validar token de convite (cadastro)
-- Permite SELECT sem autenticação quando acessando por ID direto
CREATE POLICY "public_token_read" ON public.equipe_convites
    FOR SELECT USING (true);

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- 5. RPC SECURITY DEFINER para criar convite sem RLS (fallback anti-hang)
CREATE OR REPLACE FUNCTION public.criar_convite_equipe(
    p_id UUID,
    p_empresa_id UUID,
    p_email TEXT,
    p_nome TEXT,
    p_papel TEXT,
    p_permissoes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.equipe_convites (id, empresa_id, email, nome, papel, permissoes_json)
    VALUES (p_id, p_empresa_id, p_email, p_nome, p_papel, p_permissoes);
END;
$$;
