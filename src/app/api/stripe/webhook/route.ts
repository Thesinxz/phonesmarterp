import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") || "";

    let event: Stripe.Event;

    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error("STRIPE_WEBHOOK_SECRET is not defined.");
        }
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`[Stripe Webhook Error] Signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const supabase = await createClient();

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const empresaId = session.metadata?.empresa_id;
            const planId = session.metadata?.plan_id;
            const isAnual = session.metadata?.is_anual === 'true';

            if (empresaId && planId) {
                logger.log(`[Stripe Webhook] Checkout completed for empresa_id: ${empresaId}, plan: ${planId}`);

                // Atualizar plano da empresa
                await (supabase.from("empresas") as any)
                    .update({
                        plano: planId,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", empresaId);

                // Atualizar usuários
                await (supabase.from("usuarios") as any)
                    .update({
                        plano: planId,
                        plano_expira_em: isAnual 
                            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                            : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription
                    })
                    .eq("empresa_id", empresaId);
            }
            break;
        }

        case "customer.subscription.updated":
        case "customer.subscription.created": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            
            // Aqui poderíamos atualizar o status do plano baseado no status da subscription (active, trialing, past_due, etc)
            const status = subscription.status;
            logger.log(`[Stripe Webhook] Subscription ${event.type}: ${subscription.id} is now ${status}`);

            if (status === 'active' || status === 'trialing') {
                // Sincronizar status se necessário
            }
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            logger.log(`[Stripe Webhook] Subscription deleted: ${subscription.id}`);

            // Reverter para plano gratuito ou desativar acesso
            await (supabase.from("usuarios") as any)
                .update({ 
                    plano: 'starter', // Ou algum plano default
                    stripe_subscription_id: null 
                })
                .eq("stripe_customer_id", customerId);
            break;
        }

        default:
            logger.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

