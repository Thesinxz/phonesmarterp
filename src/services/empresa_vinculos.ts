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
    const allLinks: Map<string, CompanyLink> = new Map();

    try {
        // 1. Buscar na tabela 'usuario_vinculos_empresa' (Mapeamento explícito)
        const { data: vinculosByAuth, error: authErr } = await (supabase.from("usuario_vinculos_empresa" as any))
            .select(`
                *,
                empresa:empresas(*)
            `)
            .eq("auth_user_id", authUserId);

        if (!authErr && vinculosByAuth) {
            (vinculosByAuth as any[]).forEach(v => {
                if (v.empresa) {
                    allLinks.set(v.empresa_id, {
                        id: v.id,
                        usuario_id: v.usuario_id,
                        empresa_id: v.empresa_id,
                        papel: v.papel,
                        permissoes_custom_json: v.permissoes_custom_json,
                        empresa: v.empresa
                    });
                }
            });
        }

        // 2. Buscar na tabela 'usuarios' diretamente (Cada linha é um perfil/vínculo)
        // Isso garante que mesmo empresas criadas antes da tabela de vínculos ou via trigger apareçam
        const { data: profiles, error: profileError } = await (supabase.from("usuarios") as any)
            .select(`
                *,
                empresa:empresas(*)
            `)
            .eq("auth_user_id", authUserId);

        if (!profileError && profiles) {
            (profiles as any[]).forEach(p => {
                if (p.empresa && !allLinks.has(p.empresa_id)) {
                    allLinks.set(p.empresa_id, {
                        id: p.id,
                        usuario_id: p.auth_user_id,
                        empresa_id: p.empresa_id,
                        papel: p.papel,
                        permissoes_custom_json: p.permissoes_json,
                        empresa: p.empresa
                    });
                }
            });
        }
    } catch (e) {
        logger.error("[Auth] Erro crítico ao buscar vínculos de empresa:", e);
    }

    const result = Array.from(allLinks.values());
    logger.log(`[Auth] Total de empresas encontradas para ${authUserId}:`, result.length);
    
    return result;
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
