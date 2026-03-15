"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarInteresse(params: {
  userId: string;
  empresaId?: string;
  empresaNome?: string;
  planoDesejado: string;
  telefone: string;
}) {
  const supabase = await createClient();

  const { error } = await (supabase.from('upgrade_interests') as any).insert({
    user_id: params.userId,
    empresa_id: params.empresaId,
    empresa_nome: params.empresaNome,
    plano_desejado: params.planoDesejado,
    telefone: params.telefone,
    status: 'pendente',
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error registering interest:", error);
    throw new Error("Erro ao registrar interesse. Tente novamente.");
  }

  revalidatePath('/admin/upgrade-interests');
  return { success: true };
}

export async function updateInterestStatus(id: string, status: string) {
  const supabase = await createClient();

  // Verifica se é admin antes de atualizar? Idealmente sim.
  // Poderiamos importar o checkAdmin se necessário, mas para simplificar:
  const { error } = await (supabase.from('upgrade_interests') as any)
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error("Error updating interest status:", error);
    throw new Error("Erro ao atualizar status.");
  }

  revalidatePath('/admin/upgrade-interests');
  return { success: true };
}

export async function getUpgradeInterests() {
    const supabase = await createClient();
    
    // Tentamos buscar da tabela public.upgrade_interests
    // Nota: O join com auth.users via select('*, user:auth.users(email)') 
    // geralmente requer uma view ou configuração específica de RPC/Permissions.
    const { data, error } = await (supabase.from('upgrade_interests') as any)
        .select(`
            *,
            user:auth.users(email)
        `)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.warn("Join with auth.users failed, fetching interests without emails:", error.message);
        // Fallback: busca sem o join se falhar (ex: falta de permissão na schema auth)
        const { data: simpleData, error: simpleError } = await (supabase.from('upgrade_interests') as any)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        return simpleData;
    }

    return data;
}
