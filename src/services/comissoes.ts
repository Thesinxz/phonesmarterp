import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";

const supabase = createClient();

export interface ComissaoFiltros {
    tecnico_id?: string;
    mes?: number;
    ano?: number;
}

export async function getRelatorioComissoes(filtros: ComissaoFiltros) {
    const { mes = new Date().getMonth() + 1, ano = new Date().getFullYear(), tecnico_id } = filtros;

    const startDate = new Date(ano, mes - 1, 1).toISOString();
    const endDate = new Date(ano, mes, 0, 23, 59, 59).toISOString();

    // 1. Buscar Técnicos
    let tecnicosQuery = supabase
        .from("tecnicos")
        .select(`
            id,
            comissao_pct,
            usuario:usuarios(nome)
        `)
        .eq("ativo", true);

    if (tecnico_id) {
        tecnicosQuery = tecnicosQuery.eq("id", tecnico_id);
    }

    const { data: tecnicos, error: errTecnicos } = await tecnicosQuery as { data: any[]; error: any };
    if (errTecnicos) throw errTecnicos;

    // 2. Buscar OS Finalizadas/Entregues no período
    const { data: ordens, error: errOS } = await supabase
        .from("ordens_servico")
        .select(`
            id,
            numero,
            valor_total_centavos,
            pecas_json,
            tecnico_id,
            status,
            updated_at
        `)
        .in("status", ["finalizada", "entregue"])
        .gte("updated_at", startDate)
        .lte("updated_at", endDate) as { data: any[]; error: any };

    if (errOS) throw errOS;

    // 3. Processar Relatório
    const relatorio = tecnicos.map(t => {
        const osDoTecnico = ordens.filter(os => os.tecnico_id === t.id);

        let totalProduzido = 0;
        let totalCustoPecas = 0;
        let totalComissao = 0;

        const detalhes = osDoTecnico.map(os => {
            let custoPecas = 0;
            if (os.pecas_json && Array.isArray(os.pecas_json)) {
                custoPecas = os.pecas_json.reduce((acc: number, p: any) => acc + (p.custo || 0) * (p.qtd || 1), 0);
            }

            const lucroBruto = os.valor_total_centavos - custoPecas;
            const valorComissao = Math.round(lucroBruto * (t.comissao_pct / 100));

            totalProduzido += os.valor_total_centavos;
            totalCustoPecas += custoPecas;
            totalComissao += valorComissao;

            return {
                id: os.id,
                numero: os.numero,
                valorTotal: os.valor_total_centavos,
                custoPecas,
                lucroBruto,
                valorComissao,
                status: os.status,
                data: os.updated_at
            };
        });

        return {
            tecnicoId: t.id,
            nome: (t.usuario as any)?.nome || "Desconhecido",
            comissaoPct: t.comissao_pct,
            totalOS: osDoTecnico.length,
            totalProduzido,
            totalCustoPecas,
            lucroLiquido: totalProduzido - totalCustoPecas,
            totalComissao,
            detalhes
        };
    });

    return relatorio;
}
