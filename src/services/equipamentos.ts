import { createClient } from "@/lib/supabase/client";
import { type Equipamento, type Database } from "@/types/database";

const supabase = createClient();

export async function getEquipamentosByCliente(clienteId: string) {
    const { data, error } = await supabase
        .from("equipamentos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Equipamento[];
}

export async function createEquipamento(equipamento: Database["public"]["Tables"]["equipamentos"]["Insert"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("equipamentos") as any)
        .insert(equipamento)
        .select()
        .single();

    if (error) throw error;
    return data as Equipamento;
}

export async function updateEquipamento(id: string, equipamento: Database["public"]["Tables"]["equipamentos"]["Update"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("equipamentos") as any)
        .update(equipamento)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Equipamento;
}

export async function deleteEquipamento(id: string) {
    const { error } = await supabase
        .from("equipamentos")
        .delete()
        .eq("id", id);

    if (error) throw error;
}
