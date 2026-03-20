"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createInternalNotification } from "@/actions/notifications";

/**
 * Normaliza o nome do modelo: minúsculas, sem caracteres especiais, espaços por hífens.
 */
import { normalizeDeviceModel } from "@/utils/normalize";

export interface PartSearchResult {
    id: string;
    name: string;
    partType: string;
    quality: string;
    matchedModels: string[];
    stockByUnit: {
        unitId: string;
        unitName: string;
        qty: number;
        alertQty: number;
        status: 'ok' | 'low' | 'empty';
    }[];
    totalStock: number;
}

/**
 * Busca peças compatíveis com um modelo, com estoque de todas as unidades.
 */
export async function searchPartsByModel(
    tenantId: string,
    deviceModel: string
): Promise<PartSearchResult[]> {
    const supabase = await createClient();
    const normalized = normalizeDeviceModel(deviceModel);

    // 1. Buscar catalog_item_id compatíveis via part_compatibility
    const { data: compatibilities, error: compatError } = await (supabase as any)
        .from('part_compatibility')
        .select(`
            catalog_item_id,
            device_model_display,
            catalog_items!inner(
                id,
                name,
                part_type,
                quality
            )
        `)
        .eq('tenant_id', tenantId)
        .ilike('device_model', `%${normalized}%`);

    if (compatError) throw compatError;

    // Agrupar matches por item
    const itemMatchesMap = new Map<string, { item: any, matchedModels: string[] }>();
    (compatibilities || []).forEach((c: any) => {
        const item = c.catalog_items;
        if (!itemMatchesMap.has(item.id)) {
            itemMatchesMap.set(item.id, { item, matchedModels: [] });
        }
        itemMatchesMap.get(item.id)!.matchedModels.push(c.device_model_display);
    });

    const itemIds = Array.from(itemMatchesMap.keys());
    if (itemIds.length === 0) return [];

    // 2. Buscar unidades com capacidade de estoque e seus estoques
    const [unitsRes, stockRes] = await Promise.all([
        (supabase as any).from('units').select('id, name').eq('empresa_id', tenantId).eq('is_active', true).eq('has_parts_stock', true).order('name'),
        (supabase as any).from('unit_stock').select('*').eq('tenant_id', tenantId).in('catalog_item_id', itemIds)
    ]);

    if (unitsRes.error) throw unitsRes.error;
    if (stockRes.error) throw stockRes.error;

    const units = (unitsRes.data || []) as any[];
    const stocks = (stockRes.data || []) as any[];

    // 3. Montar resultados
    const results: PartSearchResult[] = itemIds.map(id => {
        const { item, matchedModels } = itemMatchesMap.get(id)!;
        const itemStocks = stocks.filter(s => s.catalog_item_id === id);

        const stockByUnit = units.map(u => {
            const s = itemStocks.find(st => st.unit_id === u.id);
            const qty = s?.qty || 0;
            const alertQty = s?.alert_qty || 2;
            
            let status: 'ok' | 'low' | 'empty' = 'empty';
            if (qty <= 0) status = 'empty';
            else if (qty <= alertQty) status = 'low';
            else status = 'ok';

            return {
                unitId: u.id,
                unitName: u.name,
                qty,
                alertQty,
                status
            };
        });

        const totalStock = stockByUnit.reduce((acc, curr) => acc + curr.qty, 0);

        return {
            id: item.id,
            name: item.name,
            partType: item.part_type || 'outro',
            quality: item.quality || 'outro',
            matchedModels: Array.from(new Set(matchedModels)),
            stockByUnit,
            totalStock
        };
    });

    // 4. Ordenação
    const typeOrder = ['tela', 'bateria', 'conector', 'camera', 'tampa', 'outro'];
    const qualityOrder = ['original', 'oem', 'paralela', 'china'];

    return results.sort((a, b) => {
        const typeA = typeOrder.indexOf(a.partType.toLowerCase());
        const typeB = typeOrder.indexOf(b.partType.toLowerCase());
        if (typeA !== typeB) return (typeA === -1 ? 99 : typeA) - (typeB === -1 ? 99 : typeB);

        const qualityA = qualityOrder.indexOf(a.quality.toLowerCase());
        const qualityB = qualityOrder.indexOf(b.quality.toLowerCase());
        if (qualityA !== qualityB) return (qualityA === -1 ? 99 : qualityA) - (qualityB === -1 ? 99 : qualityB);

        if (a.totalStock === 0 && b.totalStock > 0) return 1;
        if (a.totalStock > 0 && b.totalStock === 0) return -1;

        return a.name.localeCompare(b.name);
    });
}

