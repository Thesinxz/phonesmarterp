import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") || "";

    let event;

    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error("STRIPE_WEBHOOK_SECRET is not defined.");
        }
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`[Stripe Webhook Error] Signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const empresaId = session.metadata?.empresa_id;
        const planId = session.metadata?.plan_id;
        const isAnual = session.metadata?.is_anual === 'true';

        if (empresaId && planId) {
            const supabase = await createClient();
            logger.log(`[Stripe Webhook] Payment confirmed for empresa_id: ${empresaId}, plan: ${planId}`);

            // 1. Atualizar plano da empresa
            const { error: updateError } = await (supabase.from("empresas") as any)
                .update({
                    plano: planId,
                    updated_at: new Date().toISOString()
                })
                .eq("id", empresaId);

            if (updateError) {
                console.error(`[Stripe Webhook] Database update failed for empresa ${empresaId}:`, updateError);
            }

            // 2. Atualizar plano em todos os perfis vinculados a este usuário (ou todos os usuários da empresa?)
            // No SmartOS ERP, o plano costuma ser global para a empresa.
            // Mas o Migration 086 sugere que o plano também está na tabela usuarios.
            const { error: userUpdateError } = await (supabase.from("usuarios") as any)
                .update({
                    plano: planId,
                    plano_expira_em: isAnual 
                        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                        : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription
                })
                .eq("empresa_id", empresaId);

            if (userUpdateError) {
                console.error(`[Stripe Webhook] Users update failed for empresa ${empresaId}:`, userUpdateError);
            }
        }
    }

    return NextResponse.json({ received: true });
}

