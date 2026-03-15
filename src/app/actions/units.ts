"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getUnitsWithCapabilities(empresaId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    let activeEmpresaId = empresaId;

    if (!activeEmpresaId) {
        const { data: profile } = await (supabase
            .from("usuarios")
            .select("ultimo_acesso_empresa_id, empresa_id")
            .eq("auth_user_id", user.id)
            .limit(1)
            .single() as any);
        
        activeEmpresaId = profile?.ultimo_acesso_empresa_id || profile?.empresa_id;
    }

    if (!activeEmpresaId) throw new Error("Perfil não encontrado ou empresa não identificada");

    const { data: units, error } = await (supabase as any)
        .from("units")
        .select("*")
        .eq("empresa_id", activeEmpresaId)
        .order("name");

    if (error) throw error;
    return units;
}

export async function updateUnitCapabilities(
    unitId: string, 
    data: { 
        has_repair_lab: boolean; 
        has_parts_stock: boolean; 
        has_sales: boolean;
        is_active?: boolean;
    }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autorizado");

    // 1. Descobrir a qual empresa a unidade pertence
    const { data: unit } = await (supabase as any)
        .from("units")
        .select("empresa_id")
        .eq("id", unitId)
        .single();

    if (!unit) throw new Error("Unidade não encontrada");

    // 2. Verificar se o usuário tem perfil admin NESTA empresa
    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("empresa_id, papel")
        .eq("auth_user_id", user.id)
        .eq("empresa_id", unit.empresa_id)
        .limit(1)
        .single();

    if (!profile || profile.papel !== "admin") throw new Error("Apenas administradores podem alterar capacidades");

    // Validação: Pelo menos uma capacidade deve estar ativa se a unidade estiver ativa
    if (data.is_active !== false && !data.has_repair_lab && !data.has_parts_stock && !data.has_sales) {
        throw new Error("A unidade deve ter pelo menos uma capacidade ativa (Reparo, Estoque ou Vendas)");
    }

    const { error } = await (supabase as any)
        .from("units")
        .update(data)
        .eq("id", unitId)
        .eq("empresa_id", profile.empresa_id);

    if (error) throw error;

    // Validação pós-update: Garantir que ainda existe pelo menos um laboratório de reparo na empresa
    if (!data.has_repair_lab) {
        const { count } = await (supabase as any)
            .from("units")
            .select("*", { count: 'exact', head: true })
            .eq("empresa_id", profile.empresa_id)
            .eq("has_repair_lab", true)
            .eq("is_active", true);

        if ((count || 0) === 0) {
            // Rollback manual (ou apenas avisar, mas idealmente impedir)
            // Aqui vamos impedir a alteração se for o último lab
            await (supabase as any)
                .from("units")
                .update({ has_repair_lab: true })
                .eq("id", unitId);
            
            throw new Error("Não é possível desativar o último laboratório de reparos da empresa.");
        }
    }

    revalidatePath("/configuracoes");
    return { success: true };
}

export async function getRepairUnit() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await (supabase
        .from("usuarios")
        .select("ultimo_acesso_empresa_id, empresa_id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .single() as any);

    const activeEmpresaId = profile?.ultimo_acesso_empresa_id || profile?.empresa_id;
    if (!activeEmpresaId) return null;

    const { data } = await (supabase as any)
        .from("units")
        .select("*")
        .eq("empresa_id", activeEmpresaId)
        .eq("has_repair_lab", true)
        .eq("is_active", true)
        .limit(1)
        .single();

    return data;
}

export async function getStockUnits() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await (supabase
        .from("usuarios")
        .select("ultimo_acesso_empresa_id, empresa_id")
        .eq("auth_user_id", user.id)
        .limit(1)
        .single() as any);

    const activeEmpresaId = profile?.ultimo_acesso_empresa_id || profile?.empresa_id;
    if (!activeEmpresaId) return [];

    const { data } = await (supabase as any)
        .from("units")
        .select("*")
        .eq("empresa_id", activeEmpresaId)
        .eq("has_parts_stock", true)
        .eq("is_active", true);

    return data || [];
}
