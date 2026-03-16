import { createClient } from "@/lib/supabase/client";
import { type Tecnico, type Database } from "@/types/database";

const supabase = createClient();

export async function getTecnicos() {
    const { data, error } = await supabase
        .from("usuarios")
        .select(`
            id,
            nome,
            email,
            papel,
            ativo,
            tecnicos!tecnicos_usuario_id_fkey (
                id,
                comissao_pct,
                meta_mensal_centavos,
                especialidades,
                ativo
            )
        `)
        .eq("excluido", false)
        .order("nome", { ascending: true });

    if (error) throw error;

    // Map back to a consistent structure that the page expects
    return ((data as any[]) || []).map(u => ({
        id: u.tecnicos?.[0]?.id || `temp-${u.id}`,
        usuario_id: u.id,
        usuario: {
            nome: u.nome,
            email: u.email,
            papel: u.papel,
            ativo: u.ativo
        },
        comissao_pct: u.tecnicos?.[0]?.comissao_pct || 0,
        meta_mensal_centavos: u.tecnicos?.[0]?.meta_mensal_centavos || 0,
        especialidades: u.tecnicos?.[0]?.especialidades || [],
        ativo: u.tecnicos?.[0]?.ativo ?? u.ativo
    }));
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
