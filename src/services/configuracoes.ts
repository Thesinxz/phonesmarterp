import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export async function getConfigs(empresaId: string) {
    const { data, error } = await (supabase.from("configuracoes") as any)
        .select("chave, valor, descricao")
        .eq("empresa_id", empresaId);

    if (error) throw error;

    // Converte para objeto chave-valor
    const configs: Record<string, any> = {};
    data?.forEach((item: any) => {
        configs[item.chave] = item.valor;
    });

    return configs;
}

export async function setConfig(empresaId: string, chave: string, valor: any, descricao?: string) {
    const { error } = await (supabase.from("configuracoes") as any)
        .upsert({
            empresa_id: empresaId,
            chave,
            valor,
            descricao,
            updated_at: new Date().toISOString()
        }, { onConflict: "empresa_id,chave" });

    if (error) throw error;
}

export async function deleteConfig(empresaId: string, chave: string) {
    const { error } = await (supabase.from("configuracoes") as any)
        .delete()
        .eq("empresa_id", empresaId)
        .eq("chave", chave);

    if (error) throw error;
}

/**
 * Propaga uma configuração para todas as empresas do usuário
 */
export async function syncConfigToAll(authUserId: string, chave: string, valor: any) {
    const { error } = await (supabase as any).rpc('sync_config_to_all_companies', {
        p_auth_user_id: authUserId,
        p_key: chave,
        p_value: valor
    });

    if (error) throw error;
}
