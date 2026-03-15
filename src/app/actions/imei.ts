"use server";

import { createClient } from "@/lib/supabase/client";
import { type DeviceImei, type ImeiHistoryEvent, type ImeiAnatelCheck } from "@/types/database";
import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/plans/guard";

// ─── VALIDAÇÃO ───────────────────────────────────────────

/**
 * Valida formato e dígito verificador (algoritmo de Luhn)
 */
export async function validateIMEI(imei: string) {
    const cleanIMEI = imei.replace(/\s+/g, "");
    
    if (!/^\d{15}$/.test(cleanIMEI)) {
        return {
            isValid: false,
            error: cleanIMEI.length < 15 ? "muito_curto" : cleanIMEI.length > 15 ? "muito_longo" : "formato_invalido"
        };
    }

    // Algoritmo de Luhn
    let sum = 0;
    for (let i = 0; i < 15; i++) {
        let digit = parseInt(cleanIMEI[i]);
        
        // Dobra dígitos em posições pares (índices ímpares se 1-based, mas 0-based aqui: 1, 3, 5...)
        // O algoritmo de Luhn para IMEI (15 dígitos):
        // Posição 1, 2, 3... 15
        // Dobra posições 2, 4, 6... 14
        if (i % 2 !== 0 && i < 14) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }

    const isValid = sum % 10 === 0;
    return {
        isValid,
        error: isValid ? undefined : "digito_verificador_invalido"
    };
}

/**
 * Consulta Anatel — usa cache de 24h em imei_anatel_checks
 */
export async function checkIMEIAnatel(imei: string) {
    const supabase = createClient();
    const now = new Date();

    try {
        // 1. Verificar cache
        const { data: cache } = await (supabase.from("imei_anatel_checks") as any)
            .select("*")
            .eq("imei", imei)
            .maybeSingle();

        if (cache && new Date(cache.expires_at) > now) {
            return {
                isBlocked: cache.is_blocked,
                blockReason: cache.block_reason,
                fromCache: true,
                checkedAt: new Date(cache.checked_at),
                apiAvailable: true
            };
        }

        // 2. Simular consulta API (ou implementar integração real se houver endpoint)
        // Por enquanto, rascunhamos como OK (não bloqueado)
        const mockResponse = {
            is_blocked: false,
            block_reason: null,
            raw_response: { status: "OK", source: "Anatel Mock" }
        };

        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Salvar em cache
        await (supabase.from("imei_anatel_checks") as any).upsert({
            imei,
            is_blocked: mockResponse.is_blocked,
            block_reason: mockResponse.block_reason,
            raw_response: mockResponse.raw_response,
            checked_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
        });

        return {
            isBlocked: mockResponse.is_blocked,
            blockReason: mockResponse.block_reason,
            fromCache: false,
            checkedAt: now,
            apiAvailable: true
        };
    } catch (error) {
        console.error("Error checking Anatel:", error);
        return { isBlocked: false, apiAvailable: false, checkedAt: now, fromCache: false };
    }
}

/**
 * Verifica duplicatas no tenant
 */
export async function checkIMEIDuplicate(tenantId: string, imei: string, currentItemId?: string) {
    const supabase = createClient();

    const { data: existing, error } = await (supabase.from("device_imeis") as any)
        .select(`
            *,
            catalog_item:catalog_items(name),
            unit:units(name)
        `)
        .eq("tenant_id", tenantId)
        .eq("imei", imei)
        .maybeSingle();

    if (!existing) return { isDuplicate: false };

    // Se for o mesmo item que estamos editando, não é duplicata real
    if (currentItemId && existing.catalog_item_id === currentItemId) {
        return { isDuplicate: false };
    }

    if (existing.status === "vendido") {
        return {
            isDuplicate: true,
            alreadySold: {
                soldAt: new Date(existing.sold_at),
                customerName: "Cliente", // Seria ideal buscar na tabela clientes se houver ID
                saleId: existing.sale_id
            }
        };
    }

    return {
        isDuplicate: true,
        existingItem: {
            id: existing.catalog_item_id,
            name: existing.catalog_item?.name || "Produto sem nome",
            status: existing.status,
            unitName: existing.unit?.name || "Matriz"
        }
    };
}

