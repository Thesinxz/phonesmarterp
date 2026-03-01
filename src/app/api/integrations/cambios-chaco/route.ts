import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic'; // Não cachear a resposta da rota

export async function GET() {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        console.log("Iniciando atualização de câmbio...");

        // 1. Buscar dados da Cambios Chaco (Branch 9 = Adrian Jara)
        const response = await fetch('https://www.cambioschaco.com.py/api/branch_office/9/exchange', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`Erro na API Cambios Chaco: ${response.status}`);
        }

        const data = await response.json();

        // O retorno pode ser um array direto ou um objeto com items. Vamos tratar ambos.
        const items = Array.isArray(data) ? data : (data.items || []);

        // 2. Encontrar cotação do Real (BRL)
        // Procuramos por BRL e usamos o saleArbitrage (Venda por Arbitragem)
        const brlRate = items.find((item: any) => item.isoCode === 'BRL');

        if (!brlRate) {
            throw new Error('Cotação BRL não encontrada na resposta da API');
        }

        const newRate = Number(brlRate.saleArbitrage);

        if (!newRate || isNaN(newRate) || newRate <= 0) {
            console.error("Cotação inválida recebida:", brlRate.saleArbitrage);
            throw new Error(`Valor de cotação inválido recebido: ${brlRate.saleArbitrage}`);
        }

        console.log(`Nova cotação encontrada: ${newRate} (saleArbitrage)`);

        // 3. Atualizar configurações no banco (Para todas as empresas)
        // Primeiro buscamos todas as configs financeiras
        const { data: configs, error: fetchError } = await supabaseAdmin
            .from('configuracoes')
            .select('id, valor, empresa_id')
            .eq('chave', 'financeiro');

        if (fetchError) {
            console.error("Erro ao buscar configs no Supabase:", fetchError);
            throw fetchError;
        }

        let updatedCount = 0;
        const updates = [];

        for (const config of configs) {
            const currentVal = config.valor;
            // Só atualiza se o valor for diferente para evitar writes desnecessários
            if (currentVal.cotacao_dolar_paraguai !== newRate) {
                const newVal = { ...currentVal, cotacao_dolar_paraguai: newRate };

                updates.push(
                    supabaseAdmin
                        .from('configuracoes')
                        .update({
                            valor: newVal,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', config.id)
                );
                updatedCount++;
            }
        }

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            rate: newRate,
            updated_companies: updatedCount,
            source: 'Cambios Chaco (Adrian Jara)',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Erro ao atualizar câmbio:", error.message);

        // Fallback: Tentar buscar a última cotação conhecida no banco para não quebrar o dashboard
        try {
            const { data: config } = await supabaseAdmin
                .from('configuracoes')
                .select('valor')
                .eq('chave', 'financeiro')
                .limit(1)
                .single();

            if (config?.valor?.cotacao_dolar_paraguai) {
                return NextResponse.json({
                    success: false,
                    error: `API Externa Offline (502). Usando última cotação: ${config.valor.cotacao_dolar_paraguai}`,
                    rate: config.valor.cotacao_dolar_paraguai,
                    fallback: true
                });
            }
        } catch (dbErr) {
            console.error("Erro no fallback de banco:", dbErr);
        }

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 200 } // Retornamos 200 para evitar erros críticos no console do cliente
        );
    }
}
