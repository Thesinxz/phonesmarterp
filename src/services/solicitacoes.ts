import { createClient } from "@/lib/supabase/client";
import { type Solicitacao } from "@/types/database";

const supabase = createClient() as any;


export async function criarSolicitacao(data: Omit<Solicitacao, "id" | "created_at" | "updated_at" | "status">) {
    const { data: res, error } = await (supabase.from("solicitacoes") as any)
        .insert({
            ...data,
            status: "pendente"
        })
        .select()
        .single();

    if (error) throw error;
    return res;
}

export async function getSolicitacoes() {
    const { data, error } = await (supabase.from("solicitacoes") as any)
        .select(`
            *,
            usuario:usuarios!usuario_id(nome),
            atribuido:usuarios!atribuido_a(nome)
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function atualizarStatusSolicitacao(id: string, status: Solicitacao["status"]) {
    const { error } = await supabase
        .from("solicitacoes")
        .update({ status } as any)
        .eq("id", id);

    if (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
    }
}

export async function marcarComoVisualizada(id: string) {
    const { error } = await supabase
        .from("solicitacoes")
        .update({ status: 'arquivado' } as any)
        .eq("id", id);

    if (error) {
        console.error("Erro ao marcar visualizada:", error);
        throw error;
    }
}


export async function deletarSolicitacao(id: string) {

    const { error } = await supabase
        .from("solicitacoes")
        .delete()
        .eq("id", id);

    if (error) throw error;
}
