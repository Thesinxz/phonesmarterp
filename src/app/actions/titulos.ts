"use server";

import { createClient } from "@/lib/supabase/server";
import { type FinanceiroTitulo } from "@/types/database";

export async function getTitulosServer(
    empresa_id: string,
    tipo: 'pagar' | 'receber',
    page = 1,
    limit = 100,
    filters?: any
) {
    const supabase = await createClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("financeiro_titulos")
        .select(`
            *,
            clientes ( nome ),
            fornecedores:fornecedor_id ( nome ) 
        `, { count: "exact" })
        .eq("empresa_id", empresa_id)
        .eq("tipo", tipo)
        .order("data_vencimento", { ascending: true })
        .range(from, to);

    if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
    }
    if (filters?.busca) {
        query = query.ilike("descricao", `%${filters.busca}%`);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
        data: data || [],
        count: count || 0
    };
}

export async function getResumoTitulosServer(empresa_id: string, tipo: 'pagar' | 'receber') {
    const supabase = await createClient();
    const hoje = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from("financeiro_titulos")
        .select("valor_total_centavos, valor_pago_centavos, status, data_vencimento")
        .eq("empresa_id", empresa_id)
        .eq("tipo", tipo);

    if (error) throw error;

    let atrasado = 0;
    let vencendoHoje = 0;
    let aVencer = 0;
    let recebidoPagoMensal = 0;

    data?.forEach((t: any) => {
        const saldoPendente = t.valor_total_centavos - (t.valor_pago_centavos || 0);

        if (t.status === 'pago') {
            recebidoPagoMensal += t.valor_total_centavos;
        } else if (t.status === 'pendente' || t.status === 'parcial' || t.status === 'atrasado') {
            if (t.data_vencimento < hoje) {
                atrasado += saldoPendente;
            } else if (t.data_vencimento === hoje) {
                vencendoHoje += saldoPendente;
            } else {
                aVencer += saldoPendente;
            }
        }
    });

    return {
        atrasado,
        vencendoHoje,
        aVencer,
        recebidoPagoMensal,
        totalAberto: atrasado + vencendoHoje + aVencer
    };
}
