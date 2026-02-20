-- Adicionar controle de baixa de estoque em Ordens de Serviço
ALTER TABLE public.ordens_servico 
    ADD COLUMN IF NOT EXISTS estoque_baixado BOOLEAN DEFAULT false;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';
