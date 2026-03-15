"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Exclui uma empresa permanentemente
 */
export async function deleteEmpresa(params: {
    empresaId: string;
    userId: string;
    confirmationName: string;
}) {
    const supabase = await createClient();

    try {
        // 1. Verificar se a empresa existe e ler o nome
        const { data: empresa, error: fetchError } = await (supabase.from("empresas") as any)
            .select("nome")
            .eq("id", params.empresaId)
            .single();

        if (fetchError || !empresa) throw new Error("Empresa não encontrada.");

        // 2. Verificar se o nome de confirmação coincide (case insensitive e trim)
        if (empresa.nome.trim().toLowerCase() !== params.confirmationName.trim().toLowerCase()) {
            throw new Error(`O nome digitado ("${params.confirmationName}") não coincide com o nome da empresa ("${empresa.nome}").`);
        }

        // 3. Verificar permissão (deve ser o dono - papel 'dono')
        const { data: profile, error: profileError } = await (supabase.from("usuarios") as any)
            .select("papel")
            .eq("auth_user_id", params.userId)
            .eq("empresa_id", params.empresaId)
            .single();

        if (profileError || profile.papel !== 'admin') {
            throw new Error("Apenas o administrador (admin) pode excluir a empresa.");
        }

        // 4. Verificar se é a única empresa do usuário
        const { count } = await (supabase.from("usuarios") as any)
            .select("*", { count: 'exact', head: true })
            .eq("auth_user_id", params.userId);

        if (count && count <= 1) {
            throw new Error("Você não pode excluir sua única empresa. O sistema requer pelo menos uma conta ativa.");
        }

        // 5. Excluir a empresa
        // Com a Migration 094 (ON DELETE CASCADE), as tabelas filhas são removidas automaticamente.
        const { error: deleteError } = await (supabase.from("empresas") as any)
            .delete()
            .eq("id", params.empresaId);

        if (deleteError) {
            console.error("[deleteEmpresa] Erro no banco:", deleteError);
            throw new Error(`Falha ao excluir empresa: ${deleteError.message}`);
        }

        // 6. Verificar se deletou mesmo (Sanity check)
        const { data: verify } = await (supabase.from("empresas") as any)
            .select("id")
            .eq("id", params.empresaId)
            .maybeSingle();

        if (verify) {
            throw new Error("A exclusão foi processada mas a empresa ainda consta no banco. Verifique as políticas de RLS ou constraints.");
        }

        // 7. Revalidar caminhos
        revalidatePath("/");
        revalidatePath("/configuracoes/empresas");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteEmpresa] Erro fatal:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Erro desconhecido ao excluir empresa" 
        };
    }
}

/**
 * Atualiza dados de uma empresa (tabela empresas + config nfe_emitente)
 */
