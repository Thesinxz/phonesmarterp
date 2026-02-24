import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Configurar detalhes do VAPID
// Nota: Em produção, estas variáveis DEVEM estar configuradas no Vercel
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@smartos.com.br";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(req: Request) {
    try {
        const { usuario_ids, titulo, corpo, url, token } = await req.json();

        // Segurança básica: verificar um token interno ou segredo se não for via auth normal
        // (Apenas se este for um trigger externo)

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return NextResponse.json(
                { error: "VAPID keys not configured on server" },
                { status: 500 }
            );
        }

        const supabase = getSupabaseAdmin();

        // 1. Buscar todas as subscrições ativas para os usuários alvo
        const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("*")
            .in("usuario_id", usuario_ids);

        if (subError || !subscriptions) {
            return NextResponse.json(
                { error: "Failed to fetch subscriptions", details: subError },
                { status: 500 }
            );
        }

        // 2. Disparar as notificações em paralelo
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    const payload = JSON.stringify({
                        titulo: titulo || "SmartOS",
                        corpo: corpo || "Você recebeu uma nova atualização.",
                        url: url || "/dashboard",
                    });

                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys,
                        },
                        payload
                    );
                    return { success: true, endpoint: sub.endpoint };
                } catch (err: any) {
                    // Se o erro for 410 ou 404, significa que a subscrição expirou ou é inválida
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        console.log(`[Push] Subscrição expirada removida: ${sub.endpoint}`);
                        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                    }
                    throw err;
                }
            })
        );

        const successful = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            sentCount: successful,
            failedCount: failed,
        });
    } catch (err: any) {
        console.error("[Push] Erro crítico na API de envio:", err);
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}
