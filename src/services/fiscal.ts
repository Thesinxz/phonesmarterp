import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

// Esta tabela config_fiscais não está no Types Database autogerado antigo,
// então vamos tipar manualmente baseado na migration
export interface ConfiguracaoFiscal {
    id?: string;
    empresa_id: string;
    ambiente: "homologacao" | "producao";
    regime_tributario: "simples_nacional" | "lucro_presumido" | "lucro_real";
    certificado_base64?: string;
    certificado_senha?: string;
    certificado_vencimento?: string;
    serie_nfe: number;
    numero_nfe: number;
    serie_nfce: number;
    numero_nfce: number;
    csc_nfce?: string;
    csc_id_nfce?: string;
    created_at?: string;
    updated_at?: string;
}

const supabase = createClient() as any;

export async function getFiscalConfig(empresaId: string): Promise<ConfiguracaoFiscal | null> {
    const { data, error } = await supabase
        .from("configuracoes_fiscais")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.error("Erro ao buscar configuração fiscal:", error);
        throw error;
    }

    return data as ConfiguracaoFiscal | null;
}

export async function upsertFiscalConfig(empresaId: string, payload: Partial<ConfiguracaoFiscal>): Promise<ConfiguracaoFiscal> {
    // Busca para ver se já existe
    const existente = await getFiscalConfig(empresaId);

    const dados = {
        ...payload,
        empresa_id: empresaId,
        updated_at: new Date().toISOString()
    };

    let result;
    if (existente) {
        // Update
        const { data, error } = await supabase
            .from("configuracoes_fiscais")
            .update(dados)
            .eq("empresa_id", empresaId)
            .select()
            .single();

        if (error) throw error;
        result = data;
    } else {
        // Insert
        const { data, error } = await supabase
            .from("configuracoes_fiscais")
            .insert([dados])
            .select()
            .single();

        if (error) throw error;
        result = data;
    }

    return result as ConfiguracaoFiscal;
}

export interface DocumentoFiscal {
    id?: string;
    empresa_id: string;
    tipo: "NFE" | "NFCE" | "NFSE" | "MDE";
    ambiente: "homologacao" | "producao";
    status: "pendente" | "processando" | "autorizada" | "rejeitada" | "cancelada" | "inutilizada";
    numero?: number;
    serie?: number;
    chave_acesso?: string;
    recibo?: string;
    protocolo?: string;
    data_emissao?: string;
    valor_total_centavos: number;
    xml_base64?: string;
    pdf_url?: string;
    motivo_status?: string;
    venda_id?: string;
    os_id?: string;
    cliente_id?: string;
    created_at?: string;
    updated_at?: string;
}

export async function getDocumentosFiscais(empresaId: string): Promise<DocumentoFiscal[]> {
    const { data, error } = await supabase
        .from("documentos_fiscais")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao buscar documentos fiscais:", error);
        throw error;
    }

    return data as DocumentoFiscal[];
}

export async function upsertDocumentoFiscal(payload: DocumentoFiscal): Promise<DocumentoFiscal> {
    const dados = {
        ...payload,
        updated_at: new Date().toISOString()
    };

    let result;
    if (payload.id) {
        // Update
        const { data, error } = await supabase
            .from("documentos_fiscais")
            .update(dados)
            .eq("id", payload.id)
            .select()
            .single();

        if (error) throw error;
        result = data;
    } else {
        // Insert
        const { data, error } = await supabase
            .from("documentos_fiscais")
            .insert([dados])
            .select()
            .single();

        if (error) throw error;
        result = data;
    }

    return result as DocumentoFiscal;
}