export async function updateEmpresaDados(params: {
    empresaId: string;
    userId: string;
    nome?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    logo_url?: string;
    endereco?: {
        cep: string;
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
}) {
    const supabase = await createClient();

    try {
        // 1. Verificar permissão
        const { data: profile, error: profileError } = await (supabase.from("usuarios") as any)
            .select("papel")
            .eq("auth_user_id", params.userId)
            .eq("empresa_id", params.empresaId)
            .single();

        if (profileError || profile.papel !== 'admin') {
            throw new Error("Apenas o administrador (admin) pode editar dados da empresa.");
        }

        // 2. Atualizar tabela 'empresas' (Nome e Logo)
        const updateData: any = {};
        if (params.nome) updateData.nome = params.nome;
        if (params.logo_url) updateData.logo_url = params.logo_url;

        if (Object.keys(updateData).length > 0) {
            const { error: empError } = await (supabase.from("empresas") as any)
                .update(updateData)
                .eq("id", params.empresaId);
            if (empError) throw empError;
        }

        // 3. Atualizar ou criar configuração 'nfe_emitente'
        if (params.cnpj || params.endereco || params.nome) {
            // Buscar config atual
            const { data: configRow } = await supabase
                .from("configuracoes")
                .select("valor")
                .eq("empresa_id", params.empresaId)
                .eq("chave", "nfe_emitente")
                .maybeSingle();

            const currentVal = (configRow as any)?.valor || {};
            const newVal = {
                ...currentVal,
                razao_social: params.nome || currentVal.razao_social || params.nome,
                nome_fantasia: params.nome || currentVal.nome_fantasia || params.nome,
                cnpj: params.cnpj || currentVal.cnpj || "",
                telefone: params.telefone || currentVal.telefone || "",
                email: params.email || currentVal.email || "",
                ...(params.endereco ? {
                    cep: params.endereco.cep,
                    logradouro: params.endereco.logradouro,
                    numero: params.endereco.numero,
                    complemento: params.endereco.complemento || "",
                    bairro: params.endereco.bairro,
                    municipio: params.endereco.cidade,
                    uf: params.endereco.estado,
                } : {})
            };

            const { error: cfgError } = await (supabase.from("configuracoes") as any)
                .upsert({
                    empresa_id: params.empresaId,
                    chave: "nfe_emitente",
                    valor: newVal,
                    updated_at: new Date().toISOString()
                }, { onConflict: "empresa_id,chave" });

            if (cfgError) throw cfgError;
        }

        revalidatePath("/configuracoes/empresas");
        return { success: true };
    } catch (error: any) {
        console.error("[updateEmpresaDados] Error:", error);
        return { success: false, error: error.message || "Erro ao atualizar dados da empresa." };
    }
}

/**
 * Cria uma nova empresa com endereço obrigatório e unidade padrão
 */
export async function createEmpresa(params: {
    userId: string;
    nome: string;
    cnpj: string;
    telefone?: string;
    email?: string;
    endereco: {
        cep: string;
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
    copyFromEmpresaId?: string;
}) {
    const supabase = await createClient();

    try {
        // 1. Validar campos obrigatórios
        if (!params.cnpj || !params.endereco?.logradouro || !params.endereco?.numero) {
            throw new Error("CNPJ e endereço são obrigatórios.");
        }

        // 2. Verificar limite de empresas do usuário
        const { count } = await (supabase.from("usuarios") as any)
            .select("*", { count: 'exact', head: true })
            .eq("auth_user_id", params.userId);

        const { data: userProfile } = await (supabase.from("usuarios") as any)
            .select("max_empresas, nome, email")
            .eq("auth_user_id", params.userId)
            .limit(1)
            .single();

        if (count && count >= (userProfile?.max_empresas || 1)) {
            throw new Error("Limite de empresas do seu plano atingido.");
        }

        // 3. Gerar subdomínio único
        const subdomain = params.nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 7);

        // 4. Criar a empresa
        const { data: empresa, error: empError } = await (supabase.from("empresas") as any)
            .insert({
                nome: params.nome,
                cnpj: params.cnpj,
                subdominio: subdomain,
                plano: 'starter',
                onboarding_completed: params.copyFromEmpresaId ? true : false
            })
            .select()
            .single();

        if (empError || !empresa) throw empError || new Error("Erro ao criar empresa.");

        // 5. Criar Unidade padrão (Matriz)
        const { data: unit, error: unitError } = await (supabase.from("units") as any)
            .insert({
                empresa_id: empresa.id,
                name: "Matriz",
                address: `${params.endereco.logradouro}, ${params.endereco.numero}`,
                has_repair_lab: true,
                has_parts_stock: true,
                has_sales: true,
                is_active: true
            })
            .select()
            .single();

        if (unitError) throw unitError;

        // 6. Criar Perfil do Usuário (PAPEL ADMIN)
        const { error: profileError } = await (supabase.from("usuarios") as any)
            .insert({
                auth_user_id: params.userId,
                empresa_id: empresa.id,
                unit_id: unit.id,
                nome: userProfile?.nome || "Admin",
                email: params.email || userProfile?.email || "",
                papel: 'admin',
                ativo: true,
                plano: 'starter',
                max_empresas: userProfile?.max_empresas || 1
            });

        if (profileError) throw profileError;

        // 7. Salvar endereço em configuracoes (nfe_emitente)
        const nfeEmitente = {
            razao_social: params.nome,
            nome_fantasia: params.nome,
            cnpj: params.cnpj,
            telefone: params.telefone || "",
            email: params.email || "",
            cep: params.endereco.cep,
            logradouro: params.endereco.logradouro,
            numero: params.endereco.numero,
            complemento: params.endereco.complemento || "",
            bairro: params.endereco.bairro,
            municipio: params.endereco.cidade,
            uf: params.endereco.estado,
        };

        await (supabase.from("configuracoes") as any).insert({
            empresa_id: empresa.id,
            chave: "nfe_emitente",
            valor: nfeEmitente
        });

        // 8. Copiar configurações se solicitado
        if (params.copyFromEmpresaId) {
             await (supabase as any).rpc('clone_company_data', {
                p_source_empresa_id: params.copyFromEmpresaId,
                p_target_empresa_id: empresa.id,
                p_options: { configs: true, products: false, clients: false }
            });
        }

        revalidatePath("/configuracoes/empresas");
        return { success: true, empresaId: empresa.id };
    } catch (error: any) {
        console.error("[createEmpresa] Error:", error);
        return { success: false, error: error.message || "Erro ao criar empresa." };
    }
}
