import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// ─── Singleton ───────────────────────────────────────────────────
// IMPORTANTE: O Supabase Client usa Navigator Locks para gerenciar
// token refresh. Múltiplas instâncias causam timeout (NavigatorLockAcquireTimeoutError).
// Durante o "Fast Refresh" (HMR) do Next.js no desenvolvimento local,
// este módulo pode ser reavaliado, recriando clientes e gerando travamentos (Locks).
// Por isso, amarramos a instância globalmente no objeto `window` no navegador.

export function createClient() {
    // Se estivermos rodando no servidor (SSR), criamos um cliente anônimo descartável
    // (O SSR de verdade deve usar as funções em server.ts)
    if (typeof window === "undefined") {
        return createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    // No navegador (Client-side), garantimos um singleton absoluto entre HMRs
    const win = window as any;
    if (!win.__supabaseBrowserClient) {
        win.__supabaseBrowserClient = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Accept: "application/json"
                    }
                },
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    // Desativamos o Navigator LockManager porque ele causa 
                    // NavigatorLockAcquireTimeoutError em muitos ambientes.
                    // Isso força o desuso de travas, evitando o travamento de 10s no recarregamento da página.
                    lock: false,
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
