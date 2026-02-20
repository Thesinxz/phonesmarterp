-- Migration 017: Adiciona novos campos detalhados para produtos

-- 1. condicao: estado geral do aparelho ou peça
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'novo_lacrado' CHECK (condicao IN ('novo_lacrado', 'seminovo', 'usado', 'defeito', 'peca_reposicao', 'outro'));

-- 2. saude_bateria: percentual (apenas para aparelhos Apple, etc)
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS saude_bateria INTEGER DEFAULT NULL;

-- 3. memoria_ram: para smartphones/tablets/pcs
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS memoria_ram TEXT DEFAULT NULL;

-- 4. imagem_url: link do bucket (storage) da foto principal
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS imagem_url TEXT DEFAULT NULL;

-- 5. exibir_vitrine: flag para a loja pública (default true)
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS exibir_vitrine BOOLEAN DEFAULT TRUE;

-- 6. sku: código interno da loja, útil para geração em massa manual (se n tiver barras)
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT NULL;

-- Indice para melhorar queries de vitrine
CREATE INDEX IF NOT EXISTS idx_produtos_vitrine ON public.produtos(empresa_id, exibir_vitrine, estoque_qtd) WHERE exibir_vitrine = true;
