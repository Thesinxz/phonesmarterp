"use server";

import { checkAdmin } from "@/lib/auth-guards";
import { logAuditEvent } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/plans/guard";

/**
 * Atualiza um membro da equipe com verificação server-side de Admin.
 */
export async function updateMembroEquipeAction(id: string, updates: any) {
    await requireFeature('gestao_equipe');
    try {
        const { profile, supabase } = await checkAdmin();

        // 1. Buscar dado anterior para auditoria
        const { data: oldData } = await (supabase.from("usuarios") as any)
            .select("*")
            .eq("id", id)
            .single();

        // 2. Executar update
        const { data: newData, error } = await (supabase.from("usuarios") as any)
            .update(updates)
            .eq("id", id)
            .eq("empresa_id", profile.empresa_id) // Garantia extra
            .select()
            .single();

        if (error) throw error;

        // 3. Log de auditoria
        await logAuditEvent({
            empresa_id: profile.empresa_id,
            usuario_id: profile.id,
            tabela: "usuarios",
            acao: "UPDATE",
            dado_anterior: oldData,
            dado_novo: newData
        });

        revalidatePath("/configuracoes/equipe");
        return { success: true, data: newData };

    } catch (error: any) {
        console.error("[Action Equipe] Erro no update:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Exclui (Soft Delete) um membro da equipe com verificação server-side de Admin.
 */
export async function deleteMembroEquipeAction(id: string) {
    await requireFeature('gestao_equipe');
    try {
        const { profile, supabase } = await checkAdmin();

        // 1. Buscar dado anterior para auditoria
        const { data: oldData } = await (supabase.from("usuarios") as any)
            .select("*")
            .eq("id", id)
            .single();

        if (id === profile.id) {
            throw new Error("Você não pode excluir sua própria conta por aqui");
        }

        // 2. Executar soft delete
        const { error } = await (supabase.from("usuarios") as any)
            .update({ excluido: true, ativo: false })
            .eq("id", id)
            .eq("empresa_id", profile.empresa_id);

        if (error) throw error;

        // 3. Log de auditoria
        await logAuditEvent({
            empresa_id: profile.empresa_id,
            usuario_id: profile.id,
            tabela: "usuarios",
            acao: "DELETE",
            dado_anterior: oldData,
            dado_novo: { excluido: true }
        });

        revalidatePath("/configuracoes/equipe");
        return { success: true };

    } catch (error: any) {
        console.error("[Action Equipe] Erro no delete:", error.message);
        return { success: false, error: error.message };
    }
}