/**
 * Retorna os modelos compatíveis de uma peça.
 */
export async function getPartCompatibleModels(
    tenantId: string,
    catalogItemId: string
): Promise<{ id: string; deviceModel: string; deviceModelDisplay: string }[]> {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
        .from('part_compatibility')
        .select('id, device_model, device_model_display')
        .eq('tenant_id', tenantId)
        .eq('catalog_item_id', catalogItemId);

    if (error) throw error;
    return (data || []).map((d: any) => ({
        id: d.id,
        deviceModel: d.device_model,
        deviceModelDisplay: d.device_model_display
    }));
}

/**
 * Salva a lista completa de modelos compatíveis de uma peça.
 */
export async function savePartCompatibleModels(
    tenantId: string,
    catalogItemId: string,
    models: { deviceModel: string; deviceModelDisplay: string }[]
): Promise<void> {
    const supabase = await createClient();

    // 1. Remover existentes
    const { error: delError } = await (supabase as any)
        .from('part_compatibility')
        .delete()
        .eq('catalog_item_id', catalogItemId);

    if (delError) throw delError;

    // 2. Inserir novos
    if (models.length > 0) {
        const { error: insError } = await (supabase as any)
            .from('part_compatibility')
            .insert(models.map(m => ({
                tenant_id: tenantId,
                catalog_item_id: catalogItemId,
                device_model: normalizeDeviceModel(m.deviceModel),
                device_model_display: m.deviceModelDisplay
            })));
        if (insError) throw insError;
    }

    revalidatePath('/estoque');
}

/**
 * Autocomplete de modelos.
 */
