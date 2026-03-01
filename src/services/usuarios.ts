import { createClient } from "@/lib/supabase/client";
import { type Usuario } from "@/types/database";

const supabase = createClient();

export async function getUsuarios() {
    const { data, error } = await (supabase.from("usuarios") as any)
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

    if (error) throw error;
    return data as Usuario[];
}

export async function getUsuarioById(id: string) {
    const { data, error } = await (supabase.from("usuarios") as any)
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Usuario;
}
