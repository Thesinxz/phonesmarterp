import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("URL:", supabaseUrl);

    const { data: tData, error: tErr } = await supabase
        .from('financeiro_titulos')
        .select('*, cliente:clientes(*), fornecedor_id(nome)')
        .limit(1);

    console.log("financeiro_titulos:", { tData, tErr });

    const { data: cxData, error: cxErr } = await supabase
        .from('caixas')
        .select('*, usuario:usuarios!caixas_usuario_abertura_id_fkey(nome), caixas_movimentacoes(*)')
        .limit(1);

    console.log("caixas:", { cxData, cxErr });

    const { data: cmv, error: cmvError } = await supabase.rpc('calcular_cmv_periodo', {
        p_empresa_id: 'f3861ab5-d553-4bd7-984e-0462a91f954e',
        p_data_inicio: '2025-01-01',
        p_data_fim: '2025-12-31'
    });

    console.log("calcular_cmv_periodo:", { data: cmv, error: cmvError });
}

test();
