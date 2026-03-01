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

        // Opcionalmente podemos cancelar na Efibank se for tipo efibank
        // e se não tiver pagamentos.
        // Por hora, apenas excluiremos do banco local. O RLS + FK Cascade fará o resto.
        // A trigger e as fk properties (ON DELETE CASCADE) nas parcelas facilitarão as exclusões.

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
