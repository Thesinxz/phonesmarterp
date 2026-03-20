import { createClient } from "@/lib/supabase/server";
import { getCatalogItems } from "@/services/catalog";
import { EstoqueListaClient } from "./EstoqueListaClient";

export default async function EstoquePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("id, empresa_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile?.empresa_id) return null;

    // Buscar metadados e itens iniciais em paralelo
    const [bRes, uRes, tRes, sRes, catalogResult] = await Promise.all([
        supabase.from("brands").select("id, name").eq("empresa_id", profile.empresa_id).order("name"),
        supabase.from("units").select("id, name").eq("empresa_id", profile.empresa_id).eq("is_active", true),
        supabase.from("product_types").select("id, name, slug").order("name"),
        supabase.from("pricing_segments").select("id, name").eq("empresa_id", profile.empresa_id).order("name"),
        getCatalogItems(profile.empresa_id)
    ]);

    const items = catalogResult.items || [];

    // Buscar estoques por unidade da carga inicial
    let unitStocks: any[] = [];
    if (items.length > 0) {
        const { data: stocks } = await supabase
            .from("unit_stock")
            .select("*")
            .in("catalog_item_id", items.map((i: any) => i.id));
        if (stocks) unitStocks = stocks;
    }

    return (
        <EstoqueListaClient 
            initialItems={items}
            initialBrands={bRes.data || []}
            initialUnits={uRes.data || []}
            initialProductTypes={tRes.data || []}
            initialPricingSegments={sRes.data || []}
            initialUnitStocks={unitStocks}
            empresaId={profile.empresa_id}
            profileId={profile.id}
        />
    );
}
