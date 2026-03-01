-- ============================================================
-- Migration 050: Fix RLS Recursion and Hanging Forever
-- ============================================================

-- 1. Adicionar auth_user_id na tabela de vínculos para evitar JOINs custosos e recursivos
ALTER TABLE public.usuario_vinculos_empresa ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 2. Popular o auth_user_id a partir da tabela de usuários
UPDATE public.usuario_vinculos_empresa uve
SET auth_user_id = u.auth_user_id
FROM public.usuarios u
WHERE uve.usuario_id = u.id AND uve.auth_user_id IS NULL;

-- 3. Criar índice para performance em políticas de RLS
CREATE INDEX IF NOT EXISTS idx_uve_auth_user_id ON public.usuario_vinculos_empresa(auth_user_id);

-- 4. RECRIAR get_my_empresa_id (VERSÃO DEFINITIVA - SEM RECURSÃO)
-- Esta função agora é SECURITY DEFINER e consulta a tabela de VÍNCULOS
-- que terá uma política de RLS extremamente simples ou será consultada sem RLS.
CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Nota: Como esta função é SECURITY DEFINER, ela ignora o RLS da tabela 'usuario_vinculos_empresa'
  -- se o definidor for o dono do schema (postgres). Isso quebra o loop infinito.
  RETURN (
    SELECT empresa_id 
    FROM public.usuario_vinculos_empresa 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1
  );
END;
$$;

-- 5. SIMPLIFICAR POLÍTICA DE VÍNCULOS (Para evitar loops internos)
DROP POLICY IF EXISTS "vinculos_select" ON public.usuario_vinculos_empresa;
CREATE POLICY "vinculos_select" ON public.usuario_vinculos_empresa
  FOR SELECT USING (
    -- Posso ver meus próprios vínculos
    auth_user_id = auth.uid()
  );

-- 6. GARANTIR QUE OS PRODUTOS USAM A NOVA FUNÇÃO
-- (A política 'empresa_isolation' já deve estar usando public.get_my_empresa_id())
-- Mas vamos reforçar a política de produtos para ser o mais simples possível.
DROP POLICY IF EXISTS "empresa_isolation" ON public.produtos;
CREATE POLICY "empresa_isolation" ON public.produtos
  FOR ALL USING (empresa_id = public.get_my_empresa_id());

-- 7. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
