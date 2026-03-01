import { createClient } from "@/lib/supabase/client";
import { type Tecnico, type Database } from "@/types/database";

const supabase = createClient();

export async function getTecnicos() {
    const { data, error } = await supabase
        .from("tecnicos")
        .select(`
            *,
            usuario:usuarios(nome, email, papel, ativo)
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as any[];
}

export async function createTecnico(tecnico: Database["public"]["Tables"]["tecnicos"]["Insert"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("tecnicos") as any)
        .insert(tecnico)
        .select()
        .single();

    if (error) throw error;
    return data as Tecnico;
}

export async function updateTecnico(id: string, tecnico: Database["public"]["Tables"]["tecnicos"]["Update"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("tecnicos") as any)
        .update(tecnico)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Tecnico;
}

export async function getTecnicoByUsuarioId(usuarioId: string) {
    const { data, error } = await supabase
        .from("tecnicos")
        .select("*")
        .eq("usuario_id", usuarioId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Tecnico | null;
}
