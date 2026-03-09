import { createClient } from "@supabase/supabase-js";

/**
 * Audit Logger para o SmartOS.
 * Registra mudanças críticas no banco de dados para conformidade e segurança.
 */

// Usamos o Supabase Admin para garantir que o log seja escrito mesmo se o RLS do usuário estiver restrito
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

interface AuditLogParams {
    empresa_id: string;
    usuario_id: string;
    tabela: string;
    acao: "INSERT" | "UPDATE" | "DELETE";
    dado_anterior?: any;
    dado_novo?: any;
    detalhes?: string;
}

/**
 * Registra um evento de auditoria no banco de dados.
 */
export async function logAuditEvent({
    empresa_id,
    usuario_id,
    tabela,
    acao,
    dado_anterior,
    dado_novo,
}: AuditLogParams) {
    try {
        const { error } = await supabaseAdmin.from("audit_logs").insert({
            empresa_id,
            usuario_id,
            tabela,
            acao,
            dado_anterior_json: dado_anterior,
            dado_novo_json: dado_novo,
        });

        if (error) {
            console.error("[AuditLog] Erro ao gravar log:", error.message);
        }
    } catch (e) {
        console.error("[AuditLog] Erro inesperado:", e);
    }
}
