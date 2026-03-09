import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { type Empresa, type Usuario } from "@/types/database";

export interface CompanyLink {
    id: string;
    usuario_id: string;
    empresa_id: string;
    papel: string;
    permissoes_custom_json: any;
    empresa: Empresa;
}

/**
 * Busca todos os vínculos de empresa de um usuário (auth_user_id)
 */
export async function getUsuarioEmpresas(authUserId: string) {
    const supabase = createClient();

    // Nota: Esta tabela 'usuario_vinculos_empresa' deve ser criada conforme o plano de ação.
    // Enquanto a migração não ocorre, retornamos o vínculo padrão baseado na tabela 'usuarios'
    // para manter compatibilidade e facilitar a transição.

    try {
        // Primeiro, encontrar o ID interno do usuário baseado no authUserId
        const { data: internalUser } = await supabase
            .from("usuarios")
            .select("id")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (internalUser && (internalUser as any).id) {
            const { data: vinculos, error: vinculosError } = await (supabase.from("usuario_vinculos_empresa" as any))
                .select(`
                    *,
                    empresa:empresas(*)
                `)
                .eq("usuario_id", (internalUser as any).id);

            if (!vinculosError && vinculos && vinculos.length > 0) {
                return vinculos as CompanyLink[];
            }
        }
    } catch (e) {
        logger.warn("[Auth] Erro ao buscar vínculos na tabela 'usuario_vinculos_empresa'. Usando fallback...", e);
    }

    // Fallback: Buscar na tabela 'usuarios' atual (1-to-1)
    const { data: profile, error: profileError } = await (supabase.from("usuarios") as any)
        .select(`
            *,
            empresa:empresas(*)
        `)
        .eq("auth_user_id", authUserId)
        .maybeSingle();

    if (profileError || !profile) return [];

    return [{
        id: profile.id,
        usuario_id: authUserId,
        empresa_id: profile.empresa_id,
        papel: profile.papel,
        permissoes_custom_json: profile.permissoes_json,
        empresa: profile.empresa
    }] as CompanyLink[];
}

/**
 * Cria uma empresa adicional para o usuário logado com dados completos
 */
export async function provisionAdditionalCompany(
    nome: string,
    subdominio: string,
    authUserId: string,
    userEmail: string,
    userName: string,
    cnpj?: string,
    emitenteJson: any = {}
) {
    const supabase = createClient();

    const { data, error } = await (supabase as any).rpc('provision_additional_company', {
        p_nome_empresa: nome,
        p_subdominio: subdominio,
        p_nome_usuario: userName,
        p_email_usuario: userEmail,
        p_auth_user_id: authUserId,
        p_cnpj: cnpj || null,
        p_emitente_json: emitenteJson
    });

    if (error) throw error;
    return data;
}

/**
 * Clona dados de uma empresa para outra
 */
export async function cloneCompanyData(sourceId: string, targetId: string, options: { products: boolean; clients: boolean; configs?: boolean }) {
    const supabase = createClient();

    const { error } = await (supabase as any).rpc('clone_company_data', {
        p_source_empresa_id: sourceId,
        p_target_empresa_id: targetId,
        p_options: options
    });

    if (error) throw error;
    return true;
}

/**
 * Atualiza o 'ultimo_acesso_empresa_id' do perfil do usuário
 */
export async function setUltimaEmpresaAcessada(authUserId: string, empresaId: string) {
    const supabase = createClient();

    // Tenta atualizar na tabela 'usuarios' que agora serve como Perfil Global
    const { error } = await (supabase.from("usuarios") as any)
        .update({ ultimo_acesso_empresa_id: empresaId })
        .eq("auth_user_id", authUserId);

    return !error;
}
