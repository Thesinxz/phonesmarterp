-- Limpa e habilita o Realtime de forma robusta
-- Execute este script no SQL Editor do seu Supabase Dashboard

-- 1. Garante que a publicação padrão existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Habilita Replica Identity FULL para capturar todos os dados em UPDATES
-- Sem isso, às vezes o Supabase não consegue filtrar por ID no realtime
ALTER TABLE ordens_servico REPLICA IDENTITY FULL;
ALTER TABLE produtos REPLICA IDENTITY FULL;
ALTER TABLE vendas REPLICA IDENTITY FULL;
ALTER TABLE clientes REPLICA IDENTITY FULL;
ALTER TABLE os_timeline REPLICA IDENTITY FULL;

-- 3. Adiciona as tabelas à publicação (ignora se já existir)
-- Nota: No Supabase Dashboard, você também pode ir em Database -> Publication -> supabase_realtime e marcar as tabelas.
ALTER PUBLICATION supabase_realtime ADD TABLE ordens_servico;
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE os_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro;
