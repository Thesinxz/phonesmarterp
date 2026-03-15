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
        const { configs, empresa_id, empresa_data } = body;

        if (!empresa_id) {
            return NextResponse.json({ success: false, error: "empresa_id obrigatório" }, { status: 400 });
        }

        // 1. Verificar autenticação do solicitante e gerenciar cookies
        let supabaseResponse = NextResponse.next({ request });

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            supabaseResponse.cookies.set(name, value, {
                                ...options,
                                sameSite: "lax",
                                secure: process.env.NODE_ENV === "production",
                            });
                        });
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

        // 2. Verificar se o usuário pertence à empresa (segurança)
        const { data: userProfile } = await supabaseAdmin
            .from("usuarios")
            .select("empresa_id")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (!userProfile || userProfile.empresa_id !== empresa_id) {
            return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
        }

        const results = [];
        let hasErrors = false;

        // 2. Atualizar dados da empresa se fornecidos
        if (empresa_data) {
            const { error: empError } = await supabaseAdmin
                .from("empresas")
                .update(empresa_data)
                .eq("id", empresa_id);

            if (empError) {
                console.error("[Onboarding API] Erro ao atualizar empresa:", empError);
                results.push({ type: "empresa", error: empError });
                hasErrors = true;
            } else {
                results.push({ type: "empresa", success: true });
            }
        }

        // 3. Upsert das configurações
        if (configs && Array.isArray(configs)) {
            for (const config of configs) {
                const { chave, valor } = config;

                const { error: upsertError } = await supabaseAdmin
                    .from("configuracoes")
                    .upsert({
                        empresa_id,
                        chave,
                        valor,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: "empresa_id,chave"
                    });

                if (upsertError) {
                    console.error(`[Onboarding API] Erro ao salvar config ${chave}:`, upsertError);
                    results.push({ chave, error: upsertError });
                    hasErrors = true;
                } else {
                    results.push({ chave, success: true });

                    // 4. Se for a chave de onboarding e estiver completo, atualizar a empresa principal
                    if (chave === "system_onboarding" && valor?.completed === true) {
                        const { error: empStatusError } = await supabaseAdmin
                            .from("empresas")
                            .update({ onboarding_completed: true })
                            .eq("id", empresa_id);
                        
                        if (empStatusError) {
                            console.error("[Onboarding API] Erro ao marcar empresa como concluída:", empStatusError);
                        }
                    }
                }
            }
        }

        // Determine overall success based on any errors encountered
        const finalHasErrors = results.some(r => r.error);

        const finalResponse = NextResponse.json({
            success: !finalHasErrors,
            results,
        }, { status: hasErrors ? 207 : 200 });

        // COPIAR COOKIES (Refresh Token fix)
        // Isso resolve o bug onde o usuário precisa limpar os cookies
        supabaseResponse.cookies.getAll().forEach(cookie => {
            finalResponse.cookies.set(cookie.name, cookie.value, {
                ...cookie
            } as any);
        });

        return finalResponse;

    } catch (error: any) {
        console.error("[API save-config] Erro:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
