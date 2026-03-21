"use server";

import { createClient } from "@/lib/supabase/server";
import { CatalogItem } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function createCatalogItem(item: Partial<CatalogItem> & { empresa_id: string }) {
    const supabase = await createClient();
    
    // Assegura que o tipo de item é válido
    if (!['celular', 'acessorio', 'peca'].includes(item.item_type || '')) {
        throw new Error("Tipo de item inválido");
    }

    const { data, error } = await (supabase as any)
        .from("catalog_items")
        .insert(item)
        .select()
        .single();

    if (error) {
        console.error("Error creating catalog item:", error);
        throw new Error(error.message);
    }
    
    revalidatePath('/estoque');
    return data as CatalogItem;
}

export async function updateCatalogItem(id: string, item: Partial<CatalogItem>) {
    console.log("[Service] Updating catalog item:", id);
    const supabase = await createClient();
    
    // Antes de atualizar, buscar o estado atual para ver se é uma precificação de trade-in
    const { data: currentItem, error: fetchError } = await (supabase as any)
        .from("catalog_items")
        .select("sale_price, empresa_id")
        .eq("id", id)
        .single();

    if (fetchError) {
        console.error("[Service] Error fetching current item state:", fetchError);
        // Não jogamos erro aqui para permitir a atualização mesmo se o select falhar (por RLS ou algo assim)
    }
    
    console.log("[Service] Executing update for:", id);
    const { data, error } = await (supabase as any)
        .from("catalog_items")
        .update(item)
        .eq("id", id)
        .select()
        .single();
        
    if (error) {
        console.error("[Service] Error updating catalog item:", error);
        throw new Error(error.message);
    }

    console.log("[Service] Update successful for:", id);

    // Lógica de precificação de trade-in:
    // Se sale_price era 0 (ou nulo) e agora é > 0, e existe um IMEI vinculando 'trade_in'
    if (currentItem && (!currentItem.sale_price || currentItem.sale_price === 0) && item.sale_price && item.sale_price > 0) {
        try {
            console.log("[Service] Checking trade-in status for item:", id);
            const { data: imeiRecord } = await (supabase as any)
                .from("device_imeis")
                .select("id, imei")
                .eq("catalog_item_id", id)
                .eq("status", 'trade_in')
                .maybeSingle();

            if (imeiRecord) {
                console.log("[Service] Found trade-in record, updating status to 'em_estoque'");
                // Transição para disponível em estoque
                await (supabase as any)
                    .from("device_imeis")
                    .update({ status: 'em_estoque', updated_at: new Date().toISOString() })
                    .eq("id", imeiRecord.id);

                await (supabase as any).from("imei_history").insert({
                    tenant_id: currentItem.empresa_id,
                    imei_id: imeiRecord.id,
                    imei: imeiRecord.imei,
                    event_type: 'precificado',
                    from_status: 'trade_in',
                    to_status: 'em_estoque',
                    notes: 'Aparelho de trade-in precificado e disponível para venda',
                });
            }
        } catch (tradeInErr) {
            console.error("[Service] Trade-in logic failed (non-critical):", tradeInErr);
            // Seguimos sem estourar erro pois o update principal funcionou
        }
    }
    
    console.log("[Service] Revalidating path /estoque");
    revalidatePath('/estoque');
    return data as CatalogItem;
}

export async function deleteCatalogItem(id: string) {
    const supabase = await createClient();
    
    // Manual cleanup of related records in case DB cascade is not set
    await (supabase as any).from("stock_movements").delete().eq("catalog_item_id", id);
    await (supabase as any).from("unit_stock").delete().eq("catalog_item_id", id);

    const { error } = await (supabase as any)
        .from("catalog_items")
        .delete()
        .eq("id", id);
        
    if (error) {
        console.error("Error deleting catalog item:", error);
        throw new Error(error.message);
    }
    
    revalidatePath('/estoque');
    return true;
}

export async function getCatalogItem(id: string) {
    const supabase = await createClient();
    
    const { data, error } = await (supabase as any)
        .from("catalog_items")
        .select(`
            *,
            brand:brands(name),
            pricing_segment:pricing_segments(name, default_margin, requires_nf)
        `)
        .eq("id", id)
        .single();
        
    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error("Error getting catalog item:", error);
        throw new Error(error.message);
    }
    
    return data;
}

export async function getCatalogItems(
    empresa_id: string,
    filters?: {
        search?: string;
        item_type?: string;
        brand_id?: string;
        category_id?: string;
        stock_status?: string; // 'in_stock', 'low_stock', 'out_of_stock'
        page?: number;
        pageSize?: number;
    }
) {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    let query = (supabase as any)
        .from("catalog_items")
        .select(`
            *,
            brand:brands(name)
        `, { count: 'exact' })
        .eq("empresa_id", empresa_id)
        .order("created_at", { ascending: false })
        .range(from, to);
        
    if (filters?.search) {
        const words = filters.search.trim().split(/\s+/).filter(w => w.length > 0);
        words.forEach(word => {
            query = query.or(`name.ilike.%${word}%,subcategory.ilike.%${word}%,compatible_models.ilike.%${word}%,imei.ilike.%${word}%,barcode.ilike.%${word}%,sku.ilike.%${word}%`);
        });
    }
    
    if (filters?.item_type && filters.item_type !== 'todos') {
        query = query.eq("item_type", filters.item_type);
    }
    
    if (filters?.brand_id) {
        query = query.eq("brand_id", filters.brand_id);
    }

    if (filters?.category_id) {
        query = query.eq("category_id", filters.category_id);
    }
    
    if (filters?.stock_status) {
        if (filters.stock_status === 'in_stock') {
            query = query.gt("stock_qty", 0);
        } else if (filters.stock_status === 'out_of_stock') {
            query = query.lte("stock_qty", 0);
        } else if (filters.stock_status === 'low_stock') {
            query = query.gt("stock_qty", 0);
        }
    }

    const { data, error, count } = await query;
    if (error) {
        console.error("Error fetching catalog items:", error);
        return { items: [], total: 0 };
    }

    // Buscar unit_stocks separado para evitar duplicatas
    let result = data || [];
    if (result.length > 0) {
        const { data: stocks } = await (supabase as any)
            .from("unit_stock")
            .select("catalog_item_id, qty, unit_id")
            .in("catalog_item_id", result.map((i: any) => i.id));

        // Merge: adicionar unit_stocks em cada item
        result = result.map((item: any) => ({
            ...item,
            unit_stock: (stocks || []).filter((s: any) => s.catalog_item_id === item.id)
        }));
    }
    
    let filteredData = result;
    if (filters?.stock_status === 'low_stock') {
        filteredData = (result as any[]).filter((item: any) => item.stock_qty > 0 && item.stock_qty <= (item.stock_alert_qty || 1));
    }
    
    return { items: filteredData, total: count || 0 };
}
export async function bulkUpdateCatalogItems(ids: string[], updates: Partial<CatalogItem>) {
    const supabase = await createClient();
    
    const { error } = await (supabase as any)
        .from("catalog_items")
        .update(updates)
        .in("id", ids);
        
    if (error) {
        console.error("Error bulk updating items:", error);
        throw new Error(error.message);
    }
    
    revalidatePath('/estoque');
    return true;
}
