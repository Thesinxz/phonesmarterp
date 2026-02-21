-- Tabela de Solicitações e Lembretes
CREATE TABLE IF NOT EXISTS public.solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT CHECK (categoria IN ('pedido', 'aviso_cliente', 'lembrete', 'outro')) DEFAULT 'outro',
    prioridade TEXT CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')) DEFAULT 'media',
    status TEXT CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'arquivado')) DEFAULT 'pendente',
    data_vencimento TIMESTAMP WITH TIME ZONE,
    telefone_contato TEXT, -- WhatsApp
    nome_cliente TEXT, -- Novo campo para identificação do cliente
    atribuido_a UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir que colunas novas existam se a tabela já foi criada anteriormente
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS telefone_contato TEXT;
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS nome_cliente TEXT;


-- Habilitar RLS
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuários veem solicitações da própria empresa" ON public.solicitacoes;
DROP POLICY IF EXISTS "Usuários criam solicitações na própria empresa" ON public.solicitacoes;
DROP POLICY IF EXISTS "Usuários atualizam solicitações da própria empresa" ON public.solicitacoes;
DROP POLICY IF EXISTS "Usuários deletam solicitações da própria empresa" ON public.solicitacoes;
DROP POLICY IF EXISTS "Acesso total por empresa" ON public.solicitacoes;

CREATE POLICY "Acesso total por empresa" 
ON public.solicitacoes FOR ALL
USING (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()))
WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()));


-- Timestamp trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_solicitacoes_updated_at ON public.solicitacoes;
CREATE TRIGGER update_solicitacoes_updated_at
    BEFORE UPDATE ON public.solicitacoes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();


-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
