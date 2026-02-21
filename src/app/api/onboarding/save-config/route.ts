import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/onboarding/save-config
 * 
 * Salva configurações do onboarding via server-side (bypassa RLS e Accept header issues).
 * 
 * Body: { chave: string, valor: any, empresa_id: string }
 */
export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();
    try {
        const body = await request.json();
        const { configs, empresa_id } = body;

        if (!configs || !empresa_id) {
            return NextResponse.json(
                { success: false, error: "configs e empresa_id são obrigatórios" },
                { status: 400 }
            );
        }

        // 1. Verificar autenticação do solicitante
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { success: false, error: "Não autenticado" },
                { status: 401 }
            );
        }

        // 2. Verificar que o usuário pertence à empresa
        const { data: userProfile } = await supabaseAdmin
            .from("usuarios")
            .select("empresa_id")
            .eq("auth_user_id", user.id)
            .single();

        if (!userProfile || userProfile.empresa_id !== empresa_id) {
            return NextResponse.json(
                { success: false, error: "Empresa inválida" },
                { status: 403 }
            );
        }

        // 3. Salvar cada config usando supabaseAdmin (bypassa RLS)
        const results: { chave: string; ok: boolean; error?: string }[] = [];

        for (const cfg of configs) {
            const { chave, valor, is_secret = false } = cfg;

            const { error } = await supabaseAdmin
                .from("configuracoes")
                .upsert({
                    empresa_id,
                    chave,
                    valor,
                    is_secret,
                    descricao: `Configuração: ${chave}`,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "empresa_id,chave" });

            results.push({
                chave,
                ok: !error,
                error: error?.message,
            });
        }

        const hasErrors = results.some(r => !r.ok);

        return NextResponse.json({
            success: !hasErrors,
            results,
        }, { status: hasErrors ? 207 : 200 });

    } catch (error: any) {
        console.error("[API save-config] Erro:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
