import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { globalRateLimiter } from "@/lib/rate-limit";

// ─── Domínios autorizados para CORS ──────────────────────────
const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://smartos.vercel.app",
    "https://www.smartos.com.br",
    "https://smartos.com.br",
    process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

// ─── Domínios permitidos para redirecionamento ───────────────
const ALLOWED_REDIRECT_HOSTS = [
    "localhost",
    "smartos.vercel.app",
    "smartos.com.br",
    "www.smartos.com.br",
];

function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function isAllowedRedirect(url: string): boolean {
    try {
        // Relative URLs are always allowed
        if (url.startsWith("/")) return true;
        const parsed = new URL(url);
        return ALLOWED_REDIRECT_HOSTS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
    if (origin && isAllowedOrigin(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get("origin");

    // ── Preflight CORS (OPTIONS) ──────────────────────────────
    if (request.method === "OPTIONS") {
        const preflightResponse = new NextResponse(null, { status: 204 });
        return addCorsHeaders(preflightResponse, origin);
    }

    // Rotas públicas: não precisam de verificação de auth
    const publicPaths = ["/", "/login", "/cadastro", "/recuperar-senha", "/nova-senha", "/verificar-email", "/landing", "/auth/callback", "/teste"];
    const isPublicPath = publicPaths.includes(pathname) || publicPaths.some((p) => p !== "/" && pathname.startsWith(p));
    const isApiPath = pathname.startsWith("/api");

    // ── Rate Limiting em rotas /api ───────────────────────────
    if (isApiPath) {
        const clientIp = getClientIp(request);
        const { success, remaining, reset } = globalRateLimiter.check(clientIp, 60);

        if (!success) {
            const rateLimitResponse = NextResponse.json(
                { error: "Too Many Requests", message: "Limite de requisições excedido. Tente novamente em breve." },
                { status: 429 }
            );
            rateLimitResponse.headers.set("Retry-After", String(Math.ceil((reset - Date.now()) / 1000)));
            rateLimitResponse.headers.set("X-RateLimit-Limit", "60");
            rateLimitResponse.headers.set("X-RateLimit-Remaining", "0");
            return addCorsHeaders(rateLimitResponse, origin);
        }
    }

    // Para o auth/callback, retornar imediatamente sem interferir
    // O callback handler tem sua própria lógica de cookies
    if (pathname.startsWith("/auth/callback")) {
        return NextResponse.next();
    }

    // ── Validação de redirect URL ─────────────────────────────
    const redirectParam = request.nextUrl.searchParams.get("redirect") || request.nextUrl.searchParams.get("next");
    if (redirectParam && !isAllowedRedirect(redirectParam)) {
        const url = request.nextUrl.clone();
        url.searchParams.delete("redirect");
        url.searchParams.delete("next");
        return NextResponse.redirect(url);
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

    let user = null;
    try {
        // Refresh session — isso é necessário para manter os tokens atualizados
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            // Se for erro de refresh token, ignoramos o log ruidoso no terminal
            if (authError.code === 'refresh_token_not_found') {
                console.log("[Middleware] Sessão expirada ou inválida (refresh token não encontrado). Tratando como deslogado.");
            } else {
                console.error("[Middleware] Erro ao obter usuário:", authError.message);
            }
        } else {
            user = authUser;
        }
    } catch (e) {
        console.error("[Middleware] Exceção inesperada na validação de auth:", e);
    }

    // Redirecionar usuários não-autenticados para login (exceto rotas públicas/api)
    if (!user && !isPublicPath && !isApiPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirecionar usuários autenticados para longe de landing page, login ou cadastro
    if (user && (pathname === "/" || pathname === "/login" || pathname === "/cadastro")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    // ── Adiciona CORS headers na resposta ─────────────────────
    return addCorsHeaders(supabaseResponse, origin);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

