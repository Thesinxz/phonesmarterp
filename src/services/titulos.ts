import { createClient } from "@/lib/supabase/client";
import { type FinanceiroTitulo, type Database } from "@/types/database";

const supabase = createClient();

interface TituloFilters {
    status?: FinanceiroTitulo['status'][];
    cliente_id?: string;
    fornecedor_id?: string;
    data_inicio?: string;
    data_fim?: string;
    busca?: string; // Para descricao
}

// 1. Buscar títulos com paginação e filtros
export async function getTitulos(
    empresa_id: string,
    tipo: 'pagar' | 'receber',
    page = 1,
    limit = 50,
    filters?: TituloFilters
) {
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
    if (filters?.cliente_id) {
        query = query.eq("cliente_id", filters.cliente_id);
    }
    if (filters?.fornecedor_id) {
        query = query.eq("fornecedor_id", filters.fornecedor_id);
    }
    if (filters?.data_inicio) {
        query = query.gte("data_vencimento", filters.data_inicio);
    }
    if (filters?.data_fim) {
        query = query.lte("data_vencimento", filters.data_fim);
    }
    if (filters?.busca) {
        query = query.ilike("descricao", `%${filters.busca}%`);
    }

    // Cast bypassing strict types mapping for relations
    const { data, count, error } = await (query as any);

    if (error) throw error;

    return {
        data: data as (FinanceiroTitulo & { clientes?: { nome: string }, fornecedores?: { nome: string } })[],
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
    };
}

// 2. Criar novo título
export async function createTitulo(
    titulo: Database["public"]["Tables"]["financeiro_titulos"]["Insert"]
): Promise<FinanceiroTitulo> {
    const { data, error } = await (supabase.from("financeiro_titulos") as any)
        .insert(titulo)
        .select()
        .single();

    if (error) throw error;
    return data as FinanceiroTitulo;
}

// 3. Atualizar título
export async function updateTitulo(
    id: string,
    updates: Database["public"]["Tables"]["financeiro_titulos"]["Update"]
): Promise<FinanceiroTitulo> {
    const { data, error } = await (supabase.from("financeiro_titulos") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as FinanceiroTitulo;
}

// 4. Excluir/Cancelar título
export async function deleteTitulo(id: string) {
    const { error } = await supabase
        .from("financeiro_titulos")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// 5. Baixar Título (Pagamento Parcial ou Total)
export async function darBaixaTitulo(
    id: string,
    valor_pago_agora_centavos: number,
    data_pagamento: string = new Date().toISOString().split('T')[0]
) {
    // 1. Busca o título atual
    const { data: tituloAtual, error: errBusca } = await (supabase.from("financeiro_titulos") as any)
        .select("*")
        .eq("id", id)
        .single();

    if (errBusca) throw errBusca;

    const novoValorPago = (tituloAtual.valor_pago_centavos || 0) + valor_pago_agora_centavos;
    let novoStatus = 'parcial';

    if (novoValorPago >= tituloAtual.valor_total_centavos) {
        novoStatus = 'pago';
    }

    const { data, error } = await (supabase.from("financeiro_titulos") as any)
        .update({
            valor_pago_centavos: novoValorPago,
            status: novoStatus,
            data_pagamento: novoStatus === 'pago' ? data_pagamento : tituloAtual.data_pagamento
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as FinanceiroTitulo;
}

// 6. Resumo Rápido para Dashboards
export async function getResumoTitulos(empresa_id: string, tipo: 'pagar' | 'receber', filters?: { startDate?: string, endDate?: string }) {
    const hoje = new Date().toISOString().split('T')[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("financeiro_titulos") as any)
        .select("valor_total_centavos, valor_pago_centavos, status, data_vencimento")
        .eq("empresa_id", empresa_id)
        .eq("tipo", tipo);

    if (filters?.startDate) query = query.gte("data_vencimento", filters.startDate);
    if (filters?.endDate) query = query.lte("data_vencimento", filters.endDate);

    const { data, error } = await query;

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
