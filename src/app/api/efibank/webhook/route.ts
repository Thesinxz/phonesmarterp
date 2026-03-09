import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/efibank/webhook
 * 
 * Recebe notificações de pagamento da EfíBank.
 * Atualiza o status das parcelas automaticamente.
 * 
 * Proteção: Verificação dinâmica por empresa (webhook_secret no banco).
 */
export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();

        // A EfíBank envia notificações com o token contendo o charge_id atualizado
        const chargeId = body.identifiers?.charge_id || body.charge_id || body.notification;

        if (!chargeId) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // 1. Buscar a parcela e a empresa dona desta cobrança
        const { data: parcela, error: findErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .select("id, status, crediario_id, empresa_id")
            .eq("efibank_charge_id", chargeId)
            .single();

        if (findErr || !parcela) {
            console.warn(`[Efí Webhook] Cobrança ${chargeId} não encontrada no banco.`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // 2. Buscar o segredo de webhook desta empresa específica
        const { data: configData } = await (supabaseAdmin.from("configuracoes") as any)
            .select("valor")
            .eq("empresa_id", parcela.empresa_id)
            .eq("chave", "efibank_credentials")
            .single();

        const webhookSecret = configData?.valor?.webhook_secret || process.env.EFIBANK_WEBHOOK_SECRET;

        // 3. Validar se o token enviado bate com o segredo da empresa
        if (webhookSecret) {
            const authHeader = request.headers.get("authorization") || request.headers.get("x-webhook-secret") || "";
            const token = authHeader.replace("Bearer ", "").trim();

            if (token !== webhookSecret) {
                console.warn(`[Efí Webhook] Tentativa de acesso não autorizada para empresa ${parcela.empresa_id}. Token inválido.`);
                return NextResponse.json(
                    { error: "Unauthorized", message: "Token de webhook inválido" },
                    { status: 401 }
                );
            }
        }

        const status = body.status || body.identifiers?.status;

        // Se o status da EfíBank indica pagamento confirmado
        if (status === "paid" || status === "settled") {
            if (parcela.status !== "pago") {
                await (supabaseAdmin.from("crediario_parcelas") as any)
                    .update({
                        status: "pago",
                        data_pagamento: new Date().toISOString(),
                        forma_pagamento: "boleto_efibank",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", parcela.id);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Erro no webhook EfíBank:", error);
        // Sempre retornar 200 para evitar retries excessivos de notificações que já falharam por outros motivos
        return NextResponse.json({ received: true }, { status: 200 });
    }
}
