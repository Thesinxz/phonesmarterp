import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Converte uma string base64 VAPID para Uint8Array necessário para a inscrição
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Converte ArrayBuffer para string base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Realiza a inscrição do navegador para Push Notifications
 */
export async function subscribeToPush(usuarioId: string, empresaId: string) {
    if (typeof window === "undefined") return null;

    // 1. Verificar suporte e permissão
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        logger.warn("[Push] Navegador não suporta Push Notifications.");
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            logger.log("[Push] Permissão negada pelo usuário. Notificações desativadas.");
            return null;
        }

        // 2. Obter Service Worker pronto
        const reg = await navigator.serviceWorker.ready;

        // 3. Gerar ou obter assinatura
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
            console.error("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");
            return null;
        }

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 4. Salvar no Supabase
        const supabase = createClient();
        const p256dhBuffer = subscription.getKey("p256dh");
        const authBuffer = subscription.getKey("auth");

        if (!p256dhBuffer || !authBuffer) {
            logger.warn("[Push] Falha ao obter chaves da subscrição.");
            return null;
        }

        const { error } = await (supabase.from("push_subscriptions") as any).upsert(
            {
                usuario_id: usuarioId,
                empresa_id: empresaId,
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(p256dhBuffer),
                    auth: arrayBufferToBase64(authBuffer),
                },
            },
            { onConflict: "usuario_id,endpoint", ignoreDuplicates: true }
        );

        if (error) {
            logger.warn("[Push] Não foi possível salvar subscrição (não crítico):", error.code);
        }

        logger.log("[Push] Subscrição realizada com sucesso.");
        return subscription;
    } catch (err) {
        console.error("[Push] Erro crítico na subscrição:", err);
        return null;
    }
}
