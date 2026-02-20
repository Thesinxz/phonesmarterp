import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * DELETE /api/auth/delete-user
 * 
 * Deleta um usuário do Supabase Auth E da tabela pública `usuarios`.
 * Requer que o solicitante seja admin da mesma empresa.
 * 
 * Body: { userId: string } (ID do registro na tabela `usuarios`)
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId é obrigatório" },
                { status: 400 }
            );
        }

        // 1. Verificar autenticação do solicitante via cookie
        const supabaseResponse = NextResponse.next({ request });
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, {
                                ...options,
                                sameSite: "lax",
                                secure: process.env.NODE_ENV === "production",
                            })
                        );
                    },
                },
            }
        );

        const { data: { user: requester } } = await supabase.auth.getUser();
        if (!requester) {
            return NextResponse.json(
                { success: false, error: "Não autenticado" },
                { status: 401 }
            );
        }

        // 2. Verificar que o solicitante é admin
        const { data: requesterProfile } = await supabaseAdmin
            .from("usuarios")
            .select("papel, empresa_id")
            .eq("auth_user_id", requester.id)
            .single();

        if (!requesterProfile || requesterProfile.papel !== "admin") {
            return NextResponse.json(
                { success: false, error: "Apenas administradores podem deletar usuários" },
                { status: 403 }
            );
        }

        // 3. Buscar o usuário alvo
        const { data: targetUser } = await supabaseAdmin
            .from("usuarios")
            .select("id, auth_user_id, empresa_id, email")
            .eq("id", userId)
            .single();

        if (!targetUser) {
            return NextResponse.json(
                { success: false, error: "Usuário não encontrado" },
                { status: 404 }
            );
        }

        // 4. Garantir que o admin não pode deletar usuário de outra empresa
        if (targetUser.empresa_id !== requesterProfile.empresa_id) {
            return NextResponse.json(
                { success: false, error: "Usuário não pertence à sua empresa" },
                { status: 403 }
            );
        }

        // 5. Não permitir que admin delete a si mesmo
        if (targetUser.auth_user_id === requester.id) {
            return NextResponse.json(
                { success: false, error: "Você não pode deletar sua própria conta" },
                { status: 400 }
            );
        }

        // 6. Deletar da tabela pública primeiro (FK cascade cuidará dos dependentes)
        const { error: deletePublicError } = await supabaseAdmin
            .from("usuarios")
            .delete()
            .eq("id", userId);

        if (deletePublicError) {
            console.error("Erro ao deletar registro público:", deletePublicError);
            return NextResponse.json(
                { success: false, error: "Erro ao deletar registro: " + deletePublicError.message },
                { status: 500 }
            );
        }

        // 7. Deletar do Supabase Auth (se tiver auth_user_id vinculado)
        if (targetUser.auth_user_id) {
            const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
                targetUser.auth_user_id
            );

            if (deleteAuthError) {
                console.error("Erro ao deletar Auth user (registro público já deletado):", deleteAuthError);
                // Não falhar hard aqui — o registro público já foi deletado
            }
        }

        return NextResponse.json({
            success: true,
            message: `Usuário ${targetUser.email} deletado com sucesso`,
        });

    } catch (error: any) {
        console.error("Erro ao deletar usuário:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
