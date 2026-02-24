import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// ─── Singleton ───────────────────────────────────────────────────
// O Supabase Client usa Navigator Locks para gerenciar token refresh.
// Múltiplas instâncias / Fast Refresh do Next.js causam timeout (NavigatorLockAcquireTimeoutError).
// Usamos um singleton amarrado ao `window` e substituímos o lock por um no-op.

// No-op lock: executa o callback imediatamente sem aguardar lock nenhum,
// eliminando o NavigatorLockAcquireTimeoutError de 10s em desenvolvimento e produção.
async function noopLock<T>(
    _name: string,
    _options: { mode: "exclusive" | "shared" } | null,
    fn: () => Promise<T>
): Promise<T> {
    return fn();
}

export function createClient() {
    // SSR: cliente descartável sem session
    if (typeof window === "undefined") {
        return createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    // Browser: singleton absoluto entre HMRs
    const win = window as any;
    if (!win.__supabaseBrowserClient) {
        win.__supabaseBrowserClient = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Accept: "application/json" }
                },
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    // Substitui o NavigatorLockManager por um no-op para evitar
                    // o timeout de 10s causado por lock contention entre abas/HMR.
                    lock: noopLock,
                },
                cookieOptions: {
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax" as const,
                },
            }
        );
    }

    return win.__supabaseBrowserClient as ReturnType<typeof createBrowserClient<Database>>;
}
