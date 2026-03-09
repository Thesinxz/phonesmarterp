/**
 * Rate Limiter in-memory para API Routes do Next.js.
 * Usa um Map com limpeza automática de entradas expiradas.
 *
 * Uso:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });
 *
 *   // Dentro de uma API Route ou Middleware:
 *   const { success } = await limiter.check(ip, 60); // 60 requests por janela
 */

interface RateLimitOptions {
    interval: number;         // Janela em ms (ex: 60_000 = 1 min)
    uniqueTokenPerInterval: number; // Max IPs rastreados por janela
}

interface TokenBucket {
    count: number;
    expiresAt: number;
}

export function rateLimit(options: RateLimitOptions = { interval: 60_000, uniqueTokenPerInterval: 500 }) {
    const tokenCache = new Map<string, TokenBucket>();

    // Limpa entradas expiradas a cada 30s
    const cleanup = setInterval(() => {
        const now = Date.now();
        Array.from(tokenCache.entries()).forEach(([key, bucket]) => {
            if (bucket.expiresAt <= now) {
                tokenCache.delete(key);
            }
        });
    }, 30_000);

    // Evitar memory leak em ambientes com hot-reload
    if (typeof cleanup?.unref === "function") {
        cleanup.unref();
    }

    return {
        check: (token: string, limit: number): { success: boolean; remaining: number; reset: number } => {
            const now = Date.now();
            const bucket = tokenCache.get(token);

            if (!bucket || bucket.expiresAt <= now) {
                // Primeira requisição ou janela expirada
                if (tokenCache.size >= options.uniqueTokenPerInterval) {
                    // Limpar cache se estiver cheio
                    const oldestKey = tokenCache.keys().next().value;
                    if (oldestKey) tokenCache.delete(oldestKey);
                }

                const expiresAt = now + options.interval;
                tokenCache.set(token, { count: 1, expiresAt });
                return { success: true, remaining: limit - 1, reset: expiresAt };
            }

            // Dentro da janela
            bucket.count += 1;

            if (bucket.count > limit) {
                return { success: false, remaining: 0, reset: bucket.expiresAt };
            }

            return { success: true, remaining: limit - bucket.count, reset: bucket.expiresAt };
        },
    };
}

// Instância global para o middleware (compartilhada entre requisições)
export const globalRateLimiter = rateLimit({
    interval: 60_000,           // 1 minuto
    uniqueTokenPerInterval: 500 // até 500 IPs rastreados simultaneamente
});
