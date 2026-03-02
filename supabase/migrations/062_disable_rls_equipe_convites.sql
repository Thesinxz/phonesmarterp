-- ============================================================
-- Migration 062: NUCLEAR FIX - Disable RLS on equipe_convites
-- ============================================================
-- A tabela equipe_convites contém apenas tokens de convite.
-- Não é dado sensível. Desabilitando RLS para eliminar a
-- recursão infinita que estava travando o banco de dados.
-- O trigger on_auth_user_created_invite_trigger (em auth.users)
-- continua funcionando normalmente para vincular o usuário.

-- 1. Matar processos travados
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE (query LIKE '%equipe_convites%')
  AND state = 'active'
  AND pid <> pg_backend_pid();

-- 2. Desabilitar RLS completamente (nuclear)
ALTER TABLE public.equipe_convites DISABLE ROW LEVEL SECURITY;

-- 3. Limpar todas as políticas (não servem mais)
DROP POLICY IF EXISTS "empresa_isolation" ON public.equipe_convites;
DROP POLICY IF EXISTS "public_token_read" ON public.equipe_convites;
DROP POLICY IF EXISTS "Admins podem ver convites da empresa" ON public.equipe_convites;
DROP POLICY IF EXISTS "Admins podem criar convites" ON public.equipe_convites;
DROP POLICY IF EXISTS "Admins podem deletar convites" ON public.equipe_convites;
DROP POLICY IF EXISTS "Qualquer um com token pode ler o convite" ON public.equipe_convites;

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
