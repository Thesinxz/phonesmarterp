-- Create history table for tracking Product/IMEI lifecycle
CREATE TABLE IF NOT EXISTS public.produtos_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    tipo_evento TEXT NOT NULL, -- 'criacao', 'venda', 'os_aberta', 'os_finalizada', 'edicao', 'garantia'
    descricao TEXT NOT NULL,
    referencia_id UUID, -- Pode ser ID da tabela vendas ou ordens_servico
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem realizou a acao
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.produtos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver histórico da própria empresa"
    ON public.produtos_historico FOR SELECT
    USING (empresa_id IN (
        SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    ));

CREATE POLICY "Usuários logados podem inserir histórico"
    ON public.produtos_historico FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND empresa_id IN (
        SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    ));

-- Indices for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_produtos_historico_produto_id ON public.produtos_historico(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_historico_empresa_id ON public.produtos_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_historico_created_at ON public.produtos_historico(created_at DESC);