export async function getExistingDeviceModels(
    tenantId: string,
    search: string
): Promise<{ deviceModel: string; deviceModelDisplay: string; usageCount: number }[]> {
    if (search.length < 2) return [];

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
        .from('part_compatibility')
        .select('device_model, device_model_display')
        .eq('tenant_id', tenantId)
        .ilike('device_model_display', `%${search}%`);

    if (error) throw error;

    const statsMap = new Map<string, { display: string, count: number }>();
    (data || []).forEach((d: any) => {
        const current = statsMap.get(d.device_model) || { display: d.device_model_display, count: 0 };
        current.count++;
        statsMap.set(d.device_model, current);
    });

    return Array.from(statsMap.entries())
        .map(([model, info]) => ({
            deviceModel: model,
            deviceModelDisplay: info.display,
            usageCount: info.count
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);
}

/**
 * Registra o uso de uma peça em uma OS.
 */
export async function usePartInOS(params: {
    tenantId: string;
    osId: string;
    catalogItemId: string;
    unitId: string;
    qty: number;
    technicianId: string;
}): Promise<{ success: boolean; newQty: number; error?: string }> {
    const supabase = await createClient();

    // 1. Verificar estoque
    const { data: stock } = await (supabase as any)
        .from('unit_stock')
        .select('qty')
        .eq('unit_id', params.unitId)
        .eq('catalog_item_id', params.catalogItemId)
        .single();

    if (!stock || stock.qty < params.qty) {
        return { success: false, newQty: stock?.qty || 0, error: 'Estoque insuficiente' };
    }

    // 2. Decrementar unit_stock
    const { data: updatedStock, error: updateError } = await (supabase as any)
        .from('unit_stock')
        .update({ qty: stock.qty - params.qty })
        .eq('unit_id', params.unitId)
        .eq('catalog_item_id', params.catalogItemId)
        .select('qty')
        .single();

    if (updateError) throw updateError;

    // 3. Registrar movimentação
    await (supabase as any).from('stock_movements').insert({
        tenant_id: params.tenantId,
        unit_id: params.unitId,
        catalog_item_id: params.catalogItemId,
        movement_type: 'saida_os',
        qty: -params.qty,
        reference_id: params.osId,
        created_by: params.technicianId,
        notes: `Utilizado na OS: ${params.osId}`
    });

    // 4. Buscar cost_price atual
    const { data: item } = await (supabase as any)
        .from('catalog_items')
        .select('cost_price')
        .eq('id', params.catalogItemId)
        .single();

    // 5. Inserir em os_parts
    await (supabase as any).from('os_parts').insert({
        tenant_id: params.tenantId,
        os_id: params.osId,
        catalog_item_id: params.catalogItemId,
        unit_id: params.unitId,
        qty: params.qty,
        cost_price: item?.cost_price || 0,
        created_by: params.technicianId
    });

    revalidatePath(`/os/${params.osId}`);
    return { success: true, newQty: (updatedStock as any).qty };
}

/**
 * Remove uma peça da OS e devolve ao estoque.
 */
export async function removePartFromOS(params: {
    tenantId: string;
    osPartsId: string;
    technicianId: string;
}): Promise<{ success: boolean }> {
    const supabase = await createClient();

    // 1. Buscar os_parts
    const { data: osPart, error: fetchError } = await (supabase as any)
        .from('os_parts')
        .select('*')
        .eq('id', params.osPartsId)
        .single();

    if (fetchError || !osPart) throw new Error("Peça não encontrada na OS");

    // 2. Incrementar unit_stock
    const { data: stock } = await (supabase as any)
        .from('unit_stock')
        .select('id, qty')
        .eq('unit_id', (osPart as any).unit_id)
        .eq('catalog_item_id', (osPart as any).catalog_item_id)
        .single();

    if (stock) {
        await (supabase as any)
            .from('unit_stock')
            .update({ qty: (stock as any).qty + (osPart as any).qty })
            .eq('id', (stock as any).id);
    } else {
        await (supabase as any).from('unit_stock').insert({
            tenant_id: params.tenantId,
            unit_id: (osPart as any).unit_id,
            catalog_item_id: (osPart as any).catalog_item_id,
            qty: (osPart as any).qty
        });
    }

    // 3. Inserir movimentação
    await (supabase as any).from('stock_movements').insert({
        tenant_id: params.tenantId,
        unit_id: (osPart as any).unit_id,
        catalog_item_id: (osPart as any).catalog_item_id,
        movement_type: 'entrada',
        qty: (osPart as any).qty,
        reference_id: (osPart as any).os_id,
        created_by: params.technicianId,
        notes: `Estornado da OS: ${(osPart as any).os_id}`
    });

    // 4. Deletar de os_parts
    await (supabase as any).from('os_parts').delete().eq('id', params.osPartsId);

    revalidatePath(`/os/${(osPart as any).os_id}`);
    return { success: true };
}

/**
 * Lista as peças de uma OS.
 */
export async function getOSParts(osId: string) {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
        .from('os_parts')
        .select(`
            id,
            catalog_item_id,
            qty,
            cost_price,
            unit_id,
            units(name),
            catalog_items(name, part_type, quality)
        `)
        .eq('os_id', osId);

    if (error) throw error;
    
    return (data || []).map((p: any) => ({
        id: p.id,
        catalogItemId: p.catalog_item_id,
        name: p.catalog_items?.name || 'Item Removido',
        partType: p.catalog_items?.part_type || 'outro',
        quality: p.catalog_items?.quality || 'outro',
        qty: p.qty,
        unitId: p.unit_id,
        unitName: p.units?.name || 'Unidade N/A',
        costPrice: p.cost_price
    }));
}

/**
 * Solicita transferência de aparelho.
 */
export async function requestOSTransfer(params: {
    tenantId: string;
    osId: string;
    fromUnitId: string;
    toUnitId: string;
    requestedBy: string;
    notes?: string;
}): Promise<{ transferId: string }> {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
        .from('os_unit_transfers')
        .insert({
            tenant_id: params.tenantId,
            os_id: params.osId,
            from_unit_id: params.fromUnitId,
            to_unit_id: params.toUnitId,
            status: 'pendente',
            sent_by: params.requestedBy,
            notes: params.notes
        })
        .select('id')
        .single();

    if (error) throw error;

    revalidatePath(`/os/${params.osId}`);
    return { transferId: (data as any).id };
}

/**
 * Confirma o envio do aparelho.
 */
export async function confirmOSTransferSent(
    transferId: string,
    sentBy: string
): Promise<void> {
    const supabase = await createClient();

    const { data: transfer } = await (supabase as any)
        .from('os_unit_transfers')
        .update({
            status: 'em_transito',
            sent_at: new Date().toISOString(),
            sent_by: sentBy
        })
        .eq('id', transferId)
        .select(`
            os_id,
            to_unit_id,
            from_unit_id,
            units:from_unit_id(name),
            os:ordens_servico(numero, marca_equipamento, modelo_equipamento, problema_relatado, tenant_id)
        `)
        .single();

    if (transfer) {
        const t = transfer as any;
        await (supabase as any)
            .from('ordens_servico')
            .update({ status: 'em_transito' })
            .eq('id', t.os_id);
        
        // Notificar unidade de destino
        await createInternalNotification({
            tenantId: t.os.tenant_id,
            unitId: t.to_unit_id,
            message: `OS #${String(t.os.numero).padStart(4, '0')} chegando da ${t.units.name} — ${t.os.marca_equipamento} ${t.os.modelo_equipamento} · ${t.os.problema_relatado}`,
            link: `/os/${t.os_id}`
        });
            
        revalidatePath(`/os/${t.os_id}`);
    }
}

/**
 * Confirma o recebimento do aparelho.
 */
export async function confirmOSTransferReceived(
    transferId: string,
    receivedBy: string
): Promise<void> {
    const supabase = await createClient();

    const { data: transfer } = await (supabase as any)
        .from('os_unit_transfers')
        .update({
            status: 'recebido',
            received_at: new Date().toISOString(),
            received_by: receivedBy
        })
        .eq('id', transferId)
        .select('os_id, to_unit_id')
        .single();

        if (transfer) {
        await (supabase as any)
            .from('ordens_servico')
            .update({ 
                status: 'em_execucao',
                unit_id: (transfer as any).to_unit_id 
            })
            .eq('id', (transfer as any).os_id);
            
        revalidatePath(`/os/${(transfer as any).os_id}`);
    }
}

export async function adjustUnitStock(
  tenantId: string,
  catalogItemId: string,
  unitId: string,
  type: 'entrada' | 'saida' | 'ajuste',
  qty: number,
  reason: string,
  userId: string
) {
  const supabase = await createClient()
  
  // 1. Obter estoque atual da unidade
  const { data: currentStock } = await (supabase.from('unit_stock') as any)
    .select('qty')
    .eq('catalog_item_id', catalogItemId)
    .eq('unit_id', unitId)
    .single()
    
  let newQty = currentStock?.qty || 0
  
  if (type === 'entrada') newQty += qty
  else if (type === 'saida') newQty -= qty
  else if (type === 'ajuste') newQty = qty
  
  // 2. Upsert na unit_stock
  const { error: stockError } = await (supabase.from('unit_stock') as any)
    .upsert({
      catalog_item_id: catalogItemId,
      unit_id: unitId,
      qty: newQty,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'unit_id,catalog_item_id' })
    
  if (stockError) throw stockError
  
  // 3. Registrar movimento
  console.log("[Debug] Inserting stock movement:", {
    catalog_item_id: catalogItemId,
    unit_id: unitId,
    movement_type: type === 'saida' ? 'saida_os' : type,
    qty,
    created_by: userId,
    tenant_id: tenantId
  });
  
  const { error: moveError } = await (supabase.from('stock_movements') as any)
    .insert({
      catalog_item_id: catalogItemId,
      unit_id: unitId,
      movement_type: type === 'saida' ? 'saida_os' : type,
      qty,
      notes: reason,
      created_by: userId,
      tenant_id: tenantId
    })
    
  if (moveError) {
    console.error("[Debug] Stock movement error:", moveError);
    throw moveError
  }
  
  // 4. Atualizar total no catalog_items
  const { data: allStocks } = await (supabase.from('unit_stock') as any)
    .select('qty')
    .eq('catalog_item_id', catalogItemId)
    
  const totalQty = (allStocks as any[])?.reduce((acc: number, curr: any) => acc + curr.qty, 0) || 0
  
  await (supabase
    .from('catalog_items') as any)
    .update({ stock_qty: totalQty })
    .eq('id', catalogItemId)
    
  return { success: true, newQty }
}

/**
 * Cria um item de catálogo com estoque por unidade e modelos compatíveis.
 */
export async function createCatalogItemWithStock(params: {
    item: any;
    unitStocks: Record<string, number>;
    compatibleModels?: string[];
}) {
    const supabase = await createClient();
    console.log('[Server Action] createCatalogItemWithStock started. item name:', params.item.name);
    try {
        const { item, unitStocks, compatibleModels } = params;

        // 1. Criar o item no catálogo
        const { data: newItem, error: itemError } = await (supabase as any)
            .from('catalog_items')
            .insert(item)
            .select()
            .single();

        if (itemError) {
            console.error('[Server Action] catalog_items insert error:', itemError);
            throw new Error(`Erro ao criar item no catálogo: ${itemError.message}`);
        }

        const catalogItemId = newItem.id;
        console.log('[Server Action] catalog_items item created:', catalogItemId);

        // 2. Salvar estoques por unidade (apenas se tiver entradas válidas)
        const stockEntries = Object.entries(unitStocks)
            .filter(([_, qty]) => qty > 0)
            .map(([unitId, qty]) => ({
                tenant_id: item.empresa_id,
                catalog_item_id: catalogItemId,
                unit_id: unitId,
                qty: qty,
                alert_qty: item.stock_alert_qty || 2
            }));

        if (stockEntries.length > 0) {
            const { error: stockError } = await (supabase as any)
                .from('unit_stock')
                .insert(stockEntries);
            if (stockError) {
                console.error('[Server Action] unit_stock insert error (non-critical):', stockError);
                // Não lançar erro — o item já foi criado, só o estoque por unidade falhou ou foi omitido
            } else {
                console.log('[Server Action] unit_stock entries created:', stockEntries.length);
            }
        }

        // 3. Salvar modelos compatíveis se for peça
        if (item.item_type === 'peca' && compatibleModels && compatibleModels.length > 0) {
            try {
                await savePartCompatibleModels(
                    item.empresa_id,
                    catalogItemId,
                    compatibleModels.map(m => ({ deviceModel: m, deviceModelDisplay: m }))
                );
                console.log('[Server Action] compatible models saved:', compatibleModels.length);
            } catch (compatErr: any) {
                console.error('[Server Action] savePartCompatibleModels error:', compatErr);
                // Não derrubar tudo se a compatibilidade falhar, mas avisar
                // return newItem; // Opcional, ou jogar um erro específico
            }
        }

        revalidatePath('/estoque');
        return newItem;
    } catch (globalErr: any) {
        console.error('[Server Action] global error in createCatalogItemWithStock:', globalErr);
        throw globalErr;
    }
}

export async function getPartMovements(
  catalogItemId: string,
  page = 1,
  limit = 20,
  filters?: { unitId?: string, type?: string }
) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1
  
  let query = (supabase.from('stock_movements') as any)
    .select('*, units(name)', { count: 'exact' })
    .eq('catalog_item_id', catalogItemId)
    .order('created_at', { ascending: false })
    .range(from, to)
    
  if (filters?.unitId) query = query.eq('unit_id', filters.unitId)
  if (filters?.type) query = query.eq('movement_type', filters.type)
  
  const { data, count, error } = await query
  if (error) throw error
  
  // Enriquecer com nomes dos usuários (fechado manualmente para evitar problemas de join/RLS complexos)
  const userIds = Array.from(new Set((data || []).map((d: any) => d.created_by).filter(Boolean)));
  let enrichedData = data;
  
  if (userIds.length > 0) {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('auth_user_id, nome')
      .in('auth_user_id', userIds);
      
    enrichedData = data.map((d: any) => ({
      ...d,
      usuarios: userData?.find((u: any) => u.auth_user_id === d.created_by) || { nome: 'Sistema' }
    }));
  } else {
    enrichedData = (data || []).map((d: any) => ({ ...d, usuarios: { nome: 'Sistema' } }));
  }
  
  return { data: enrichedData, count, totalPages: count ? Math.ceil(count / limit) : 0 }
}

export async function getLowStockParts(tenantId: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase.from('unit_stock') as any)
    .select(`
      qty,
      catalog_item_id,
      unit_id,
      units(name),
      catalog_items!inner(name, item_type, stock_alert_qty)
    `)
    .eq('tenant_id', tenantId)
    .eq('catalog_items.item_type', 'peca')
    
  if (error) throw error
  
  return (data as any[])
    .filter(row => row.qty <= (row.catalog_items?.stock_alert_qty || 1))
    .map(row => ({
      catalogItemId: row.catalog_item_id,
      name: row.catalog_items?.name,
      unitId: row.unit_id,
      unitName: row.units?.name,
      qty: row.qty,
      alertQty: row.catalog_items?.stock_alert_qty || 1
    }))
}

