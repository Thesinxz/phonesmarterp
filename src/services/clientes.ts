import { createClient } from "@/lib/supabase/client";
import { type Cliente, type Database } from "@/types/database";

// Instância para uso no client-side (para server components use o createServerClient)
const supabase = createClient();

export interface ClienteFilters {
    search?: string;
    segmento?: string;
}

export async function getClientes(page = 1, limit = 10, filters?: ClienteFilters) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%`);
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
