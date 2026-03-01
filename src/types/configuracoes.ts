export interface EmitenteConfig {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    ie: string;
    crt: "1" | "2" | "3"; // 1=Simples Nacional
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    codigo_municipio: string;
    uf: string;
    codigo_uf: string;
    cep: string;
    telefone: string;
    email: string;
    ambiente: "homologacao" | "producao";
}

export interface CertificadoConfig {
    pfx_base64: string;
    senha: string;
    csc: string;
    csc_id: string; // Ex: 000001
    validade?: string;
}

export interface WhatsappConfig {
    api_token: string;
    phone_number_id: string; // ID do número no Business Manager
    business_account_id: string; // ID da conta WhatsApp Business
    welcome_template: string; // Nome do template de boas-vindas
    status_template: string; // Nome do template de atualização de status
    enabled: boolean;
    venda_template?: string;
}

export interface CategoriaMargin {
    nome: string;
    margem_padrao: number; // Porcentagem
    tipo_margem: "porcentagem" | "fixo";
    garantia_padrao_dias: number;
    nf_obrigatoria: boolean;
    default_gateway_id?: string;
}

export interface CartaoTaxa {
    parcela: number;
    taxa: number; // Porcentagem
}

export interface PaymentGateway {
    id: string;
    nome: string;
    taxa_pix_pct: number;
    taxa_debito_pct: number;
    taxas_credito: CartaoTaxa[];
    is_default: boolean;
    enabled: boolean;
}

export interface FinanceiroConfig {
    taxa_nota_fiscal_pct: number;
    cotacao_dolar_paraguai: number;
    categorias: CategoriaMargin[];
    gateways: PaymentGateway[];
    // Mantidos para compatibilidade legacy
    taxa_pix_pct?: number;
    taxa_debito_pct?: number;
    taxas_credito?: CartaoTaxa[];
    nf_obrigatoria?: boolean;
}
