-- ============================================================
-- ☢️ SMART OS - TOTAL RESET RESILIENTE ☢️
-- Limpa todas as tabelas identificadas, mas ignora as que não existem.
-- ============================================================

DO $$ 
DECLARE
    tab_name TEXT;
    all_tabs TEXT[] := ARRAY[
        'empresas', 'usuarios', 'configuracoes', 'clientes', 'equipamentos', 
        'ordens_servico', 'os_timeline', 'vendas', 'venda_itens', 'financeiro', 
        'tecnicos', 'audit_logs', 'produtos', 'catalog_items', 'brands', 
        'pricing_segments', 'payment_gateways', 'product_types', 'units', 
        'unit_stock', 'stock_movements', 'os_unit_transfers', 'part_compatibility', 
        'os_parts', 'notifications', 'catalogo_equipamentos_publico', 
        'pecas_catalogo', 'os_checklist_saida', 'invite_logs', 'vencimentos_planos'
    ];
BEGIN
    FOR tab_name IN SELECT unnest(all_tabs) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tab_name AND table_schema = 'public') THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tab_name);
            RAISE NOTICE 'Tabela % limpa com sucesso.', tab_name;
        END IF;
    END LOOP;
END $$;

-- 2. REINICIAR SEQUÊNCIAS
ALTER SEQUENCE IF EXISTS os_numero_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS vendas_numero_seq RESTART WITH 1;

-- 3. LIMPEZA OPCIONAL DE AUTENTICAÇÃO (SUPABASE AUTH)
-- Execute o comando abaixo no painel SQL para apagar também os Logins (E-mail/Senha):
-- DELETE FROM auth.users;

-- ============================================================
-- INSTRUÇÕES:
-- 1. Execute este script no SQL Editor do Supabase.
-- 2. Se quiser zerar os LOGINS também, rode "DELETE FROM auth.users;".
-- 3. Volte para a página inicial do App e faça um novo Registro.
-- ============================================================
