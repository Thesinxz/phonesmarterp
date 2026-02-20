import { createClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

const supabase = createClient();

export type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

export async function createAuditLog(log: AuditLogInsert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("audit_logs") as any)
        .insert(log);

    if (error) {
        console.error("[AUDIT] Error recording log:", error);
    }
}

export async function getAuditLogs(filters?: {
    usuarioId?: string;
    tabela?: string;
    limit?: number;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("audit_logs") as any)
        .select(`
            *,
            usuario:usuarios(nome)
        `)
        .order("criado_em", { ascending: false });

    if (filters?.usuarioId) query = query.eq("usuario_id", filters.usuarioId);
    if (filters?.tabela) query = query.eq("tabela", filters.tabela);
    if (filters?.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return data;
}
