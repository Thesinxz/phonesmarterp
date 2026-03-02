import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

const supabase = createClient() as any;

export type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];

export async function getMembrosEquipe(empresaId: string) {
    if (!empresaId) throw new Error("empresaId is required");

    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao buscar membros da equipe:", error);
        throw error;
    }
    return data as Usuario[];
}

export async function criarMembroEquipe(data: Omit<Usuario, "id" | "created_at">) {
    console.log("[equipe.ts] V4 - criarMembroEquipe para:", data.email);

    const token = crypto.randomUUID();

    // INSERT direto — RLS desabilitado em equipe_convites
    const { error } = await supabase
        .from("equipe_convites")
        .insert({
            id: token,
            empresa_id: data.empresa_id,
            email: data.email,
            nome: data.nome || 'Convidado',
            papel: data.papel,
            permissoes_json: data.permissoes_json || {}
        });

    if (error) {
        console.error("[equipe.ts] Erro ao criar convite:", error);
        throw new Error(error.message || "Não foi possível criar o convite.");
    }

    const inviteLink = `${window.location.origin}/cadastro?token=${token}`;
    console.log("[equipe.ts] Convite criado com sucesso! Link:", inviteLink);
    return { success: true, token, inviteLink };
}

/**
 * Valida um token de convite e retorna os dados dele para pré-preenchimento
 */
export async function validarConviteToken(token: string) {
    if (!token) return null;

    try {
        const { data, error } = await supabase
            .from("equipe_convites")
            .select("id, empresa_id, nome, email, papel")
            .eq("id", token)
            .is("usado_em", null)
            .gt("expira_em", new Date().toISOString())
            .single();

        if (error || !data) {
            console.warn("[equipe.ts] Convite inválido ou expirado.", error);
            return null;
        }

        return data;
    } catch (e) {
        return null;
    }
}

export async function atualizarMembroEquipe(id: string, updates: Partial<Usuario>) {
    const { data, error } = await supabase
        .from("usuarios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Erro ao atualizar membro da equipe:", error);
        throw error;
    }
    return data as Usuario;
}

export async function excluirMembroEquipe(id: string) {
    const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao excluir membro da equipe:", error);
        throw error;
    }
}

export const DEFAULT_PERMISSIONS = {
    vendas: { view: true, create: true, edit: false, delete: false },
    financeiro: { view: false, create: false, edit: false, delete: false },
    estoque: { view: true, create: true, edit: true, delete: false },
    ordens_servico: { view: true, create: true, edit: true, delete: false },
    configuracoes: { view: false },
    equipe: { view: false }
};

export const ROLE_PERMISSIONS: Record<Usuario["papel"], any> = {
    admin: {
        all: true
    },
    gerente: {
        vendas: { view: true, create: true, edit: true, delete: true },
        financeiro: { view: true, create: true, edit: true, delete: false },
        estoque: { view: true, create: true, edit: true, delete: true },
        ordens_servico: { view: true, create: true, edit: true, delete: true },
        configuracoes: { view: false },
        equipe: { view: true, create: true, edit: true, delete: false }
    },
    tecnico: {
        vendas: { view: false },
        financeiro: { view: false },
        estoque: { view: true, create: false, edit: false, delete: false },
        ordens_servico: { view: true, create: true, edit: true, delete: false },
        configuracoes: { view: false },
        equipe: { view: false }
    },
    financeiro: {
        vendas: { view: true },
        financeiro: { view: true, create: true, edit: true, delete: true },
        estoque: { view: false },
        ordens_servico: { view: true },
        configuracoes: { view: false },
        equipe: { view: false }
    },
    atendente: {
        vendas: { view: true, create: true, edit: false, delete: false },
        financeiro: { view: false },
        estoque: { view: true },
        ordens_servico: { view: true, create: true, edit: false, delete: false },
        configuracoes: { view: false },
        equipe: { view: false }
    }
};
