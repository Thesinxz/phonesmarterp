"use server";

import { revalidatePath } from "next/cache";
import { requireFeature } from "@/lib/plans/guard";
import { createClient } from "@/lib/supabase/server";

export type DeviceCondition = 'otimo' | 'bom' | 'regular' | 'ruim';
export type TradeInDestination = 'estoque_direto' | 'assistencia';

export interface TradeInParams {
  tenantId: string;
  unitId: string;
  clienteId?: string;
  deviceName: string;
  deviceImei?: string;
  deviceCondition: DeviceCondition;
  deviceNotes?: string;
  evaluatedValue: number;     // in cents
  appliedValue: number;       // in cents
  destination: TradeInDestination;
  evaluatedBy: string;
}

/**
 * Cria o registro inicial de trade-in.
 * Chamado quando o usuário preenche o modal no PDV.
 */
export async function createTradeIn(params: TradeInParams) {
  await requireFeature('trade_in');
  const supabase = await createClient();
  
  const { data, error } = await (supabase.from("trade_ins") as any)
    .insert({
      empresa_id: params.tenantId,
      unit_id: params.unitId,
      cliente_id: params.clienteId,
      device_name: params.deviceName,
      device_imei: params.deviceImei,
      device_condition: params.deviceCondition,
      device_notes: params.deviceNotes,
      evaluated_value: params.evaluatedValue,
      applied_value: params.appliedValue,
      destination: params.destination,
      evaluated_by: params.evaluatedBy,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[TradeIn] Error creating record:", error);
    throw new Error("Erro ao registrar avaliação de trade-in.");
  }
  
  return { tradeInId: data.id };
}

/**
 * Confirma o trade-in e gera os registros vinculados (Estoque ou OS).
 * Chamado ao finalizar a venda.
 */
export async function confirmTradeIn(params: {
  tenantId: string;
  tradeInId: string;
  saleId: string;
  unitId: string;
  confirmedBy: string;
}) {
  await requireFeature('trade_in');
  const supabase = await createClient();
  const { tenantId, tradeInId, saleId, unitId, confirmedBy } = params;

  // 1. Buscar detalhes do trade-in
  const { data: tradeIn, error: fetchError } = await (supabase.from("trade_ins") as any)
    .select("*")
    .eq("id", tradeInId)
    .single();

  if (fetchError || !tradeIn) throw new Error("Trade-in não encontrado para confirmação.");

  let catalogItemId: string | undefined;
  let serviceOrderId: string | undefined;

  try {
    if (tradeIn.destination === 'estoque_direto') {
      // 1. Criar item no catálogo
      const { data: item, error: itemError } = await (supabase.from("catalog_items") as any)
        .insert({
          empresa_id: tenantId,
          item_type: 'celular',
          name: tradeIn.device_name,
          cost_price: tradeIn.applied_value,
          sale_price: 0, // Precificação posterior pelo dono
          condicao: 'seminovo',
          description: `Entrada via trade-in · Venda vinculada #${saleId}`,
          imei: tradeIn.device_imei,
        })
        .select("id")
        .single();

      if (itemError) throw itemError;
      catalogItemId = item.id;

      // 2. Criar estoque na unidade
      const { error: stockError } = await (supabase.from("unit_stock") as any)
        .insert({
          tenant_id: tenantId,
          unit_id: unitId,
          catalog_item_id: catalogItemId,
          qty: 1,
        });

      if (stockError) throw stockError;

      // 3. Se houver IMEI, registrar no módulo de rastreabilidade
      if (tradeIn.device_imei) {
        // Verificar se já existe (ex: aparelho que vendemos e retornou)
        const { data: existingImei } = await (supabase.from("device_imeis") as any)
          .select("id, status")
          .eq("tenant_id", tenantId)
          .eq("imei", tradeIn.device_imei)
          .maybeSingle();

        if (existingImei) {
          // Atualizar o existente para status 'trade_in'
          await (supabase.from("device_imeis") as any)
            .update({
              catalog_item_id: catalogItemId,
              status: 'trade_in',
              current_unit_id: unitId,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingImei.id);

          await (supabase.from("imei_history") as any).insert({
            tenant_id: tenantId,
            imei_id: existingImei.id,
            imei: tradeIn.device_imei,
            event_type: 'retornou_trade_in',
            from_status: existingImei.status,
            to_status: 'trade_in',
            unit_id: unitId,
            reference_id: saleId,
            notes: `Recebido como trade-in · Venda vinculada #${saleId}`,
            performed_by: confirmedBy
          });
        } else {
          // Novo IMEI no sistema
          const { data: imeiRecord, error: imeiError } = await (supabase.from("device_imeis") as any)
            .insert({
              tenant_id: tenantId,
              imei: tradeIn.device_imei,
              catalog_item_id: catalogItemId,
              status: 'trade_in',
              current_unit_id: unitId,
              registered_by: confirmedBy,
            })
            .select("id")
            .single();
          
          if (!imeiError && imeiRecord) {
            await (supabase.from("imei_history") as any).insert({
              tenant_id: tenantId,
              imei_id: imeiRecord.id,
              imei: tradeIn.device_imei,
              event_type: 'cadastrado',
              to_status: 'trade_in',
              unit_id: unitId,
              reference_id: saleId,
              notes: `Entrada via trade-in · Venda #${saleId}`,
              performed_by: confirmedBy
            });
          }
        }
      }
    } else if (tradeIn.destination === 'assistencia') {
      // 1. Criar Ordem de Serviço
      const { data: os, error: osError } = await (supabase.from("ordens_servico") as any)
        .insert({
          empresa_id: tenantId,
          cliente_id: tradeIn.cliente_id,
          status: 'aberta',
          problema_relatado: 'Aparelho recebido via trade-in · Requer revisão técnica para revenda.',
          diagnostico: `Entrada via Trade-in. Condição relatada: ${tradeIn.device_condition.toUpperCase()}. Notas: ${tradeIn.device_notes || 'N/A'}. Valor de entrada: R$ ${tradeIn.applied_value/100}`,
          valor_total_centavos: 0,
        })
        .select("id")
        .single();
        
      if (osError) throw osError;
      serviceOrderId = os.id;
    }

    // 4. Vincular registros no trade-in
    await (supabase.from("trade_ins") as any)
      .update({
        sale_id: saleId,
        catalog_item_id: catalogItemId,
        service_order_id: serviceOrderId,
        updated_at: new Date().toISOString()
      })
      .eq("id", tradeInId);

    revalidatePath("/estoque");
    revalidatePath("/os");
    revalidatePath("/vendas");

    return { success: true, catalogItemId, serviceOrderId };

  } catch (err: any) {
    console.error("[TradeIn] Confirmation failed:", err);
    throw new Error("Falha ao processar entrada do aparelho trade-in.");
  }
}

/**
 * Remove um trade-in ainda não vinculado a uma venda.
 */
export async function cancelTradeIn(tradeInId: string) {
  await requireFeature('trade_in');
  const supabase = await createClient();
  const { error } = await (supabase.from("trade_ins") as any)
    .delete()
    .eq("id", tradeInId)
    .is("sale_id", null);
  
  if (error) throw error;
}

/**
 * Busca histórico de trade-ins para relatórios.
 */
export async function getTradeIns(params: {
  tenantId: string;
  dateFrom?: string;
  dateTo?: string;
  unitId?: string;
}) {
  await requireFeature('relatorios_trade_in');
  const supabase = await createClient();
  let query = (supabase.from("trade_ins") as any)
    .select(`
      *,
      usuario:evaluated_by(nome),
      venda:vendas(id, numero, created_at),
      os:ordens_servico(id, numero)
    `)
    .eq("empresa_id", params.tenantId);

  if (params.unitId) query = query.eq("unit_id", params.unitId);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", params.dateTo);

  const { data, error } = await query.order("created_at", { ascending: false });
  
  if (error) {
    console.error("[TradeIn] Error listing:", error);
    throw new Error("Erro ao buscar relatório de trade-ins.");
  }
  
  return data;
}
