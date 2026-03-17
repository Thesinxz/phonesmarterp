import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// --- TYPES ---

export type PurchaseItem = {
    nome: string;
    quantidade: number;
    custoUnitario: number;
    precoVarejo: number;
    precoAtacado: number;
    tipo: string;
    categoria: string;
    subcategoria?: string;
};

export type FinalizarCompraParams = {
    empresaId: string;
    itens: PurchaseItem[];
    fornecedorId?: string;
    fornecedorNome?: string;
    dataNota: string;
    numeroNota?: string;
    valorTotal: number;
    vencimento: string;
    parcelas: number;
    origem: 'manual' | 'ocr_pdf' | 'ocr_imagem' | 'xml_nfe';
};

export interface FornecedorPayload {
    id?: string;
    empresa_id: string;
    nome: string;
    cnpj?: string;
    ie?: string;
    telefone?: string;
    email?: string;
    contato?: string;
    endereco_json?: any;
    observacoes?: string;
}

export interface CompraItemPayload {
    empresa_id: string;
    compra_id?: string;
    produto_id: string | null;
    nome_produto: string;
    ncm?: string;
    cfop?: string;
    ean?: string;
    unidade?: string;
    quantidade: number;
    custo_unitario_centavos: number;
    total_centavos: number;
}

// --- XML IMPORT / SEFAZ FUNCTIONS ---

export async function getXmlImportacoes(empresaId: string) {
    const { data, error } = await (supabase as any)
        .from("xml_importacoes")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function upsertXmlImportacao(payload: any): Promise<any> {
    const { data, error } = await (supabase as any)
        .from("xml_importacoes")
        .upsert(payload, { onConflict: 'chave_acesso' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateXmlImportacao(id: string, payload: any): Promise<any> {
    const { data, error } = await (supabase as any)
        .from("xml_importacoes")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// --- FORNECEDOR FUNCTIONS ---

export async function getFornecedorByCnpj(empresaId: string, cnpj: string) {
    const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cnpj", cnpj)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function upsertFornecedor(payload: any) {
    const { data, error } = await (supabase as any)
        .from("fornecedores")
        .upsert(payload, { onConflict: 'cnpj' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// --- COMPRA FUNCTIONS ---

export async function createCompra(payload: any) {
    const { data, error } = await (supabase as any)
        .from("compras")
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getCompras(empresaId: string, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await (supabase as any)
        .from("compras")
        .select(`*, fornecedor:fornecedor_id (nome, cnpj)`, { count: "exact" })
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;
    return { data, count };
}

export async function getCompraById(id: string) {
    const { data, error } = await (supabase as any)
        .from("compras")
        .select(`*, compra_itens (*), fornecedor:fornecedor_id (*)`)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

export async function finalizarCompra(params: FinalizarCompraParams) {
    const {
        empresaId,
        itens,
        fornecedorId,
        fornecedorNome,
        dataNota,
        numeroNota,
        valorTotal,
        vencimento,
        origem
    } = params;

    // 1. Criar Ordem de Compra
    const { data: compra, error: compraError } = await (supabase as any)
        .from('compras')
        .insert({
            empresa_id: empresaId,
            fornecedor_id: fornecedorId || null,
            fornecedor_nome: fornecedorNome,
            data_compra: dataNota,
            data_vencimento: vencimento,
            valor_total: valorTotal,
            nota_fiscal_numero: numeroNota,
            status: 'pendente',
            origem: origem
        })
        .select()
        .single();

    if (compraError) throw compraError;

    // 2. Inserir itens da compra
    const { error: itensError } = await (supabase as any).from('compra_itens').insert(
        itens.map(item => ({
            empresa_id: empresaId,
            compra_id: compra.id,
            nome: item.nome,
            quantidade: item.quantidade,
            custo_unitario: item.custoUnitario,
            preco_venda_varejo: item.precoVarejo,
            preco_venda_atacado: item.precoAtacado,
            item_type: item.tipo,
            categoria: item.categoria,
            subcategoria: item.subcategoria
        }))
    );

    if (itensError) throw itensError;

    return {
        success: true,
        compraId: compra.id,
        compraNumero: `OC-${String(compra.numero).padStart(3, '0')}`
    };
}
