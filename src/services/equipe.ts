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

export async function criarMembroEquipe(data: Omit<Usuario, "id" | "created_at">, explicitToken?: string) {
    const token = crypto.randomUUID();
    const payload = {
        id: token,
        empresa_id: data.empresa_id,
        email: data.email,
        nome: data.nome || 'Convidado',
        papel: data.papel,
        permissoes_json: data.permissoes_json || {}
    };

    try {
        let accessToken = explicitToken || '';

        // Fallback: Busca manual se o token não foi injetado (via LocalStorage)
        if (!accessToken) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const projectRef = supabaseUrl?.split('.')[0].split('//')[1];
            const storageKey = `sb-${projectRef}-auth-token`;
            const storageData = localStorage.getItem(storageKey);
            if (storageData) {
                const parsed = JSON.parse(storageData);
                accessToken = parsed.access_token;
            }
        }

        // Último recurso: busca via client (com risco de hang)
        if (!accessToken) {
            const { data: { session } } = await supabase.auth.getSession();
            accessToken = session?.access_token || '';
        }

        if (!accessToken) throw new Error("Sessão expirada. Por favor, faça login novamente.");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Fetch direto para evitar deadlocks da biblioteca oficial durante INSERT
        const response = await fetch(`${supabaseUrl}/rest/v1/equipe_convites`, {
            method: 'POST',
            headers: {
                'apikey': supabaseAnonKey!,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao salvar no banco: ${response.status}`);
        }

        const inviteLink = `${window.location.origin}/cadastro?token=${token}`;
        return { success: true, token, inviteLink };

    } catch (err: any) {
        console.error("[equipe.ts] Falha ao criar convite:", err);
        throw err;
    }
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
