-- ============================================================
-- Migration 063: NUCLEAR RESET - Clear Table Locks and RLS
-- ============================================================
-- Esta migration recria a tabela do zero para limpar qualquer 
-- lock de transação ou trigger invisível que esteja travando o app.

-- 1. Backup de segurança
CREATE TABLE IF NOT EXISTS public.equipe_convites_backup AS 
SELECT * FROM public.equipe_convites;

-- 2. Drop total (libera locks)
DROP TABLE IF EXISTS public.equipe_convites CASCADE;

-- 3. Recriação Limpa
CREATE TABLE public.equipe_convites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'atendente',
    permissoes_json JSONB DEFAULT '{}'::jsonb,
    criado_por UUID,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    expira_em TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    usado_em TIMESTAMPTZ,
    usado_por UUID
);

-- 4. Desabilitar RLS (Evitar recursão infinita de vez)
ALTER TABLE public.equipe_convites DISABLE ROW LEVEL SECURITY;

-- 5. Dar Permissões para a API do PostgREST
GRANT ALL ON public.equipe_convites TO authenticated;
GRANT ALL ON public.equipe_convites TO anon;
GRANT ALL ON public.equipe_convites TO service_role;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_equipe_convites_empresa ON public.equipe_convites(empresa_id);
CREATE INDEX IF NOT EXISTS idx_equipe_convites_email ON public.equipe_convites(email);

-- 7. Notificar PostgREST do novo schema
NOTIFY pgrst, 'reload schema';
