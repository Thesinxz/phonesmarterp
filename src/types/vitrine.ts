/**
 * Tipos para a Vitrine Online Pública
 */

export interface ProdutoVitrine {
    id: string;
    nome: string;
    cor: string | null;
    capacidade: string | null;
    grade: string | null;
    categoria: string | null;
    subcategoria?: string | null;
    condicao?: string | null;
    memoria_ram?: string | null;
    garantia_dias?: number;
    em_estoque: boolean;
    poucas_unidades: boolean; // estoque <= estoque_minimo
    preco_pix: number;       // centavos — preço à vista
    preco_debito: number;    // centavos — preço no débito
    parcelas: ParcelaInfo[];
    imagem_url: string | null;
}

export interface ParcelaInfo {
    qtd: number;           // 1, 2, 3... até max_parcelas
    valor_parcela: number; // centavos
    valor_total: number;   // centavos
    taxa: number;          // % aplicada
}

export interface VitrineConfig {
    enabled: boolean;
    titulo: string;              // Ex: "Ofertas da Semana"
    mensagem_whatsapp: string;   // Mensagem pré-preenchida
    mostrar_grade: boolean;
    max_parcelas: number;        // 3, 6, 10, 12
    cor_tema: string;            // hex color
    produtos_destaque: string[]; // IDs dos produtos em destaque
}

export interface VitrineEmpresa {
    nome: string;
    logo_url: string | null;
    subdominio: string;
    whatsapp: string | null;
}

export interface VitrineResponse {
    empresa: VitrineEmpresa;
    config: VitrineConfig;
    produtos: ProdutoVitrine[];
    categorias_disponiveis: string[];
    gateway_nome: string;
}
