-- ==========================================
-- SCRIPT PARA HABILITAR REALTIME (Efeito "Firebase")
-- Execute no SQL Editor do Supabase
-- ==========================================

-- A publicação "supabase_realtime" informa ao Supabase quais tabelas
-- devem disparar eventos em tempo real para os clientes conectados.
-- Vamos garantir que ela exista (por padrão já existe).
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN 
        CREATE PUBLICATION supabase_realtime;
    END IF; 
END $$;

-- Adicionando as tabelas financeiras e de operações para atualização instantânea (Ignorando se já estiverem)
DO $$ 
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.financeiro_titulos; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caixas; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_movimentacoes; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.venda_itens; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ordens_servico; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitacoes; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
