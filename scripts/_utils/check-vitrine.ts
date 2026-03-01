import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVitrine() {
    console.log('--- Checking Vitrine Query ---');

    // 1. Get first company (assuming the user is testing with the primary company)
    const { data: empresa } = await supabase.from('empresas').select('*').limit(1).single();

    if (!empresa) {
        console.log('No company found.');
        return;
    }

    console.log(`Company found: ${empresa.nome} (Subdominio: ${empresa.subdominio})`);

    // 2. Query products exactly as the API does
    const { data: produtos, error: prodError } = await supabase
        .from('produtos')
        .select('id, nome, categoria, preco_venda_centavos, estoque_qtd, exibir_vitrine')
        .eq('empresa_id', empresa.id)
        .eq('exibir_vitrine', true)
        .gt('estoque_qtd', 0);

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    console.log(`\nTotal products matching Vitrine criteria: ${produtos?.length || 0}`);

    if (produtos && produtos.length > 0) {
        console.table(produtos.slice(0, 10)); // Show top 10
    } else {
        // If 0, let's see ALL products to find why they are excluded
        console.log('\n--- Checking why products are excluded ---');
        const { data: allProd } = await supabase
            .from('produtos')
            .select('id, nome, estoque_qtd, exibir_vitrine')
            .eq('empresa_id', empresa.id)
            .limit(5);

        console.log('Sample of all products in DB regardless of vitrine status:');
        console.table(allProd);
    }
}

checkVitrine();
