import { createClient } from "@/lib/supabase/client";
import { type Financeiro, type Database } from "@/types/database";

const supabase = createClient();

export async function getFinanceiro() {
    const { data, error } = await supabase
        .from("financeiro")
        .select("*")
        .order("vencimento", { ascending: false });

    if (error) throw error;
    return data as Financeiro[];
}

export async function createMovimentacao(mov: Database["public"]["Tables"]["financeiro"]["Insert"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("financeiro") as any)
        .insert(mov)
        .select()
        .single();

    if (error) throw error;
    return data as Financeiro;
}

export async function togglePagamento(id: string, pago: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("financeiro") as any)
        .update({ pago })
        .eq("id", id);

    if (error) throw error;
}
