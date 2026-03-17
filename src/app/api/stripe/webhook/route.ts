import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import Stripe from "stripe";

// Mapeamento entre os IDs do frontend/Stripe e o que o Banco de Dados suporta
// Isso evita erros caso o banco use 'profissional' mas o código use 'essencial'
const DB_PLAN_MAP: Record<string, string> = {
    'starter': 'starter',
    'essencial': 'profissional', 
    'pro': 'profissional',
    'enterprise': 'enterprise'
};

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

    // Usar ADMIN para ignorar RLS e garantir que o update aconteça no servidor
    const supabase = getSupabaseAdmin();

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const empresaId = session.metadata?.empresa_id;
            const planId = session.metadata?.plan_id;
            const isAnual = session.metadata?.is_anual === 'true';

            console.log(`[Stripe Webhook] Received checkout.session.completed:`, {
                empresaId,
                planId,
                isAnual,
                customerId: session.customer,
                subscriptionId: session.subscription
            });

            if (empresaId && planId) {
                const dbPlan = DB_PLAN_MAP[planId] || planId;
                
                // Buscar data de expiração real da assinatura no Stripe
                let expiresAt: string;
                try {
                    if (session.subscription) {
                        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                        expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
                    } else {
                        expiresAt = isAnual 
                            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                            : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
                    }
                } catch (e) {
                    console.error("[Stripe Webhook] Error fetching subscription details:", e);
                    expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
                }

                console.log(`[Stripe Webhook] Updating DB. Plan Target: ${dbPlan}, Expires At: ${expiresAt}`);

                // 1. Atualizar plano da empresa
                const { error: errorEmpresa } = await (supabase.from("empresas") as any)
                    .update({
                        plano: dbPlan,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", empresaId);

                if (errorEmpresa) {
                    console.error("[Stripe Webhook] Error updating empresas table:", errorEmpresa);
                }

                // 2. Atualizar todos os usuários da empresa
                // Nota: limpamos o trial_end pois o usuário agora tem uma assinatura paga
                const { error: errorUsuarios } = await (supabase.from("usuarios") as any)
                    .update({
                        plano: dbPlan,
                        plano_expira_em: expiresAt,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        trial_end: null
                    })
                    .eq("empresa_id", empresaId);

                if (errorUsuarios) {
                    console.error("[Stripe Webhook] Error updating usuarios table:", errorUsuarios);
                }

                console.log(`[Stripe Webhook] Successfully processed checkout for empresa ${empresaId}`);
            } else {
                console.warn("[Stripe Webhook] Missing metadata in session:", session.id);
            }
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            console.log(`[Stripe Webhook] Subscription deleted: ${subscription.id} for customer ${customerId}`);

            // Reverter para plano starter (gratuito/base)
            await (supabase.from("usuarios") as any)
                .update({ 
                    plano: 'starter',
                    stripe_subscription_id: null 
                })
                .eq("stripe_customer_id", customerId);
            break;
        }

        default:
            console.log(`[Stripe Webhook] Event received and ignored: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
