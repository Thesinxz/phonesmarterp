import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Rotas públicas: não precisam de verificação de auth
    const publicPaths = ["/", "/login", "/cadastro", "/recuperar-senha", "/nova-senha", "/verificar-email", "/landing", "/auth/callback"];
    const isPublicPath = publicPaths.includes(pathname) || publicPaths.some((p) => p !== "/" && pathname.startsWith(p));
    const isApiPath = pathname.startsWith("/api");

    // Para o auth/callback, retornar imediatamente sem interferir
    // O callback handler tem sua própria lógica de cookies
    if (pathname.startsWith("/auth/callback")) {
        return NextResponse.next();
    }

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
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            sameSite: 'lax',
                            secure: process.env.NODE_ENV === 'production',
                        })
                    );
                },
            },
        }
    );

    // Refresh session — isso é necessário para manter os tokens atualizados
    const { data: { user } } = await supabase.auth.getUser();

    // Redirecionar usuários não-autenticados para login (exceto rotas públicas/api)
    if (!user && !isPublicPath && !isApiPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirecionar usuários autenticados para longe de login/cadastro
    if (user && (pathname === "/login" || pathname === "/cadastro")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
