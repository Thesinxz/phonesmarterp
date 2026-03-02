import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();
        const { crediario_id } = body;

        if (!crediario_id) {
            return NextResponse.json({ error: "crediario_id é obrigatório" }, { status: 400 });
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

        // 1. Buscar o crediário antes de excluir para pegar o venda_id e empresa_id
        const { data: crediarioData } = await (supabaseAdmin.from("crediarios") as any)
            .select("id, empresa_id, venda_id")
            .eq("id", crediario_id)
            .single();

        if (crediarioData) {
            // 2. Buscar as parcelas deste crediário para limpeza financeira
            const { data: parcelas } = await (supabaseAdmin.from("crediario_parcelas") as any)
                .select("id")
                .eq("crediario_id", crediario_id);

            const parcelaIds = (parcelas || []).map((p: any) => p.id);

            // 3. Limpar movimentações de caixa relacionadas às parcelas
            if (parcelaIds.length > 0) {
                await (supabaseAdmin.from("caixa_movimentacoes") as any)
                    .delete()
                    .in("origem_id", parcelaIds);

                await (supabaseAdmin.from("financeiro_titulos") as any)
                    .delete()
                    .in("origem_id", parcelaIds);
            }

            // 4. Se o crediário estiver vinculado a uma venda, limpar os títulos da venda também
            // Isso resolve o problema de valores duplicados (venda + crediario) que continuam aparecendo
            if (crediarioData.venda_id) {
                await (supabaseAdmin.from("financeiro_titulos") as any)
                    .delete()
                    .eq("origem_id", crediarioData.venda_id)
                    .eq("origem_tipo", "venda");

                await (supabaseAdmin.from("caixa_movimentacoes") as any)
                    .delete()
                    .eq("origem_id", crediarioData.venda_id);
            }
        }

        // 5. Excluir o crediário
        const { error: delErr } = await (supabaseAdmin.from("crediarios") as any)
            .delete()
            .eq("id", crediario_id);

        if (delErr) {
            return NextResponse.json({ error: "Erro ao excluir crediário", detail: delErr }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erro na exclusão de crediário:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
