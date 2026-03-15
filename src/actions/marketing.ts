"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type MarketingCampanha } from "@/services/marketing";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { requireFeature } from "@/lib/plans/guard";

export async function createCampanhaAdmin(campanha: Omit<MarketingCampanha, "id" | "created_at" | "enviado_em" | "total_enviados" | "total_falhas">) {
    await requireFeature('marketing_campanhas');
    const adminSupabase = getSupabaseAdmin();

    // Prevent schema cache errors from unused columns in Postgres
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mensagem_preview, ...safeCampanha } = campanha as any;

    const { data, error } = await (adminSupabase.from("marketing_campanhas") as any)
        .insert(safeCampanha)
        .select()
        .single();

    if (error) {
        throw new Error(`Erro ao criar campanha (Admin): ${error.message} - Code: ${error.code}`);
    }
    revalidatePath("/marketing", "layout");
    return data as MarketingCampanha;
}

export async function updateCampanhaAdmin(id: string, updates: Partial<MarketingCampanha>) {
    await requireFeature('marketing_campanhas');
    const adminSupabase = getSupabaseAdmin();
    const { error } = await (adminSupabase.from("marketing_campanhas") as any)
        .update(updates)
        .eq("id", id);

    if (error) {
        throw new Error(`Erro ao atualizar campanha (Admin): ${error.message}`);
    }
    revalidatePath("/marketing", "layout");
}

export async function deleteCampanhaAdmin(id: string) {
    await requireFeature('marketing_campanhas');
    const adminSupabase = getSupabaseAdmin();
    const { error } = await (adminSupabase.from("marketing_campanhas") as any)
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error(`Erro ao deletar campanha (Admin): ${error.message}`);
    }
    revalidatePath("/marketing", "layout");
}

export async function getCampanhasAdmin(empresa_id: string, page = 1, limit = 20) {
    await requireFeature('marketing_campanhas');
    noStore(); // Impede o Next.js de fazer o cache dessa chamada via Data Cache
    if (!empresa_id) throw new Error("empresa_id é obrigatório");

    const adminSupabase = getSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count, error } = await (adminSupabase.from("marketing_campanhas") as any)
        .select("*", { count: "exact" })
        .eq("empresa_id", empresa_id)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        throw new Error(`Erro ao buscar campanhas (Admin): ${error.message}`);
    }

    return {
        data: (data || []) as MarketingCampanha[],
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
    };
}

export async function getPriceListProducts(empresa_id: string, filters: { brand_id?: string, item_type?: string }) {
    await requireFeature('marketing_pdf');
    const adminSupabase = getSupabaseAdmin();

    // 1. Buscar produtos do catálogo
    let query = (adminSupabase.from("catalog_items") as any)
        .select(`
            *,
            brand:brands(name)
        `)
        .eq("empresa_id", empresa_id)
        .eq("show_in_storefront", true) // Apenas itens habilitados para vitrine/loja
        .gt("stock_qty", 0) // Com estoque
        .order("name");

    if (filters.brand_id) {
        query = query.eq("brand_id", filters.brand_id);
    }
    if (filters.item_type && filters.item_type !== 'todos') {
        query = query.eq("item_type", filters.item_type);
    }

    const { data: products, error: prodError } = await query;
    if (prodError) throw new Error(`Erro ao buscar produtos: ${prodError.message}`);

    // 2. Buscar Gateway de pagamento padrão para taxas
    const { data: gateway, error: gateError } = await (adminSupabase.from("payment_gateways") as any)
        .select("*")
        .eq("empresa_id", empresa_id)
        .eq("enabled", true)
        .eq("is_default", true)
        .maybeSingle();

    if (gateError) throw new Error(`Erro ao buscar gateway: ${gateError.message}`);

    return {
        products: (products || []) as any[],
        gateway: gateway as any
    };
}
