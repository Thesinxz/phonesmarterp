-- ============================================================
-- Migration 066: Soft Delete for Team Members
-- ============================================================
-- Permite excluir um funcionário (esconder da lista) sem quebrar o 
-- histórico de Vendas, OS ou Financeiro vinculado a ele.

-- 1. Adicionar coluna de controle
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS excluido BOOLEAN DEFAULT false;

-- 2. Índice para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_excluido ON public.usuarios(excluido) WHERE excluido = false;

-- 3. Atualizar função de busca de empresa para ignorar excluídos por segurança (opcional)
-- (Já atualizaremos o código do frontend)

-- 4. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
