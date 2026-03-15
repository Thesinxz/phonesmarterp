"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { WarrantyClaim, OrdemServico } from "@/types/database";
import { requireFeature } from "@/lib/plans/guard";

/**
 * Verifica se uma OS ainda está no prazo de garantia.
 * Compara data de conclusão da OS + dias de garantia.
 */
export async function checkWarrantyValidity(osId: string): Promise<{
  isValid: boolean;
  expiresAt: Date | null;
  daysRemaining: number;
  originalOs: {
    id: string;
    numero: number;
    deviceModel: string;
    serviceDescription: string;
    completedAt: Date | null;
    technicianName: string;
    partsUsed: { name: string; quality: string }[];
    checklistSummary: { item: string; passed: boolean }[];
  };
}> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { data: os, error } = await (supabase as any)
    .from("ordens_servico")
    .select(`
      *,
      tecnico:usuarios(nome)
    `)
    .eq("id", osId)
    .single();

  if (error || !os) {
    throw new Error("Ordem de serviço não encontrada");
  }

  // Se a OS não estiver finalizada ou entregue, não tem garantia ativa ainda
  const isCompleted = os.status === "finalizada" || os.status === "entregue";
  
  // Usamos garantia_ate da OS se existir, senão calculamos a partir do updated_at (assumindo ser a data de conclusão)
  let expiresAt: Date | null = null;
  if (os.garantia_ate) {
    expiresAt = new Date(os.garantia_ate);
  } else if (isCompleted && os.garantia_dias) {
    const completedDate = new Date(os.updated_at);
    expiresAt = new Date(completedDate);
    expiresAt.setDate(expiresAt.getDate() + os.garantia_dias);
  }

  const now = new Date();
  const isValid = expiresAt ? expiresAt > now : false;
  const daysRemaining = expiresAt 
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) 
    : 0;

  // Processar peças (pecas_json é JSONB)
  const partsUsed = Array.isArray(os.pecas_json) 
    ? os.pecas_json.map((p: any) => ({ name: p.nome || "Peça", quality: p.qualidade || "N/A" })) 
    : [];

  // Checklist de saída (checklist_saida_json)
  const checklistRaw = os.checklist_saida_json || {};
  const checklistSummary = Object.entries(checklistRaw).map(([item, status]: [string, any]) => ({
    item,
    passed: status === true || (typeof status === 'object' && status?.status === 'ok')
  }));

  return {
    isValid,
    expiresAt,
    daysRemaining,
    originalOs: {
      id: os.id,
      numero: os.numero,
      deviceModel: `${os.marca_equipamento} ${os.modelo_equipamento}`,
      serviceDescription: os.problema_relatado,
      completedAt: isCompleted ? new Date(os.updated_at) : null,
      technicianName: os.tecnico?.nome || "Não atribuído",
      partsUsed,
      checklistSummary
    }
  };
}

/**
 * Abre uma nova garantia vinculada a uma OS original.
 */
export async function openWarrantyClaim(params: {
  tenantId: string;
  unitId: string;
  originalOsId: string;
  claimType: 'peca_defeituosa' | 'erro_tecnico' | 'dano_acidental' | 'nao_relacionado';
  isCovered: boolean;
  coverageReason: string;
  customerComplaint: string;
  responsibleTechnicianId?: string;
  supplierName?: string;
  openedBy: string;
}): Promise<{ claimId: string }> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  // 1. Inserir claim
  const { data: claim, error: claimError } = await (supabase as any)
    .from("warranty_claims")
    .insert({
      tenant_id: params.tenantId,
      unit_id: params.unitId,
      original_os_id: params.originalOsId,
      claim_type: params.claimType,
      is_covered: params.isCovered,
      coverage_reason: params.coverageReason,
      customer_complaint: params.customerComplaint,
      responsible_technician_id: params.responsibleTechnicianId,
      supplier_name: params.supplierName,
      supplier_claim_status: params.claimType === 'peca_defeituosa' ? 'pendente' : 'nao_aplicavel',
      opened_by: params.openedBy,
      status: 'aberta'
    })
    .select("id")
    .single();

  if (claimError) throw claimError;

  // 2. Capturar snapshot do checklist da OS original
  const { data: os } = await (supabase as any)
    .from("ordens_servico")
    .select("checklist_saida_json")
    .eq("id", params.originalOsId)
    .single();

  if (os) {
    await (supabase as any)
      .from("warranty_checklist_snapshot")
      .insert({
        tenant_id: params.tenantId,
        warranty_claim_id: claim.id,
        original_os_id: params.originalOsId,
        checklist_data: os.checklist_saida_json || {}
      });
  }

  revalidatePath(`/os/${params.originalOsId}`);
  return { claimId: claim.id };
}

/**
 * Abre OS de reparo vinculada à garantia (quando coberta).
 */
