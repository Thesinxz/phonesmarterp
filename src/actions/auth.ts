"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit-logger";
import { redirect } from "next/navigation";

/**
 * Permite que um usuário exclua sua PRÓPRIA conta (Regra 21).
 * Diferente da exclusão de membros pelo Admin, aqui o usuário apaga seus próprios dados.
 */
export async function deleteMyAccountAction() {
    const cookieStore = cookies();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verificar autenticação atual
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // ignore set on read-only
                    }
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "Usuário não autenticado" };
    }

    try {
        // 2. Buscar perfil para auditoria
        const { data: profile } = await supabaseAdmin
            .from("usuarios")
            .select("*")
            .eq("auth_user_id", user.id)
            .single();

        if (!profile) throw new Error("Perfil não encontrado");

        // 3. Log de auditoria (antes de apagar)
        await logAuditEvent({
            empresa_id: profile.empresa_id,
            usuario_id: profile.id,
            tabela: "usuarios",
            acao: "DELETE",
            dado_anterior: { ...profile, auto_exclusao: true },
            dado_novo: null
        });

        // 4. Executar Soft Delete na tabela pública (seguindo padrão do sistema)
        // Isso inativa o usuário mas mantém registros históricos para integridade do ERP.
        const { error: updateError } = await supabaseAdmin
            .from("usuarios")
            .update({
                excluido: true,
                ativo: false,
                email: `deleted_${user.id.substring(0, 8)}@smartos.internal` // Liberar o email original
            })
            .eq("auth_user_id", user.id);

        if (updateError) throw updateError;

        // 5. Deletar do Supabase Auth (Hard Delete do Login)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteAuthError) {
            console.error("[Auth Action] Erro ao deletar do Supabase Auth:", deleteAuthError.message);
            // Mesmo se falhar auth, o perfil público já foi inativado.
        }

        // 6. Sign out no client (limpar cookies)
        await supabase.auth.signOut();

    } catch (error: any) {
        console.error("[Auth Action] Erro ao excluir conta própria:", error.message);
        return { success: false, error: error.message };
    }

    // 7. Redirecionar para landing/home
    redirect("/login?message=conta_excluida");
}
