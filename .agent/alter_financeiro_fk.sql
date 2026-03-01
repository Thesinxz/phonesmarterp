-- ==========================================
-- SCRIPT DE AJUSTE (ALTER TABLE)
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Garante que a tabela 'fornecedores' existe
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Isolamento Empresa - fornecedores" ON public.fornecedores;
CREATE POLICY "Isolamento Empresa - fornecedores" ON public.fornecedores FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- 2. Garante que a coluna 'fornecedor_id' existe (caso tenha sido criada sem ela)
ALTER TABLE IF EXISTS public.financeiro_titulos 
ADD COLUMN IF NOT EXISTS fornecedor_id UUID;

-- 3. Remove a chave estrangeira se ela já existir com outro nome/configuração
ALTER TABLE IF EXISTS public.financeiro_titulos 
DROP CONSTRAINT IF EXISTS financeiro_titulos_fornecedor_id_fkey;

-- 4. Cria a chave estrangeira (Foreign Key) vinculando aos fornecedores
ALTER TABLE IF EXISTS public.financeiro_titulos 
ADD CONSTRAINT financeiro_titulos_fornecedor_id_fkey 
FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;

-- 5. Notifica a API do Supabase (PostgREST) para recarregar o cache do banco
NOTIFY pgrst, 'reload schema';
