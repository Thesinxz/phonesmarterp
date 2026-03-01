-- Script SQL para Criação do Módulo Financeiro
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela caixas (Abertura e Fechamento de Turno/Caixa)
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_abertura_id UUID NOT NULL REFERENCES public.usuarios(id),
    usuario_fechamento_id UUID REFERENCES public.usuarios(id),
    data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_fechamento TIMESTAMP WITH TIME ZONE,
    saldo_inicial BIGINT NOT NULL DEFAULT 0,
    saldo_final_esperado BIGINT,
    saldo_final_informado BIGINT,
    diferenca_fechamento BIGINT,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela caixa_movimentacoes (Sangrias, Reforços, Vendas)
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    caixa_id UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    vendedor_id UUID REFERENCES public.usuarios(id), 
    tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'recebimento_os', 'sangria', 'reforco', 'pagamento_despesa')),
    forma_pagamento TEXT NOT NULL, 
    valor_centavos BIGINT NOT NULL,
    observacao TEXT,
    origem_id UUID, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela financeiro_titulos (Contas a Pagar e Receber Integrado)
CREATE TABLE IF NOT EXISTS public.financeiro_titulos (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('pagar', 'receber')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado', 'parcial')),
    descricao TEXT NOT NULL,
    valor_total_centavos BIGINT NOT NULL,
    valor_pago_centavos BIGINT NOT NULL DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    cliente_id UUID REFERENCES public.clientes(id), 
    fornecedor_id UUID REFERENCES public.fornecedores(id), 
    categoria TEXT NOT NULL,
    origem_tipo TEXT, 
    origem_id UUID,
    forma_pagamento_prevista TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela xml_importacoes (Upload e leitura de NFe)
CREATE TABLE IF NOT EXISTS public.xml_importacoes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    chave_acesso TEXT NOT NULL,
    fornecedor_cnpj TEXT,
    fornecedor_nome TEXT,
    valor_total_centavos BIGINT,
    data_emissao DATE,
    status_processamento TEXT DEFAULT 'pendente' CHECK (status_processamento IN ('pendente', 'processado', 'erro')),
    arquivo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_titulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xml_importacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS padrão (isolamento por empresa)
DROP POLICY IF EXISTS "Isolamento Empresa - caixas" ON public.caixas;
CREATE POLICY "Isolamento Empresa - caixas" ON public.caixas FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Isolamento Empresa - caixa_movimentacoes" ON public.caixa_movimentacoes;
CREATE POLICY "Isolamento Empresa - caixa_movimentacoes" ON public.caixa_movimentacoes FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Isolamento Empresa - financeiro_titulos" ON public.financeiro_titulos;
CREATE POLICY "Isolamento Empresa - financeiro_titulos" ON public.financeiro_titulos FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Isolamento Empresa - xml_importacoes" ON public.xml_importacoes;
CREATE POLICY "Isolamento Empresa - xml_importacoes" ON public.xml_importacoes FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Triggers de Updated_At (Opcional, caso você use um trigger padrão)
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.caixas FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.financeiro_titulos FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
