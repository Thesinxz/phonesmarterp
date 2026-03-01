-- Adicionar coluna senha_tipo para distinguir entre PIN/Texto e Padrão (Desenho)
ALTER TABLE public.ordens_servico 
    ADD COLUMN IF NOT EXISTS senha_tipo TEXT DEFAULT 'texto';

-- Refresh do cache do PostgREST
NOTIFY pgrst, 'reload schema';
