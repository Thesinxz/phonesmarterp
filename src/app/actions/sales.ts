"use server";

import { createClient } from "@/lib/supabase/server";

interface SaleProductResult {
  type: 'imei' | 'barcode' | 'text'
  products: {
    id: string
    name: string
    condition: string
    brand: string
    salePrice: number
    costPrice?: number
    margin?: number
    marginPercent?: number
    stockQty: number
    unitName: string
    imei?: string
    imeiStatus?: string
    imeiId?: string
    barcode?: string
    imageUrl?: string
    canSell: boolean
    blockReason?: string
  }[]
  message?: string
}

function detectInputType(input: string): 'imei' | 'barcode' | 'text' {
  const clean = input.trim();
  const digits = clean.replace(/\D/g, '');
  
  if (digits.length === 15) return 'imei';
  
  // EAN-13 or other numeric barcodes
  if (digits.length >= 8 && digits.length <= 14 && /^\d+$/.test(clean)) return 'barcode';
  
  // SMT- or PEC- SKUs
  if (clean.startsWith('SMT-') || clean.startsWith('PEC-')) return 'barcode';
  
  return 'text';
}

export async function searchProductForSale(params: {
  tenantId: string
  unitId: string
  query: string
  userRole: 'owner' | 'admin' | 'attendant'
}): Promise<SaleProductResult> {
  const supabase = await createClient();
  const { tenantId, unitId, query, userRole } = params;
  const inputType = detectInputType(query);
  const showMargins = userRole === 'owner' || userRole === 'admin';

  if (inputType === 'imei') {
    // 1. Search for IMEI
    const { data: imeiData, error: imeiError } = await (supabase.from("device_imeis") as any)
      .select(`
        *,
        catalog_item:catalog_items(*),
        sold_to_customer:clientes(nome)
      `)
      .eq("imei", query)
      .eq("tenant_id", tenantId)
      .single();

    if (imeiError || !imeiData) {
      return { type: 'imei', products: [], message: 'IMEI não encontrado no sistema.' };
    }

    const canSell = imeiData.status === 'em_estoque';
    let blockReason = "";
    if (imeiData.status === 'vendido') {
      const soldDate = imeiData.sold_at ? new Date(imeiData.sold_at).toLocaleDateString() : 'data desconhecida';
      blockReason = `Aparelho já vendido em ${soldDate} para ${imeiData.sold_to_customer?.nome || 'Cliente não identificado'}.`;
    } else if (imeiData.status === 'bloqueado') {
      blockReason = "IMEI bloqueado na Anatel ou administrativamente.";
    } else if (imeiData.status !== 'em_estoque') {
      blockReason = `Status atual: ${imeiData.status.replace('_', ' ')}.`;
    }

    // Get stock qty for this catalog item in this unit
    const { data: stockData } = await (supabase.from("unit_stocks") as any)
      .select("quantity")
      .eq("catalog_item_id", imeiData.catalog_item_id)
      .eq("unit_id", unitId)
      .single();

    const resultProduct = {
      id: imeiData.catalog_item?.id,
      name: imeiData.catalog_item?.name || "Produto Desconhecido",
      condition: imeiData.catalog_item?.condition || "N/A",
      brand: imeiData.catalog_item?.brand || "",
      salePrice: imeiData.catalog_item?.sale_price || 0,
      stockQty: stockData?.quantity || 0,
      unitName: "Loja Atual", // Could fetch unit name if needed
      imei: imeiData.imei,
      imeiStatus: imeiData.status,
      imeiId: imeiData.id,
      canSell,
      blockReason: canSell ? undefined : blockReason,
      ...(showMargins ? {
        costPrice: imeiData.catalog_item?.cost_price,
        margin: (imeiData.catalog_item?.sale_price || 0) - (imeiData.catalog_item?.cost_price || 0),
        marginPercent: imeiData.catalog_item?.cost_price > 0 
          ? (((imeiData.catalog_item?.sale_price || 0) - (imeiData.catalog_item?.cost_price || 0)) / imeiData.catalog_item?.sale_price) * 100 
          : 0
      } : {})
    };

    return { type: 'imei', products: [resultProduct] };
  }

  if (inputType === 'barcode' || inputType === 'text') {
    let queryBuilder = (supabase.from("catalog_items") as any)
      .select(`
        *,
        unit_stocks!inner(quantity, unit_id),
        brand:brands(name)
      `)
      .eq("empresa_id", tenantId)
      .eq("unit_stocks.unit_id", unitId);

    if (inputType === 'barcode') {
      queryBuilder = queryBuilder.or(`barcode.eq.${query},sku.eq.${query}`);
    } else {
      if (query.length < 2) return { type: 'text', products: [] };
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,barcode.eq.${query},sku.eq.${query}`).limit(10);
    }

    const { data: products, error } = await queryBuilder;

    if (error || !products) return { type: inputType, products: [] };

    const results = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      condition: p.condition || "N/A",
      brand: p.brand?.name || "",
      salePrice: p.sale_price,
      barcode: p.barcode,
      stockQty: p.unit_stocks?.[0]?.quantity || 0,
      unitName: "Loja Atual",
      canSell: (p.unit_stocks?.[0]?.quantity || 0) > 0,
      blockReason: (p.unit_stocks?.[0]?.quantity || 0) <= 0 ? "Produto sem estoque nesta unidade." : undefined,
      ...(showMargins ? {
        costPrice: p.cost_price,
        margin: p.sale_price - p.cost_price,
        marginPercent: p.cost_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0
      } : {})
    }));

    return { type: inputType, products: results };
  }

  return { type: 'text', products: [] };
}
