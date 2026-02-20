-- Adicionar token de teste público para checklist de saída via QR Code
ALTER TABLE public.ordens_servico
    ADD COLUMN IF NOT EXISTS token_teste UUID DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS teste_saida_concluido BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS teste_saida_concluido_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índice único para lookup rápido do token
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_token_teste ON public.ordens_servico(token_teste) WHERE token_teste IS NOT NULL;