/**
 * Validação completa em paralelo
 */
export async function validateIMEIFull(tenantId: string, imei: string, currentItemId?: string) {
    const [format, anatel, duplicate] = await Promise.all([
        validateIMEI(imei),
        checkIMEIAnatel(imei),
        checkIMEIDuplicate(tenantId, imei, currentItemId)
    ]);

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!format.isValid) errors.push("IMEI com formato ou dígito inválido.");
    if (anatel.isBlocked) errors.push(`IMEI bloqueado na Anatel: ${anatel.blockReason || "Sem motivo especificado"}`);
    if (duplicate.isDuplicate) {
        if (duplicate.alreadySold) {
            warnings.push(`Este IMEI já foi vendido em ${duplicate.alreadySold.soldAt.toLocaleDateString()}.`);
        } else {
            warnings.push(`Este IMEI já está vinculado ao produto ${duplicate.existingItem?.name} na unidade ${duplicate.existingItem?.unitName}.`);
        }
    }

    return {
        format,
        anatel,
        duplicate,
        canProceed: errors.length === 0,
        warnings,
        errors
    };
}

// ─── CADASTRO E ATUALIZAÇÃO ──────────────────────────────

/**
 * Registra IMEI no estoque
 */
export async function registerIMEI(params: {
    tenantId: string
    imei: string
    catalogItemId: string
    unitId: string
    registeredBy: string
}) {
    await requireFeature('imei');
    const supabase = createClient();

    const { data, error } = await (supabase.from("device_imeis") as any).upsert({
        tenant_id: params.tenantId,
        imei: params.imei,
        catalog_item_id: params.catalogItemId,
        status: "em_estoque",
        current_unit_id: params.unitId,
        registered_by: params.registeredBy,
        updated_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    // Log no histórico
    await (supabase.from("imei_history") as any).insert({
        tenant_id: params.tenantId,
        imei_id: data.id,
        imei: params.imei,
        event_type: "cadastrado",
        to_status: "em_estoque",
        unit_id: params.unitId,
        performed_by: params.registeredBy,
        notes: "Cadastro inicial via formulário de produto"
    });

    return { imeiId: data.id };
}

/**
 * Atualiza status do IMEI (Transação simulada via múltiplos inserts)
 */
export async function updateIMEIStatus(params: {
    tenantId: string
    imeiId: string
    newStatus: "em_estoque" | "em_transito" | "vendido" | "em_garantia" | "bloqueado" | "trade_in"
    eventType: string
    referenceId?: string
    unitId?: string
    customerId?: string
    saleId?: string
    performedBy: string
    notes?: string
}) {
    await requireFeature('imei');
    const supabase = createClient();

    // 1. Buscar status atual para log
    const { data: current } = await (supabase.from("device_imeis") as any)
        .select("status, imei")
        .eq("id", params.imeiId)
        .single();

    // 2. Atualizar status
    const updateData: any = {
        status: params.newStatus,
        updated_at: new Date().toISOString()
    };

    if (params.unitId) updateData.current_unit_id = params.unitId;
    if (params.saleId) updateData.sale_id = params.saleId;
    if (params.customerId) updateData.sold_to_customer_id = params.customerId;
    if (params.newStatus === "vendido") updateData.sold_at = new Date().toISOString();

    const { error: updateError } = await (supabase.from("device_imeis") as any)
        .update(updateData)
        .eq("id", params.imeiId);

    if (updateError) throw updateError;

    // 3. Inserir histórico
    await (supabase.from("imei_history") as any).insert({
        tenant_id: params.tenantId,
        imei_id: params.imeiId,
        imei: current.imei,
        event_type: params.eventType,
        from_status: current.status,
        to_status: params.newStatus,
        unit_id: params.unitId || null,
        reference_id: params.referenceId || null,
        notes: params.notes || null,
        performed_by: params.performedBy
    });

    revalidatePath("/estoque/imeis");
}

// ─── BUSCA E CONSULTA ────────────────────────────────────

/**
 * Busca por IMEI — retorna histórico completo
 */
export async function searchByIMEI(tenantId: string, imei: string) {
    await requireFeature('imei');
    const supabase = createClient();

    const { data: imeiRecord } = await (supabase.from("device_imeis") as any)
        .select(`
            *,
            catalog_item:catalog_items(id, name, condicao),
            unit:units(id, name),
            customer:clientes(nome)
        `)
        .eq("tenant_id", tenantId)
        .eq("imei", imei)
        .maybeSingle();

    if (!imeiRecord) return null;

    const { data: history } = await (supabase.from("imei_history") as any)
        .select("*")
        .eq("imei_id", imeiRecord.id)
        .order("created_at", { ascending: false });

    return {
        imeiRecord,
        product: imeiRecord.catalog_item ? {
            id: imeiRecord.catalog_item.id,
            name: imeiRecord.catalog_item.name,
            condition: imeiRecord.catalog_item.condicao
        } : null,
        currentUnit: imeiRecord.unit ? {
            id: imeiRecord.unit.id,
            name: imeiRecord.unit.name
        } : null,
        saleInfo: imeiRecord.status === "vendido" ? {
            soldAt: new Date(imeiRecord.sold_at),
            customer: imeiRecord.customer?.nome || "Cliente não identificado",
            saleId: imeiRecord.sale_id
        } : null,
        history: history || []
    };
}

/**
 * Detecta se input é IMEI (15 dígitos)
 */
export async function isIMEISearch(input: string): Promise<boolean> {
    return /^\d{15}$/.test(input.replace(/\s/g, ""));
}

/**
 * Retorna todos os IMEIs em estoque
 */
export async function getStockIMEIs(params: {
    tenantId: string
    unitId?: string
    status?: string
}) {
    const supabase = createClient();
    let query = (supabase.from("device_imeis") as any)
        .select(`
            *,
            catalog_item:catalog_items(name),
            unit:units(name)
        `)
        .eq("tenant_id", params.tenantId);

    if (params.unitId) query = query.eq("current_unit_id", params.unitId);
    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data;
}

/**
 * Consulta o histórico de um IMEI para o fluxo de trade-in.
 */
export async function checkTradeInImei(tenantId: string, imei: string) {
  const supabase = await createClient();

  const { data: imeiRecord } = await (supabase.from("device_imeis") as any)
    .select(`
      *,
      catalog_item:catalog_items(id, name),
      unit:units(id, name),
      venda:vendas(id, numero, valor_total_centavos, created_at, unit_id, vendedor:vendedor_id(nome)),
      customer:clientes(id, nome)
    `)
    .eq("tenant_id", tenantId)
    .eq("imei", imei)
    .maybeSingle();

  if (!imeiRecord) {
    // Verificar se está bloqueado na Anatel (simulado/cache)
    const { data: anatel } = await (supabase.from("imei_anatel_checks") as any)
      .select("*")
      .eq("imei", imei)
      .maybeSingle();
      
    if (anatel?.is_blocked) {
      return { status: 'bloqueado', reason: anatel.block_reason };
    }
    return { status: 'novo' };
  }

  return {
    status: imeiRecord.status,
    id: imeiRecord.id,
    deviceName: imeiRecord.catalog_item?.name,
    lastSale: imeiRecord.venda ? {
      date: imeiRecord.venda.created_at,
      value: imeiRecord.venda.valor_total_centavos,
      customer: imeiRecord.customer?.nome || "Cliente não identificado",
      unit: imeiRecord.unit?.name,
      vendedor: imeiRecord.venda.vendedor?.nome,
      numero: imeiRecord.venda.numero
    } : null
  };
}
