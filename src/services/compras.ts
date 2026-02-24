import { createClient } from "@/lib/supabase/client";

const supabase = createClient() as any;

// ────────────────────────────────────────
// Fornecedores
// ────────────────────────────────────────

export interface FornecedorPayload {
    id?: string;
    empresa_id: string;
    nome: string;
    cnpj?: string;
    cpf?: string;
    ie?: string;
    im?: string;
    telefone?: string;
    email?: string;
    contato?: string;
    endereco_json?: Record<string, any>;
    observacoes?: string;
    ativo?: boolean;
}

export async function getFornecedores(empresaId: string) {
    const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
    if (error) throw error;
    return data as FornecedorPayload[];
}

export async function getFornecedorByCnpj(empresaId: string, cnpj: string) {
    const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cnpj", cnpj.replace(/\D/g, ""))
        .maybeSingle();
    if (error) throw error;
    return data as FornecedorPayload | null;
}

export async function upsertFornecedor(payload: FornecedorPayload): Promise<FornecedorPayload> {
    const dados = {
        ...payload,
        cnpj: payload.cnpj?.replace(/\D/g, "") || null,
        updated_at: new Date().toISOString(),
    };

    if (payload.id) {
        const { data, error } = await supabase
            .from("fornecedores")
            .update(dados)
            .eq("id", payload.id)
            .select().single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from("fornecedores")
            .insert([dados])
            .select().single();
        if (error) throw error;
        return data;
    }
}

// ────────────────────────────────────────
// Compras
// ────────────────────────────────────────

export interface CompraItemPayload {
    empresa_id: string;
    produto_id?: string | null;
    nome_produto: string;
    ncm?: string;
    cfop?: string;
    ean?: string;
    unidade?: string;
    quantidade: number;
    custo_unitario_centavos: number;
    total_centavos: number;
}

export interface CompraPayload {
    empresa_id: string;
    fornecedor_id?: string | null;
    numero_nf?: string;
    serie?: string;
    chave_acesso?: string;
    xml_importacao_id?: string | null;
    data_compra: string;
    data_vencimento?: string | null;
    status?: "pendente" | "concluida" | "cancelada";
    valor_subtotal_centavos: number;
    valor_frete_centavos?: number;
    valor_desconto_centavos?: number;
    valor_total_centavos: number;
    forma_pagamento?: string;
    observacoes?: string;
    titulo_id?: string | null;
    itens: CompraItemPayload[];
}

export async function getCompras(empresaId: string, page = 1, perPage = 50) {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error, count } = await supabase
        .from("compras")
        .select("*, fornecedores(id, nome, cnpj)", { count: "exact" })
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .range(from, to);
    if (error) throw error;
    return { data, count };
}

export async function createCompra(payload: CompraPayload): Promise<string> {
    const { itens, ...compraData } = payload;

    // 1. Inserir a compra
    const { data: compra, error: compraErr } = await supabase
        .from("compras")
        .insert([{
            ...compraData,
            valor_frete_centavos: compraData.valor_frete_centavos ?? 0,
            valor_desconto_centavos: compraData.valor_desconto_centavos ?? 0,
            status: compraData.status ?? "concluida",
            updated_at: new Date().toISOString(),
        }])
        .select("id")
        .single();
    if (compraErr) throw compraErr;

    const compraId = compra.id as string;

    // 2. Inserir itens
    if (itens.length > 0) {
        const itensComId = itens.map(i => ({ ...i, compra_id: compraId }));
        const { error: itensErr } = await supabase.from("compra_itens").insert(itensComId);
        if (itensErr) throw itensErr;
    }

    return compraId;
}

// ────────────────────────────────────────
// XML Importacoes — Consulta MD-e
// ────────────────────────────────────────

export async function getXmlImportacoes(empresaId: string) {
    const { data, error } = await supabase
        .from("xml_importacoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
}

export async function upsertXmlImportacao(payload: Record<string, any>) {
    const { data, error } = await supabase
        .from("xml_importacoes")
        .upsert([payload], { onConflict: "empresa_id,chave_acesso" })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateXmlImportacao(id: string, patch: Record<string, any>) {
    const { error } = await supabase
        .from("xml_importacoes")
        .update(patch)
        .eq("id", id);
    if (error) throw error;
}
