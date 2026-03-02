-- ============================================================
-- Migration 059: Fix Produto Deletion vs Venda Itens
-- ============================================================

-- Permite excluir produtos mesmo que existam vendas associadas (mesmo canceladas).
-- Isso altera o comportamento da chave estrangeira para "SET NULL",
-- mantendo o registro da venda mas desvinculando do produto excluído.

DO $$
BEGIN
    -- 1. Remover a constraint antiga (que bloqueia o DELETE)
    ALTER TABLE public.venda_itens DROP CONSTRAINT IF EXISTS venda_itens_produto_id_fkey;
    
    -- 2. Adicionar a nova constraint com ON DELETE SET NULL
    ALTER TABLE public.venda_itens 
    ADD CONSTRAINT venda_itens_produto_id_fkey 
    FOREIGN KEY (produto_id) 
    REFERENCES public.produtos(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Constraint venda_itens_produto_id_fkey alterada para ON DELETE SET NULL';
END $$;

-- 3. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
