"use server";

import { checkAdmin } from "@/lib/auth-guards";
import { logAuditEvent } from "@/lib/audit-logger";
import { revalidatePath } from "next/cache";

/**
 * Exclui uma Ordem de Serviço com verificação server-side de Admin.
 */
export async function deleteOSAction(id: string) {
    try {
        const { profile, supabase } = await checkAdmin();

        // 1. Buscar dado anterior para auditoria
        const { data: oldData } = await (supabase.from("ordens_servico") as any)
            .select("*, cliente:clientes(nome)")
            .eq("id", id)
            .single();

        if (!oldData) throw new Error("Ordem de serviço não encontrada");

        // 2. Executar delete
        const { error } = await (supabase.from("ordens_servico") as any)
            .delete()
            .eq("id", id)
            .eq("empresa_id", profile.empresa_id);

        if (error) throw error;

        // 3. Log de auditoria
        await logAuditEvent({
            empresa_id: profile.empresa_id,
            usuario_id: profile.id,
            tabela: "ordens_servico",
            acao: "DELETE",
            dado_anterior: oldData,
            dado_novo: null
        });

        revalidatePath("/os");
        return { success: true };

    } catch (error: any) {
        console.error("[Action OS] Erro no delete:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Atualiza o status de uma OS com validação server-side e auditoria.
 */
export async function updateOSStatusAction(id: string, status: string, extraFields: any = {}) {
    try {
        const { profile } = await checkAdmin();
        const { updateOSStatus } = await import("@/services/os");

        const result = await updateOSStatus(
            id,
            status as any,
            profile.id,
            profile.empresa_id,
            extraFields
        );

        revalidatePath(`/os/${id}`);
        revalidatePath("/os");

        return { success: true, data: result };

    } catch (error: any) {
        console.error("[Action OS] Erro no update status:", error.message);
        return { success: false, error: error.message };
    }
}
