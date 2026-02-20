-- Migration 028: Enable Realtime for Configuracoes Table
-- Ensures the configuracoes table is broadcasted by Supabase Realtime

ALTER TABLE configuracoes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE configuracoes;