export async function getPartsConsumptionReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  filters?: { unitId?: string, type?: string }
) {
  const supabase = await createClient()
  
  let query = (supabase.from('stock_movements') as any)
    .select(`
      qty,
      movement_type,
      unit_id,
      units(name),
      catalog_items(id, name, item_type)
    `)
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    
  if (filters?.unitId) query = query.eq('unit_id', filters.unitId)
  if (filters?.type) query = query.eq('movement_type', filters.type)
  
  const { data, error } = await query
  if (error) throw error
  
  const report: Record<string, any> = {};
  
  (data as any[]).forEach(row => {
    const key = `${row.catalog_items?.id}-${row.unit_id}`
    if (!report[key]) {
      report[key] = {
        id: row.catalog_items?.id,
        name: row.catalog_items?.name,
        type: row.catalog_items?.item_type,
        unit: row.units?.name,
        entradas: 0,
        saidasOS: 0,
        saidasVenda: 0,
        saldo: 0
      }
    }
    
    if (row.movement_type === 'entrada') {
      report[key].entradas += row.qty
      report[key].saldo += row.qty
    } else if (row.movement_type === 'saida_os') {
      report[key].saidasOS += Math.abs(row.qty)
      report[key].saldo -= Math.abs(row.qty)
    } else if (row.movement_type === 'saida_venda') {
      report[key].saidasVenda += Math.abs(row.qty)
      report[key].saldo -= Math.abs(row.qty)
    } else if (row.movement_type === 'ajuste') {
      // Simplificando o ajuste como uma mudança no saldo
      report[key].saldo += row.qty
    }
  })
  
  return Object.values(report)
}
