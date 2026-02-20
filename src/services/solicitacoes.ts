import { createClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

const supabase = createClient();

export interface Solicitacao {
    id: string;
    empresa_id: string;
    solicitante_id: string;
    destinatario_id: string | null; // null = para todos
    cliente_id: string | null;
    titulo: string;
    mensagem: string;
    prioridade: "baixa" | "media" | "alta" | "urgente";
    status: "pendente" | "visualizado" | "resolvido";
    created_at: string;
}

export async function criarSolicitacao(data: Omit<Solicitacao, "id" | "created_at" | "status">) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("solicitacoes") as any)
        .select(`
            *,
            solicitante:usuarios!solicitante_id(nome),
            cliente:clientes(nome)
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function marcarComoVisualizada(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("solicitacoes") as any)
        .update({ status: "visualizado" })
        .eq("id", id);

    if (error) throw error;
}
