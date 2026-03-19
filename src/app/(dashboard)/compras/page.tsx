import { createClient } from "@/lib/supabase/server";
import { ComprasListaClient } from "./ComprasListaClient";

export default async function ComprasPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("empresa_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile?.empresa_id) return null;

    // Buscar dados iniciais no servidor para performance instantânea (TTFB baixo)
    const { data: compras } = await (supabase as any)
        .from("compras")
        .select(`
            id, numero, fornecedor_id, fornecedor_nome, 
            data_compra, data_vencimento, valor_total, 
            status, origem, nota_fiscal_numero, created_at,
            compra_itens(count)
        `)
        .eq("empresa_id", profile.empresa_id)
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <ComprasListaClient 
            comprasIniciais={compras || []} 
            empresaId={profile.empresa_id} 
        />
    );
}
