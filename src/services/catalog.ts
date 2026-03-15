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
    const supabase = await createClient();
    
    // Antes de atualizar, buscar o estado atual para ver se é uma precificação de trade-in
    const { data: currentItem } = await (supabase as any)
        .from("catalog_items")
        .select("sale_price, empresa_id")
        .eq("id", id)
        .single();

    const { data, error } = await (supabase as any)
        .from("catalog_items")
        .update(item)
        .eq("id", id)
        .select()
        .single();
        
    if (error) {
        console.error("Error updating catalog item:", error);
        throw new Error(error.message);
    }

    // Lógica de precificação de trade-in:
    // Se sale_price era 0 (ou nulo) e agora é > 0, e existe um IMEI vinculando 'trade_in'
    if ((!currentItem?.sale_price || currentItem.sale_price === 0) && item.sale_price && item.sale_price > 0) {
        const { data: imeiRecord } = await (supabase as any)
            .from("device_imeis")
            .select("id, imei")
            .eq("catalog_item_id", id)
            .eq("status", 'trade_in')
            .maybeSingle();

        if (imeiRecord) {
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
                // Aqui não temos performedBy fácil no service, mas podemos deixar registrado o evento
            });
        }
    }
    
    revalidatePath('/estoque');
    return data as CatalogItem;
}

export async function deleteCatalogItem(id: string) {
    const supabase = await createClient();
    
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
        stock_status?: string; // 'in_stock', 'low_stock', 'out_of_stock'
    }
) {
    const supabase = await createClient();
    
    let query = (supabase as any)
        .from("catalog_items")
        .select(`
            *,
            brand:brands(name)
        `)
        .eq("empresa_id", empresa_id)
        .order("created_at", { ascending: false });
        
    if (filters?.search) {
        // Full text search
        // Using ilike on multiple columns or Postgres search vector
        const q = filters.search.trim();
        query = query.or(`name.ilike.%${q}%,subcategory.ilike.%${q}%,compatible_models.ilike.%${q}%,imei.ilike.%${q}%,barcode.ilike.%${q}%,sku.ilike.%${q}%`);
    }
    
    if (filters?.item_type && filters.item_type !== 'todos') {
        query = query.eq("item_type", filters.item_type);
    }
    
    if (filters?.brand_id) {
        query = query.eq("brand_id", filters.brand_id);
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

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching catalog items:", error);
        return [];
    }
    
    let filteredData = data;
    if (filters?.stock_status === 'low_stock') {
        filteredData = (data as any[]).filter((item: any) => item.stock_qty > 0 && item.stock_qty <= (item.stock_alert_qty || 1));
    }
    
    return filteredData;
}
