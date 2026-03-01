-- Migração para suporte ao Wizard de Nova OS Inteligente
ALTER TABLE public.ordens_servico 
    ADD COLUMN IF NOT EXISTS tipo_equipamento TEXT DEFAULT 'celular',
    ADD COLUMN IF NOT EXISTS marca_equipamento TEXT,
    ADD COLUMN IF NOT EXISTS modelo_equipamento TEXT,
    ADD COLUMN IF NOT EXISTS cor_equipamento TEXT,
    ADD COLUMN IF NOT EXISTS imei_equipamento TEXT,
    ADD COLUMN IF NOT EXISTS numero_serie TEXT,
    ADD COLUMN IF NOT EXISTS acessorios_recebidos JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS foto_entrada_url TEXT,
    ADD COLUMN IF NOT EXISTS problemas_tags TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS observacoes_internas TEXT,
    ADD COLUMN IF NOT EXISTS pecas_json JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS mao_obra_json JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS desconto_centavos INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS desconto_motivo TEXT,
    ADD COLUMN IF NOT EXISTS valor_entrada_centavos INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS senha_dispositivo TEXT,
    ADD COLUMN IF NOT EXISTS prazo_estimado TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS status_rascunho BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parcelamento INTEGER DEFAULT 1;

-- Comentários para documentação
COMMENT ON COLUMN public.ordens_servico.tipo_equipamento IS 'celular, tablet, notebook, smartwatch, acessorio, outro';
COMMENT ON COLUMN public.ordens_servico.acessorios_recebidos IS 'Lista de acessórios deixados pelo cliente';
COMMENT ON COLUMN public.ordens_servico.pecas_json IS 'Lista de peças utilizadas: [{produto_id, nome, qtd, custo, venda}]';
COMMENT ON COLUMN public.ordens_servico.mao_obra_json IS 'Lista de serviços realizados: [{descricao, valor}]';
COMMENT ON COLUMN public.ordens_servico.prazo_estimado IS 'Data e hora prometida para entrega';
