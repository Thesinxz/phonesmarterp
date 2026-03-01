import { createClient } from "@/lib/supabase/client";

export interface DreData {
    periodo: string;
    receitaBruta: number;
    impostosDeducoes: number;
    receitaLiquida: number;
    cmv: number;
    lucroBruto: number;
    despesasOperacionais: number;
    lucroLiquido: number;
    margemLiquida: number;
}

export async function getDre(empresaId: string, mes: number, ano: number): Promise<DreData> {
    const supabase = createClient();

    // Configura datas de início e fim do mês
    const dataInicio = new Date(ano, mes - 1, 1).toISOString();
    const dataFim = new Date(ano, mes, 0, 23, 59, 59).toISOString();

    // 1. Receita Bruta (Vendas pagas + Recebimentos de Contas a Receber)
    // Para simplificar, pegamos tudo da tabela `financeiro` que for ENTRADA PAGA neste mês
    // + tudo de `financeiro_titulos` tipo 'receber' status 'pago' nete mês

    let receitaBruta = 0;

    // Entradas antigas / PDV Direto
    const { data: entradasAntigas } = await (supabase
        .from('financeiro')
        .select('valor_centavos')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'entrada')
        .eq('pago', true)
        .gte('vencimento', dataInicio)
        .lte('vencimento', dataFim) as any);

    if (entradasAntigas) {
        receitaBruta += entradasAntigas.reduce((acc: number, curr: any) => acc + (curr.valor_centavos || 0), 0);
    }

    // Entradas Novas (Títulos a Receber Pagos)
    const { data: recebimentos } = await (supabase
        .from('financeiro_titulos')
        .select('valor_pago_centavos')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'receber')
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicio)
        .lte('data_pagamento', dataFim) as any);

    if (recebimentos) {
        receitaBruta += recebimentos.reduce((acc: number, curr: any) => acc + (curr.valor_pago_centavos || 0), 0);
    }

    // 2. Impostos e Deduções (Fixo 0% ou configurável futuramente. Aqui vamos simular 6% do Simples Nacional p/ exemplo se houver config)
    const impostosDeducoes = 0; // Math.round(receitaBruta * 0.06); 
    const receitaLiquida = receitaBruta - impostosDeducoes;

    // 3. CMV (Custo da Mercadoria Vendida)
    // Precisaríamos cruzar vendas feitas no período com o custo_centavos de cada produto.
    // Consulta complexa: buscamos os itens vendidos no mes.
    let cmv = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: itensVendidos, error: cmvError } = await ((supabase as any).rpc('calcular_cmv_periodo', {
        p_empresa_id: empresaId,
        p_data_inicio: dataInicio,
        p_data_fim: dataFim
    }));

    if (!cmvError && itensVendidos && itensVendidos.length > 0) {
        // Se a função não existir no DB, a query falhará.
        // Simulando a soma vinda do RPC:
        cmv = itensVendidos[0].cmv_total_centavos || 0;
    } else {
        // Fallback: buscar vendas e produtos no JS se RPC falhar (ineficiente, mas funciona para MVP)
        const { data: vendasConcluidas } = await (supabase
            .from('vendas')
            .select('id')
            .eq('empresa_id', empresaId)
            .gte('created_at', dataInicio)
            .lte('created_at', dataFim) as any);

        if (vendasConcluidas && vendasConcluidas.length > 0) {
            const vendasIds = vendasConcluidas.map((v: any) => v.id);
            const { data: produtosVendidos } = await (supabase
                .from('venda_itens')
                .select('quantidade, produto_id, produtos(preco_custo_centavos)')
                .in('venda_id', vendasIds) as any);

            if (produtosVendidos) {
                cmv = produtosVendidos.reduce((acc: number, item: any) => {
                    const custo = (item.produtos as any)?.preco_custo_centavos || 0;
                    return acc + (custo * item.quantidade);
                }, 0);
            }
        }
    }

    const lucroBruto = receitaLiquida - cmv;

    // 4. Despesas Operacionais (Contas a Pagar pagas neste mês + Saídas do financeiro antigo)
    let despesasOperacionais = 0;

    const { data: saidasAntigas } = await (supabase
        .from('financeiro')
        .select('valor_centavos')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'saida')
        .eq('pago', true)
        .gte('vencimento', dataInicio)
        .lte('vencimento', dataFim) as any);

    if (saidasAntigas) {
        despesasOperacionais += saidasAntigas.reduce((acc: number, curr: any) => acc + (curr.valor_centavos || 0), 0);
    }

    const { data: despesasPagas } = await (supabase
        .from('financeiro_titulos')
        .select('valor_pago_centavos')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'pagar')
        .eq('status', 'pago')
        .gte('data_pagamento', dataInicio)
        .lte('data_pagamento', dataFim) as any);

    if (despesasPagas) {
        despesasOperacionais += despesasPagas.reduce((acc: number, curr: any) => acc + (curr.valor_pago_centavos || 0), 0);
    }

    // 5. Lucro Líquido
    const lucroLiquido = lucroBruto - despesasOperacionais;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return {
        periodo: `${nomesMeses[mes - 1]} ${ano}`,
        receitaBruta,
        impostosDeducoes,
        receitaLiquida,
        cmv,
        lucroBruto,
        despesasOperacionais,
        lucroLiquido,
        margemLiquida
    };
}
