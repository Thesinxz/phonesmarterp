import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession) {
            return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
        }

        const { empresaId } = await req.json();

        // 1. Buscar o stripe_customer_id do usuário/empresa
        const { data: profile } = await (supabase.from("usuarios") as any)
            .select("stripe_customer_id, empresa_id, papel")
            .eq("auth_user_id", authSession.user.id)
            .eq("empresa_id", empresaId)
            .single();

        if (!profile || !profile.stripe_customer_id) {
            return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada." }, { status: 404 });
        }

        // 2. Criar Billing Portal Session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/planos`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("[Stripe Portal Error]", error);
        return NextResponse.json({ error: "Erro ao abrir portal de cobrança." }, { status: 500 });
    }
}
