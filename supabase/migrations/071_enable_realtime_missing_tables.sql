-- Migration 071: Enable Realtime for missing tables
-- Execute este script no SQL Editor do seu Supabase Dashboard

-- 1. Garante que a publicação padrão existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Habilita Replica IDENTITY FULL para tabelas que precisam de realtime
-- Isso garante que UPDATES e DELETES enviem o payload completo
ALTER TABLE IF EXISTS configuracoes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS solicitacoes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS financeiro_titulos REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS caixas REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS caixa_movimentacoes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS usuarios REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS ordens_servico REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS produtos REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS vendas REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS clientes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS os_timeline REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS financeiro REPLICA IDENTITY FULL;

-- 3. Adiciona TODAS as tabelas necessárias à publicação supabase_realtime
-- O formato usando relname in (...) evita erros caso a tabela já esteja lá em algumas versões antigas, 
-- mas a forma mais robusta no Postgres 15+ é apenas adicionar e tratar exceções ou fazer via DO block.

DO $$
DECLARE
    t_name text;
    tables_to_add text[] := ARRAY[
        'configuracoes',
        'solicitacoes',
        'financeiro_titulos',
        'caixas',
        'caixa_movimentacoes',
        'usuarios',
        'ordens_servico',
        'produtos',
        'vendas',
        'clientes',
        'os_timeline',
        'financeiro'
    ];
BEGIN
    FOR t_name IN SELECT unnest(tables_to_add)
    LOOP
        -- Verifica se a tabela existe
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            -- Tenta adicionar a tabela à publicação (vai dar exception se já estiver, o que é seguro capturar)
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t_name);
            EXCEPTION WHEN OTHERS THEN
                -- Se der erro (ex: já está na publicação), apenas ignora e continua
                NULL;
            END;
        END IF;
    END LOOP;
END $$;
