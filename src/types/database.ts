export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            empresas: {
                Row: {
                    id: string;
                    nome: string;
                    cnpj: string | null;
                    subdominio: string;
                    plano: "starter" | "profissional" | "enterprise";
                    certificado_a1: string | null;
                    logo_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["empresas"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["empresas"]["Insert"]>;
            };
            usuarios: {
                Row: {
                    id: string;
                    auth_user_id: string | null;
                    empresa_id: string;
                    nome: string;
                    email: string;
                    papel: "admin" | "gerente" | "tecnico" | "financeiro" | "atendente";
                    permissoes_json: Json;
                    ativo: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["usuarios"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
            };
            clientes: {
                Row: {
                    id: string;
                    empresa_id: string;
                    nome: string;
                    cpf_cnpj: string | null;
                    telefone: string | null;
                    email: string | null;
                    endereco_json: Json | null;
                    pontos_fidelidade: number;
                    segmento: "novo" | "vip" | "atacadista" | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
            };
            equipamentos: {
                Row: {
                    id: string;
                    cliente_id: string;
                    empresa_id: string;
                    marca: string;
                    modelo: string;
                    imei: string | null;
                    cor: string | null;
                    observacoes: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["equipamentos"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["equipamentos"]["Insert"]>;
            };
            ordens_servico: {
                Row: {
                    id: string;
                    numero: number;
                    empresa_id: string;
                    cliente_id: string;
                    equipamento_id: string | null;
                    tecnico_id: string | null;
                    status: "aberta" | "em_analise" | "aguardando_peca" | "em_execucao" | "finalizada" | "entregue" | "cancelada";
                    problema_relatado: string;
                    diagnostico: string | null;
                    checklist_json: Json | null;
                    checklist_entrada_json: Json | null;
                    checklist_saida_json: Json | null;
                    valor_total_centavos: number;
                    forma_pagamento: string | null;
                    garantia_ate: string | null;
                    garantia_dias: number | null;
                    termo_garantia_texto: string | null;
                    assinatura_base64: string | null;
                    token_teste: string | null;
                    teste_saida_concluido: boolean;
                    teste_saida_concluido_em: string | null;
                    tipo_equipamento: string;
                    marca_equipamento: string | null;
                    modelo_equipamento: string | null;
                    cor_equipamento: string | null;
                    imei_equipamento: string | null;
                    numero_serie: string | null;
                    senha_dispositivo: string | null;
                    senha_tipo: string | null;
                    acessorios_recebidos: Json;
                    foto_entrada_url: string | null;
                    problemas_tags: string[];
                    observacoes_internas: string | null;
                    pecas_json: Json;
                    mao_obra_json: Json;
                    desconto_centavos: number;
                    desconto_motivo: string | null;
                    valor_entrada_centavos: number;
                    prioridade: string;
                    prazo_estimado: string | null;
                    status_rascunho: boolean;
                    estoque_baixado: boolean;
                    parcelamento: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["ordens_servico"]["Row"], "id" | "numero" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["ordens_servico"]["Insert"]>;
            };
            os_timeline: {
                Row: {
                    id: string;
                    os_id: string;
                    empresa_id: string;
                    usuario_id: string;
                    evento: string;
                    dados_json: Json | null;
                    criado_em: string;
                };
                Insert: Omit<Database["public"]["Tables"]["os_timeline"]["Row"], "id" | "criado_em">;
                Update: never;
            };
            produtos: {
                Row: {
                    id: string;
                    empresa_id: string;
                    nome: string;
                    descricao: string | null;
                    preco_custo_centavos: number;
                    preco_venda_centavos: number;
                    estoque_qtd: number;
                    estoque_minimo: number;
                    fornecedor_id: string | null;
                    // Especificos de Aparelho
                    imei: string | null;
                    cor: string | null;
                    capacidade: string | null;
                    grade: "A" | "B" | "C" | null;
                    // Categoria (vinculada à CategoriaMargin da config financeira)
                    categoria: string | null;
                    subcategoria: string | null;
                    // Fiscais
                    codigo_barras: string | null;
                    sku: string | null;
                    ncm: string;
                    cfop: string;
                    origem: string;
                    cest: string | null;

                    // Novos Detalhes Avançados
                    condicao: "novo_lacrado" | "seminovo" | "usado" | "defeito" | "peca_reposicao" | "outro";
                    saude_bateria: number | null;
                    memoria_ram: string | null;
                    imagem_url: string | null;
                    exibir_vitrine: boolean;

                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["produtos"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["produtos"]["Insert"]>;
            };
            produtos_historico: {
                Row: {
                    id: string;
                    empresa_id: string;
                    produto_id: string;
                    tipo_evento: "criacao" | "edicao" | "transferencia" | "venda" | "os_aberta" | "os_finalizada" | "devolucao" | "garantia";
                    descricao: string;
                    referencia_id: string | null;
                    usuario_id: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["produtos_historico"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["produtos_historico"]["Insert"]>;
            };
            vendas: {
                Row: {
                    id: string;
                    numero: number;
                    empresa_id: string;
                    cliente_id: string | null;
                    total_centavos: number;
                    desconto_centavos: number;
                    forma_pagamento: string;
                    nfce_chave: string | null;
                    observacoes: string | null;
                    tipo?: "pdv" | "pedido";
                    status_pedido?: "rascunho" | "aguardando_aprovacao" | "aprovado" | "separando" | "enviado" | "entregue" | "cancelado" | null;
                    canal_venda?: "balcao" | "whatsapp" | "telefone" | "site" | "instagram" | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["vendas"]["Row"], "id" | "created_at" | "numero"> & { numero?: number };
                Update: Partial<Database["public"]["Tables"]["vendas"]["Insert"]>;
            };
            venda_itens: {
                Row: {
                    id: string;
                    venda_id: string;
                    empresa_id: string;
                    produto_id: string | null;
                    quantidade: number;
                    preco_unitario_centavos: number;
                    total_centavos: number;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["venda_itens"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["venda_itens"]["Insert"]>;
            };
            financeiro: {
                Row: {
                    id: string;
                    empresa_id: string;
                    tipo: "entrada" | "saida";
                    valor_centavos: number;
                    categoria: string;
                    centro_custo: string | null;
                    descricao: string | null;
                    vencimento: string | null;
                    pago: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["financeiro"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["financeiro"]["Insert"]>;
            };
            configuracoes: {
                Row: {
                    id: string;
                    empresa_id: string;
                    chave: string;
                    valor: any; // JSONB
                    descricao: string | null;
                    is_secret: boolean;
                    updated_at: string;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["configuracoes"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["configuracoes"]["Insert"]>;
            };
            tecnicos: {
                Row: {
                    id: string;
                    empresa_id: string;
                    usuario_id: string;
                    comissao_pct: number;
                    meta_mensal_centavos: number;
                    especialidades: string[];
                    ativo: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["tecnicos"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["tecnicos"]["Insert"]>;
            };
            audit_logs: {
                Row: {
                    id: string;
                    empresa_id: string;
                    usuario_id: string;
                    tabela: string;
                    acao: "INSERT" | "UPDATE" | "DELETE";
                    dado_anterior_json: Json | null;
                    dado_novo_json: Json | null;
                    criado_em: string;
                };
                Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "criado_em">;
                Update: never;
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}

export type Empresa = Database["public"]["Tables"]["empresas"]["Row"];
export type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Equipamento = Database["public"]["Tables"]["equipamentos"]["Row"];
export type OrdemServico = Database["public"]["Tables"]["ordens_servico"]["Row"];
export type OsTimeline = Database["public"]["Tables"]["os_timeline"]["Row"];
export type Produto = Database["public"]["Tables"]["produtos"]["Row"];
export type Venda = Database["public"]["Tables"]["vendas"]["Row"];
export type VendaItem = Database["public"]["Tables"]["venda_itens"]["Row"];
export type Financeiro = Database["public"]["Tables"]["financeiro"]["Row"];
export type Tecnico = Database["public"]["Tables"]["tecnicos"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export type OsStatus = OrdemServico["status"];
export type UserPapel = Usuario["papel"];
export type Plano = Empresa["plano"];
