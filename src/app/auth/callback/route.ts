import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth Callback Route
 * 
 * Esta rota é chamada pelo Supabase quando:
 * 1. O usuário confirma o email (após cadastro)
 * 2. O usuário clica no link de "Esqueci a senha"
 * 3. Magic links (se habilitados)
 * 
 * O Supabase envia um `code` como query param que precisamos trocar
 * por uma sessão válida no servidor.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
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
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        );
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

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Código trocado com sucesso — redirecionar para destino
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                // Em dev, redirecionar para origin local
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    // Se não tiver code ou deu erro, redirecionar para login com erro
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
