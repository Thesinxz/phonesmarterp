import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();
        const { parcela_id, novo_vencimento, novo_valor_centavos } = body;

        if (!parcela_id) {
            return NextResponse.json({ error: "parcela_id é obrigatório" }, { status: 400 });
        }

        // Autenticar
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { data: parcela, error: parcelaErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .select("status")
            .eq("id", parcela_id)
            .single();

        if (parcelaErr || !parcela) {
            return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
        }

        if (parcela.status === "pago") {
            return NextResponse.json({ error: "Não é possível editar uma parcela já paga" }, { status: 400 });
        }

        const updates: any = { updated_at: new Date().toISOString() };
        if (novo_vencimento) updates.vencimento = novo_vencimento;
        if (novo_valor_centavos) updates.valor_centavos = novo_valor_centavos;

        // Resetar status de atrasado para pendente se o vencimento for empurrado pra frente
        if (novo_vencimento && new Date(novo_vencimento) >= new Date()) {
            updates.status = "pendente"; // volta a ser pendente caso estivesse em atraso
        }

        const { error: updateErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .update(updates)
            .eq("id", parcela_id);

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erro na edição de parcela:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
