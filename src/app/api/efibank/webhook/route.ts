import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/efibank/webhook
 * 
 * Recebe notificações de pagamento da EfíBank.
 * Atualiza o status das parcelas automaticamente.
 * 
 * A EfíBank envia um POST com { notification } contendo o token.
 * Depois precisamos consultar os detalhes da notificação.
 */
export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();
        const { notification } = body;

        if (!notification) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // A EfíBank envia notificações com o token contendo o charge_id atualizado
        // O formato pode variar, processar o que recebemos
        const chargeId = body.identifiers?.charge_id || body.charge_id;
        const status = body.status || body.identifiers?.status;

        if (!chargeId) {
            console.log("Webhook EfíBank sem charge_id:", JSON.stringify(body));
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // Buscar a parcela pelo efibank_charge_id
        const { data: parcela, error: findErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .select("id, status, crediario_id")
            .eq("efibank_charge_id", chargeId)
            .single();

        if (findErr || !parcela) {
            console.log(`Webhook EfíBank: parcela com charge_id ${chargeId} não encontrada`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

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

                console.log(`Webhook: Parcela ${parcela.id} marcada como paga via EfíBank`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Erro no webhook EfíBank:", error);
        // Sempre retornar 200 para evitar retries excessivos
        return NextResponse.json({ received: true }, { status: 200 });
    }
}
