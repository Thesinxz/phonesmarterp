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

        if (empresaId) {
            const supabase = await createClient();
            logger.log(`[Stripe Webhook] Payment confirmed for empresa_id: ${empresaId}`);

            // Atualizar plano da empresa
            const { error: updateError } = await (supabase.from("empresas") as any)
                .update({
                    plano: "profissional",
                    updated_at: new Date().toISOString()
                })
                .eq("id", empresaId);

            if (updateError) {
                console.error(`[Stripe Webhook] Database update failed for ${empresaId}:`, updateError);
                return NextResponse.json({ error: "Failed to update company plan" }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
