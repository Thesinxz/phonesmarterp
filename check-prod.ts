import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use SERVICE ROLE to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Service Role credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- ADMIN DB CHECK ---');

    // 1. Get first company 
    const { data: empresa } = await supabaseAdmin.from('empresas').select('id, nome, subdominio').limit(1).single();
    if (!empresa) return console.log('No company found.');

    console.log(`Company: ${empresa.nome} (Sub: ${empresa.subdominio})`);

    // 2. Count total products for this company
    const { count: total, error: err1 } = await supabaseAdmin
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id);

    console.log(`Total Products in DB: ${total}`);

    // 3. Count products that MEET vitrine criteria
    const { count: vitrineTotal, error: err2 } = await supabaseAdmin
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .eq('exibir_vitrine', true)
        .gt('estoque_qtd', 0);

    console.log(`Total Products Meeting Vitrine Criteria (estoque > 0 AND exibir_vitrine = true): ${vitrineTotal}`);

    // 4. Let's see 5 recent products
    const { data: recents } = await supabaseAdmin
        .from('produtos')
        .select('id, nome, estoque_qtd, exibir_vitrine')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n5 Most Recent Products:');
    console.table(recents);

    // 5. Let's check the vitrine config
    const { data: config } = await supabaseAdmin
        .from('configuracoes')
        .select('valor')
        .eq('empresa_id', empresa.id)
        .eq('chave', 'vitrine')
        .single();

    console.log('\nVitrine Config:');
    console.dir(config?.valor, { depth: null });
}

check();