export async function openWarrantyRepairOS(params: {
  tenantId: string;
  claimId: string;
  unitId: string;
  technicianId: string;
}): Promise<{ warrantyOsId: string }> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  // 1. Buscar dados da claim e da OS original
  const { data: claim } = await (supabase as any)
    .from("warranty_claims")
    .select(`
      *,
      original_os:ordens_servico(*)
    `)
    .eq("id", params.claimId)
    .single();

  if (!claim) throw new Error("Garantia não encontrada");

  const original = claim.original_os;

  // 2. Criar nova OS com custo zero
  const { data: newOs, error: osError } = await (supabase as any)
    .from("ordens_servico")
    .insert({
      empresa_id: params.tenantId,
      unit_id: params.unitId,
      cliente_id: original.cliente_id,
      tecnico_id: params.technicianId,
      status: 'em_execucao',
      problema_relatado: `GARANTIA: ${claim.customer_complaint} (Ref: OS #${original.numero})`,
      tipo_equipamento: original.tipo_equipamento,
      marca_equipamento: original.marca_equipamento,
      modelo_equipamento: original.modelo_equipamento,
      cor_equipamento: original.cor_equipamento,
      imei_equipamento: original.imei_equipamento,
      numero_serie: original.numero_serie,
      valor_total_centavos: 0,
      valor_adiantado_centavos: 0,
      prioridade: 'alta'
    })
    .select("id")
    .single();

  if (osError) throw osError;

  // 3. Vincular nova OS à claim e atualizar status
  await (supabase as any)
    .from("warranty_claims")
    .update({ 
      warranty_os_id: newOs.id,
      status: 'reparo_em_andamento'
    })
    .eq("id", params.claimId);

  revalidatePath("/garantias");
  return { warrantyOsId: newOs.id };
}

/**
 * Conclui a garantia.
 */
export async function closeWarrantyClaim(params: {
  tenantId: string;
  claimId: string;
  closedBy: string;
  finalNotes?: string;
}): Promise<void> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("warranty_claims")
    .update({
      status: 'concluida',
      closed_by: params.closedBy,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", params.claimId)
    .eq("tenant_id", params.tenantId);

  if (error) throw error;
  revalidatePath("/garantias");
}

/**
 * Nega a garantia.
 */
export async function denyWarrantyClaim(params: {
  tenantId: string;
  claimId: string;
  deniedBy: string;
  reason: string;
}): Promise<void> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("warranty_claims")
    .update({
      status: 'negada',
      is_covered: false,
      coverage_reason: params.reason,
      closed_by: params.deniedBy,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", params.claimId)
    .eq("tenant_id", params.tenantId);

  if (error) throw error;
  revalidatePath("/garantias");
}

/**
 * Atualiza status do ressarcimento com fornecedor.
 */
export async function updateSupplierClaimStatus(params: {
  tenantId: string;
  claimId: string;
  status: 'pendente' | 'enviado' | 'ressarcido' | 'negado';
  notes?: string;
}): Promise<void> {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("warranty_claims")
    .update({
      supplier_claim_status: params.status,
      supplier_claim_notes: params.notes,
      updated_at: new Date().toISOString()
    })
    .eq("id", params.claimId)
    .eq("tenant_id", params.tenantId);

  if (error) throw error;
  revalidatePath("/garantias");
}

/**
 * Retorna todas as garantias do tenant com filtros.
 */
export async function getWarrantyClaims(params: {
  tenantId: string;
  status?: string;
  claimType?: string;
  dateFrom?: string;
  dateTo?: string;
  unitId?: string;
}) {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  let query = (supabase as any)
    .from("warranty_claims")
    .select(`
      *,
      original_os:ordens_servico(numero, marca_equipamento, modelo_equipamento, cliente_id, clientes(nome)),
      unit:units(name),
      opened_by_user:usuarios!opened_by(nome),
      closed_by_user:usuarios!closed_by(nome)
    `)
    .eq("tenant_id", params.tenantId)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== 'todas') query = query.eq("status", params.status);
  if (params.claimType && params.claimType !== 'todos') query = query.eq("claim_type", params.claimType);
  if (params.unitId) query = query.eq("unit_id", params.unitId);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", params.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

/**
 * Retorna garantias abertas por uma OS específica.
 */
export async function getWarrantyClaimsByOS(osId: string) {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("warranty_claims")
    .select("*")
    .eq("original_os_id", osId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Retorna uma garantia específica por ID com todos os detalhes.
 */
export async function getWarrantyClaimById(claimId: string) {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("warranty_claims")
    .select(`
      *,
      original_os:ordens_servico!original_os_id(
        *,
        tecnico:usuarios(nome),
        clientes(nome, telefone, email)
      ),
      warranty_os:ordens_servico!warranty_os_id(
        *,
        tecnico:usuarios(nome)
      ),
      unit:units(name),
      opened_by_user:usuarios!opened_by(nome),
      closed_by_user:usuarios!closed_by(nome),
      responsible_technician:usuarios!responsible_technician_id(nome),
      evidences:warranty_evidences(*),
      checklist_snapshot:warranty_checklist_snapshot(*)
    `)
    .eq("id", claimId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retorna dados consolidados para o relatório de garantias.
 */
export async function getWarrantyReport(params: {
  tenantId: string;
  dateFrom: string;
  dateTo: string;
}) {
  await requireFeature('os_garantias');
  const supabase = await createClient();

  const { data: claims, error } = await (supabase as any)
    .from("warranty_claims")
    .select(`
      *,
      original_os:ordens_servico!original_os_id(
        numero, 
        marca_equipamento, 
        modelo_equipamento,
        pecas_json
      ),
      technician:usuarios!responsible_technician_id(nome)
    `)
    .eq("tenant_id", params.tenantId)
    .gte("created_at", params.dateFrom)
    .lte("created_at", params.dateTo);

  if (error) throw error;
  return claims;
}
