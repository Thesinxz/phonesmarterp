import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number; name: string }> = {
    starter: { monthly: 2490, yearly: 1990, name: "Plano Starter" },
    essencial: { monthly: 4990, yearly: 3990, name: "Plano Essencial" },
    pro: { monthly: 9990, yearly: 7990, name: "Plano Pro" },
    enterprise: { monthly: 24900, yearly: 19900, name: "Plano Enterprise" },
};

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession) {
            return NextResponse.json({ error: "Não autorizado. Faça login primeiro." }, { status: 401 });
        }

        const { empresaId, email, planId, isAnual } = await req.json();

        if (!empresaId || !planId) {
            return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
        }

        const planConfig = PLAN_PRICES[planId];
        if (!planConfig) {
            return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
        }

        const amount = isAnual ? planConfig.yearly : planConfig.monthly;

        // 1. Verificar se o usuário realmente pertence a esta empresa e tem permissão (Admin)
        const { data: profile } = await (supabase.from("usuarios") as any)
            .select("id, empresa_id, papel")
            .eq("auth_user_id", authSession.user.id)
            .eq("empresa_id", empresaId)
            .single();

        if (!profile || profile.papel !== 'admin') {
            return NextResponse.json({ error: "Apenas administradores podem gerenciar a assinatura." }, { status: 403 });
        }

        // 2. Criar Checkout Session no Stripe
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        console.log("[Stripe Checkout] Creating session for:", { email: email || authSession.user.email, planId, amount });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "pix"],
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: `${planConfig.name} — Phone Smart ERP`,
                            description: `Assinatura ${isAnual ? 'anual' : 'mensal'} para controle total da sua assistência técnica.`,
                        },
                        unit_amount: amount,
                        recurring: {
                            interval: isAnual ? "year" : "month",
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${siteUrl}/dashboard?payment=success`,
            cancel_url: `${siteUrl}/planos/checkout/${planId}?payment=cancel`,
            metadata: {
                empresa_id: empresaId,
                user_id: authSession.user.id,
                plan_id: planId,
                is_anual: String(isAnual)
            },
            customer_email: email || authSession.user.email,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("[Stripe Checkout Error Full]", error);
        return NextResponse.json({ 
            error: "Erro interno ao processar pagamento.",
            details: error.message 
        }, { status: 500 });
    }
}

