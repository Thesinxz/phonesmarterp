import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface PeliculaAcessorio {
    id: string;
    empresa_id: string;
    nome: string;
    tipo: "pelicula" | "capa" | "cabo" | "acessorio";
    modelos_compativeis: string[];
    preco_centavos: number;
    estoque: number;
    created_at: string;
}

export async function getPeliculas(empresa_id: string, search?: string) {
    let query = supabase
        .from("peliculas_acessorios")
        .select("*", { count: "exact" })
        .eq("empresa_id", empresa_id)
        .order("nome");

    if (search) {
        query = query.or(`nome.ilike.%${search}%,modelos_compativeis.cs.{${search}}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as PeliculaAcessorio[], count: count || 0 };
}

export async function upsertPelicula(pelicula: Partial<PeliculaAcessorio> & { empresa_id: string }) {
    const { data, error } = await (supabase.from("peliculas_acessorios") as any)
        .upsert(pelicula)
        .select()
        .single();
    if (error) throw error;
    return data as PeliculaAcessorio;
}

export async function deletePelicula(id: string) {
    const { error } = await supabase
        .from("peliculas_acessorios")
        .delete()
        .eq("id", id);
    if (error) throw error;
}
