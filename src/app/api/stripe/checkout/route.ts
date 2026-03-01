import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession) {
            return NextResponse.json({ error: "Não autorizado. Faça login primeiro." }, { status: 401 });
        }

        const { empresaId, email } = await req.json();

        if (!empresaId || !email) {
            return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
        }

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
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "pix"],
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: "Plano Profissional — Phone Smart ERP",
                            description: "Assinatura mensal para controle total da sua assistência técnica.",
                        },
                        unit_amount: 14900, // R$ 149,00
                        recurring: {
                            interval: "month",
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?payment=cancel`,
            metadata: {
                empresa_id: empresaId,
                user_id: authSession.user.id
            },
            customer_email: email,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("[Stripe Checkout Error]", error);
        return NextResponse.json({ error: "Erro interno ao processar pagamento." }, { status: 500 });
    }
}
