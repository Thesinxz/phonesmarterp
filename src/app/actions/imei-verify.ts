"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SickwResult {
  carrier: string | null;
  country: string | null;
  simLock: string | null;
  icloudStatus: string | null;
  appleModel: string | null;
  appleColor: string | null;
  purchaseDate: string | null;
  warrantyStatus: string | null;
  warrantyUntil: string | null;
  rawData: Record<string, any>;
  verifiedAt: string;
  fromCache: boolean;
}

async function callSickw(apiKey: string, imei: string, service: string) {
  const url = `https://sickw.com/api.php?format=JSON&key=${apiKey}&imei=${imei}&service=${service}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 }, // nunca cachear no Next.js
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function extractField(data: any, ...paths: string[]): string | null {
  for (const path of paths) {
    const keys = path.split('.');
    let val: any = data;
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

export async function verifyIMEI(
  imei: string,
  catalogItemId?: string,
  forceRefresh = false
): Promise<{ success: boolean; data?: SickwResult; error?: string }> {
  if (!/^\d{15}$/.test(imei)) {
    return { success: false, error: "IMEI inválido — deve ter 15 dígitos" };
  }

  const supabase = await createClient();

  // Buscar empresa do usuário logado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const { data: profile } = await (supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .single() as any);

  if (!profile?.empresa_id) return { success: false, error: "Empresa não encontrada" };

  // Verificar cache (verificações com menos de 30 dias)
  if (!forceRefresh) {
    const { data: cached } = await (supabase
      .from("imei_verifications")
      .select("*")
      .eq("empresa_id", profile.empresa_id)
      .eq("imei", imei)
      .gte("verified_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle() as any);

    if (cached) {
      return {
        success: true,
        data: {
          carrier: cached.carrier,
          country: cached.country,
          simLock: cached.sim_lock,
          icloudStatus: cached.icloud_status,
          appleModel: cached.apple_model,
          appleColor: cached.apple_color,
          purchaseDate: cached.purchase_date,
          warrantyStatus: cached.warranty_status,
          warrantyUntil: cached.warranty_until,
          rawData: cached.raw_data || {},
          verifiedAt: cached.verified_at,
          fromCache: true,
        }
      };
    }
  }

  // Buscar chave API da empresa
  const { data: config } = await (supabase
    .from("configuracoes")
    .select("sickw_api_key")
    .eq("empresa_id", profile.empresa_id)
    .maybeSingle() as any);

  const apiKey = config?.sickw_api_key || process.env.SICKW_API_KEY_DEFAULT;
  if (!apiKey) {
    return { success: false, error: "Chave Sickw não configurada. Vá em Configurações → Integrações." };
  }

  // Chamar os 4 endpoints em paralelo
  const [carrierData, simData, icloudData, serialData] = await Promise.all([
    callSickw(apiKey, imei, "Free_iPhone_Carrier_Check_MN"),
    callSickw(apiKey, imei, "Free_iPhone_SIM_Lock_Status_MN"),
    callSickw(apiKey, imei, "Free_iCloud_ON_OFF_MN"),
    callSickw(apiKey, imei, "Free_Apple_Serial_Info_MN"),
  ]);

  const rawData = { carrier: carrierData, simLock: simData, icloud: icloudData, serial: serialData };

  // Extrair campos relevantes (estrutura da Sickw varia por serviço)
  const carrier = extractField(carrierData, 'response.carrier', 'carrier', 'result.carrier');
  const country = extractField(carrierData, 'response.country', 'country', 'result.country');
  const simLock = extractField(simData, 'response.sim_lock', 'sim_lock', 'result', 'response');
  const icloudStatus = extractField(icloudData, 'response.icloud_status', 'icloud', 'response', 'result');
  const appleModel = extractField(serialData, 'response.model', 'model', 'result.model');
  const appleColor = extractField(serialData, 'response.color', 'color', 'result.color');
  const purchaseDate = extractField(serialData, 'response.purchase_date', 'purchase_date', 'result.purchase_date');
  const warrantyStatus = extractField(serialData, 'response.warranty_status', 'warranty_status', 'result.coverage');
  const warrantyUntil = extractField(serialData, 'response.warranty_expiry', 'warranty_until', 'result.warranty_end');

  const verifiedAt = new Date().toISOString();

  // Salvar/atualizar no cache
  await (supabase
    .from("imei_verifications") as any)
    .upsert({
      empresa_id: profile.empresa_id,
      imei,
      catalog_item_id: catalogItemId || null,
      carrier, country, sim_lock: simLock,
      icloud_status: icloudStatus,
      apple_model: appleModel,
      apple_color: appleColor,
      purchase_date: purchaseDate,
      warranty_status: warrantyStatus,
      warranty_until: warrantyUntil,
      raw_data: rawData,
      verified_at: verifiedAt,
      verified_by: user.id,
    }, { onConflict: "empresa_id,imei" });

  if (catalogItemId) revalidatePath(`/estoque/${catalogItemId}`);

  return {
    success: true,
    data: {
      carrier, country, simLock, icloudStatus,
      appleModel, appleColor, purchaseDate,
      warrantyStatus, warrantyUntil,
      rawData, verifiedAt, fromCache: false,
    }
  };
}

export async function getIMEIVerification(imei: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await (supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("auth_user_id", user.id)
    .single() as any);

  if (!profile?.empresa_id) return null;

  const { data } = await (supabase
    .from("imei_verifications")
    .select("*")
    .eq("empresa_id", profile.empresa_id)
    .eq("imei", imei)
    .maybeSingle() as any);

  return data;
}
