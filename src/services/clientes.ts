import { createClient } from "@/lib/supabase/client";
import { type Cliente, type Database } from "@/types/database";

// Instância para uso no client-side (para server components use o createServerClient)
const supabase = createClient();

export interface ClienteFilters {
    search?: string;
    segmento?: string;
    empresa_id?: string;
}

export async function getClientes(page = 1, limit = 10, filters?: ClienteFilters) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (filters?.empresa_id) {
        query = query.eq("empresa_id", filters.empresa_id);
    }

    if (filters?.search) {
        const cleanSearch = filters.search.trim().replace(/\s+/g, "%");
        query = query.or(`nome.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,cpf_cnpj.ilike.%${cleanSearch}%`);
    }

    if (filters?.segmento) {
        query = query.eq("segmento", filters.segmento);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
        data: data as Cliente[],
        count,
        totalPages: count ? Math.ceil(count / limit) : 0,
    };
}

export async function getClienteById(id: string) {
    const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Cliente;
}

export async function createCliente(cliente: Database["public"]["Tables"]["clientes"]["Insert"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("clientes") as any)
        .insert(cliente)
        .select()
        .single();

    if (error) throw error;
    return data as Cliente;
}

export async function updateCliente(id: string, cliente: Database["public"]["Tables"]["clientes"]["Update"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("clientes") as any)
        .update(cliente)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Cliente;
}

export async function deleteCliente(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("clientes") as any)
        .delete()
        .eq("id", id);

    if (error) throw error;
}

export async function getClienteStats(clienteId: string) {
    // 1. Buscar OSs
    const { data: oss, error: osError } = await supabase
        .from("ordens_servico")
        .select("valor_total_centavos, status")
        .eq("cliente_id", clienteId);

    if (osError) throw osError;

    // 2. Buscar Vendas
    const { data: vendas, error: vendaError } = await supabase
        .from("vendas" as any)
        .select("total_centavos")
        .eq("cliente_id", clienteId);

    if (vendaError) throw vendaError;

    const totalOs = (oss as any[]).length;
    const totalVendas = (vendas as any[]).length;

    const gastoOs = (oss as any[])
        .filter(os => ["finalizada", "entregue"].includes(os.status))
        .reduce((acc, os) => acc + (os.valor_total_centavos || 0), 0);

    const gastoVendas = (vendas as any[]).reduce((acc, v) => acc + (v.total_centavos || 0), 0);

    return {
        totalOs,
        totalVendas,
        totalGastoCentavos: gastoOs + gastoVendas
    };
}

export async function getClienteTimeline(clienteId: string) {
    // 1. Buscar OSs com joins básicos
    const { data: oss, error: osError } = await supabase
        .from("ordens_servico")
        .select(`
            id,
            numero,
            created_at,
            status,
            valor_total_centavos,
            problema_relatado,
            marca_equipamento,
            modelo_equipamento
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

    if (osError) throw osError;

    // 2. Buscar Vendas com joins básicos
    const { data: vendas, error: vendaError } = await (supabase.from("vendas" as any))
        .select(`
            id,
            numero,
            created_at,
            total_centavos,
            forma_pagamento
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

    if (vendaError) throw vendaError;

    // 3. Buscar Títulos Financeiros
    let titulos: any[] = [];
    try {
        const { data: fetchedTitulos, error: tituloError } = await (supabase.from("financeiro_titulos"))
            .select(`
                id,
                created_at,
                valor_total_centavos,
                tipo,
                status,
                data_vencimento,
                descricao
            `)
            .eq("cliente_id", clienteId)
            .order("created_at", { ascending: false });

        if (!tituloError) {
            titulos = fetchedTitulos || [];
        } else {
            console.error("Erro ao buscar títulos para timeline (provavelmente sem permissão):", tituloError);
        }
    } catch (e) {
        console.error("Exceção ao buscar títulos para timeline:", e);
    }

    // 4. Unificar e formatar
    const timeline = [
        ...(oss as any[]).map(os => ({
            id: os.id,
            tipo: "os" as const,
            data: os.created_at,
            numero: os.numero,
            status: os.status,
            valor: os.valor_total_centavos,
            descricao: `${os.marca_equipamento} ${os.modelo_equipamento} - ${os.problema_relatado}`
        })),
        ...(vendas as any[]).map(v => ({
            id: v.id,
            tipo: "venda" as const,
            data: v.data || v.created_at,
            numero: v.numero,
            status: "concluída",
            valor: v.total_centavos,
            descricao: `Venda no PDV (${v.forma_pagamento || 'N/A'})`
        })),
        ...titulos.map(t => ({
            id: t.id,
            tipo: "financeiro" as const,
            data: t.created_at,
            numero: t.numero,
            status: t.status,
            valor: t.valor_total_centavos,
            descricao: `${t.tipo === 'receita' ? 'Receita' : 'Despesa'}: ${t.descricao || 'Título Financeiro'}`
        }))
    ];

    // Ordenar por data decrescente
    return timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}
