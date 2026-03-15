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
                    trial_ends_at: string | null;
                    onboarding_completed: boolean;
                    copied_from_empresa_id: string | null;
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
                    unit_id: string | null;
                    nome: string;
                    email: string;
                    papel: "admin" | "gerente" | "tecnico" | "financeiro" | "atendente";
                    permissoes_json: Json;
                    ativo: boolean;
                    plano: "starter" | "profissional" | "enterprise";
                    plano_expira_em: string | null;
                    trial_start: string | null;
                    trial_end: string | null;
                    max_empresas: number;
                    stripe_customer_id: string | null;
                    stripe_subscription_id: string | null;
                    ultimo_acesso_empresa_id: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["usuarios"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["usuarios"]["Row"]>;
            };
            usuario_vinculos_empresa: {
                Row: {
                    id: string;
                    usuario_id: string;
                    empresa_id: string;
                    papel: string;
                    permissoes_custom_json: Json;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["usuario_vinculos_empresa"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["usuario_vinculos_empresa"]["Insert"]>;
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
                    instagram: string | null;
                    inscricao_estadual: string | null;
                    indicador_ie: number | null;
                    inscricao_municipal: string | null;
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
                    unit_id: string | null;
                    cliente_id: string;
                    equipamento_id: string | null;
                    tecnico_id: string | null;
                    status: "aberta" | "em_analise" | "aguardando_peca" | "em_transito" | "em_execucao" | "finalizada" | "entregue" | "cancelada";
                    problema_relatado: string;
                    diagnostico: string | null;
                    checklist_json: Json | null;
                    checklist_entrada_json: Json | null;
                    checklist_saida_json: Json | null;
                    valor_total_centavos: number;
                    valor_adiantado_centavos: number;
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
                    product_type_id: string | null;
                    pricing_segment_id: string | null;
                    brand_id: string | null;
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
                    vendedor_id: string | null;
                    total_centavos: number;
                    desconto_centavos: number;
                    forma_pagamento: string;
                    nfce_chave: string | null;
                    observacoes: string | null;
                    tipo?: "pdv" | "pedido";
                    status_pedido?: "rascunho" | "aguardando_aprovacao" | "aprovado" | "separando" | "enviado" | "entregue" | "cancelado" | null;
                    canal_venda?: "balcao" | "whatsapp" | "telefone" | "site" | "instagram" | null;
                    canal_origem?: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["vendas"]["Row"], "id" | "created_at" | "numero" | "vendedor_id" | "canal_origem"> & { numero?: number; vendedor_id?: string | null; canal_origem?: string | null };
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
            caixas: {
                Row: {
                    id: string;
                    empresa_id: string;
                    usuario_abertura_id: string;
                    usuario_fechamento_id: string | null;
                    data_abertura: string;
                    data_fechamento: string | null;
                    saldo_inicial: number;
                    saldo_final_esperado: number | null;
                    saldo_final_informado: number | null;
                    diferenca_fechamento: number | null;
                    status: "aberto" | "fechado";
                    observacao: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["caixas"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["caixas"]["Insert"]>;
            };
            caixa_movimentacoes: {
                Row: {
                    id: string;
                    empresa_id: string;
                    caixa_id: string;
                    usuario_id: string;
                    vendedor_id: string | null;
                    tipo: "venda" | "recebimento_os" | "sangria" | "reforco" | "pagamento_despesa";
                    forma_pagamento: string;
                    valor_centavos: number;
                    observacao: string | null;
                    origem_id: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["caixa_movimentacoes"]["Row"], "id" | "created_at">;
                Update: never;
            };
            financeiro_titulos: {
                Row: {
                    id: string;
                    empresa_id: string;
                    tipo: "pagar" | "receber";
                    status: "pendente" | "pago" | "atrasado" | "cancelado" | "parcial";
                    descricao: string;
                    valor_total_centavos: number;
                    valor_pago_centavos: number;
                    data_vencimento: string;
                    data_pagamento: string | null;
                    cliente_id: string | null;
                    fornecedor_id: string | null;
                    categoria: string;
                    origem_tipo: string | null;
                    origem_id: string | null;
                    forma_pagamento_prevista: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["financeiro_titulos"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["financeiro_titulos"]["Insert"]>;
            };
            xml_importacoes: {
                Row: {
                    id: string;
                    empresa_id: string;
                    chave_acesso: string;
                    fornecedor_cnpj: string | null;
                    fornecedor_nome: string | null;
                    valor_total_centavos: number | null;
                    data_emissao: string | null;
                    status_processamento: "pendente" | "processado" | "erro";
                    arquivo_url: string | null;
                    // MD-e extended fields
                    numero_nf: string | null;
                    serie: string | null;
                    natureza_operacao: string | null;
                    xml_base64: string | null;
                    pdf_url: string | null;
                    itens_json: Json | null;
                    status_manifestacao: "pendente" | "ciencia" | "confirmacao" | "desconhecimento" | "nao_realizada" | null;
                    compra_registrada: boolean;
                    compra_id: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["xml_importacoes"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["xml_importacoes"]["Insert"]>;
            };
            fornecedores: {
                Row: {
                    id: string;
                    empresa_id: string;
                    nome: string;
                    cnpj: string | null;
                    cpf: string | null;
                    ie: string | null;
                    im: string | null;
                    telefone: string | null;
                    email: string | null;
                    contato: string | null;
                    endereco_json: Json | null;
                    observacoes: string | null;
                    ativo: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<{
                    id: string; empresa_id: string; nome: string; cnpj: string | null; cpf: string | null;
                    ie: string | null; im: string | null; telefone: string | null; email: string | null;
                    contato: string | null; endereco_json: Json | null; observacoes: string | null;
                    ativo: boolean; created_at: string; updated_at: string;
                }, "id" | "created_at" | "updated_at">;
                Update: Partial<{ nome: string; cnpj: string | null; cpf: string | null; ie: string | null; im: string | null; telefone: string | null; email: string | null; contato: string | null; endereco_json: Json | null; observacoes: string | null; ativo: boolean; }>;
            };
            compras: {
                Row: {
                    id: string;
                    empresa_id: string;
                    fornecedor_id: string | null;
                    numero_nf: string | null;
                    serie: string | null;
                    chave_acesso: string | null;
                    xml_importacao_id: string | null;
                    data_compra: string;
                    data_vencimento: string | null;
                    status: "pendente" | "concluida" | "cancelada";
                    valor_subtotal_centavos: number;
                    valor_frete_centavos: number;
                    valor_desconto_centavos: number;
                    valor_total_centavos: number;
                    forma_pagamento: string | null;
                    observacoes: string | null;
                    titulo_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<{
                    id: string; empresa_id: string; fornecedor_id: string | null; numero_nf: string | null;
                    serie: string | null; chave_acesso: string | null; xml_importacao_id: string | null;
                    data_compra: string; data_vencimento: string | null; status: "pendente" | "concluida" | "cancelada";
                    valor_subtotal_centavos: number; valor_frete_centavos: number; valor_desconto_centavos: number;
                    valor_total_centavos: number; forma_pagamento: string | null; observacoes: string | null;
                    titulo_id: string | null; created_at: string; updated_at: string;
                }, "id" | "created_at" | "updated_at">;
                Update: Partial<{ fornecedor_id: string | null; data_compra: string; data_vencimento: string | null; status: "pendente" | "concluida" | "cancelada"; valor_total_centavos: number; forma_pagamento: string | null; observacoes: string | null; titulo_id: string | null; }>;
            };
            compra_itens: {
                Row: {
                    id: string;
                    compra_id: string;
                    empresa_id: string;
                    produto_id: string | null;
                    nome_produto: string;
                    ncm: string | null;
                    cfop: string | null;
                    ean: string | null;
                    unidade: string | null;
                    quantidade: number;
                    custo_unitario_centavos: number;
                    total_centavos: number;
                    created_at: string;
                };
                Insert: Omit<{
                    id: string; compra_id: string; empresa_id: string; produto_id: string | null;
                    nome_produto: string; ncm: string | null; cfop: string | null; ean: string | null;
                    unidade: string | null; quantidade: number; custo_unitario_centavos: number;
                    total_centavos: number; created_at: string;
                }, "id" | "created_at">;
                Update: Partial<{ produto_id: string | null; nome_produto: string; ncm: string | null; cfop: string | null; ean: string | null; unidade: string | null; quantidade: number; custo_unitario_centavos: number; total_centavos: number; }>;
            };
            documentos_fiscais: {
                Row: {
                    id: string;
                    empresa_id: string;
                    tipo: string;
                    ambiente: string;
                    status: string;
                    numero: number | null;
                    serie: number | null;
                    chave_acesso: string | null;
                    recibo: string | null;
                    protocolo: string | null;
                    xml_enviado: string | null;
                    xml_autorizado: string | null;
                    pdf_url: string | null;
                    mensagem_sefaz: string | null;
                    dados_json: Json | null;
                    valor_total_centavos: number | null;
                    data_emissao: string | null;
                    cliente_id: string | null;
                    venda_id: string | null;
                    os_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    empresa_id: string;
                    tipo: string;
                    ambiente: string;
                    status: string;
                    numero?: number | null;
                    serie?: number | null;
                    chave_acesso?: string | null;
                    recibo?: string | null;
                    protocolo?: string | null;
                    xml_enviado?: string | null;
                    xml_autorizado?: string | null;
                    pdf_url?: string | null;
                    mensagem_sefaz?: string | null;
                    dados_json?: Json | null;
                    valor_total_centavos?: number | null;
                    data_emissao?: string | null;
                    cliente_id?: string | null;
                    venda_id?: string | null;
                    os_id?: string | null;
                };
                Update: {
                    status?: string;
                    numero?: number | null;
                    serie?: number | null;
                    chave_acesso?: string | null;
                    recibo?: string | null;
                    protocolo?: string | null;
                    xml_enviado?: string | null;
                    xml_autorizado?: string | null;
                    pdf_url?: string | null;
                    mensagem_sefaz?: string | null;
                    dados_json?: Json | null;
                    valor_total_centavos?: number | null;
                };
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
            solicitacoes: {
                Row: {
                    id: string;
                    empresa_id: string;
                    usuario_id: string;
                    titulo: string;
                    descricao: string | null;
                    categoria: "pedido" | "aviso_cliente" | "lembrete" | "outro";
                    prioridade: "baixa" | "media" | "alta" | "urgente";
                    status: "pendente" | "em_andamento" | "concluido" | "arquivado";
                    data_vencimento: string | null;
                    telefone_contato: string | null;
                    nome_cliente: string | null;
                    atribuido_a: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["solicitacoes"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["solicitacoes"]["Insert"]>;
            };
            equipe_metas: {
                Row: {
                    id: string;
                    empresa_id: string;
                    usuario_id: string;
                    tipo_periodo: "mensal" | "semanal" | "trimestral";
                    ano: number;
                    mes: number | null;
                    semana: number | null;
                    meta_faturamento_centavos: number;
                    meta_qtd_vendas: number;
                    ativo: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["equipe_metas"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["equipe_metas"]["Insert"]>;
            };
            equipe_metas_categorias: {
                Row: {
                    id: string;
                    meta_id: string;
                    empresa_id: string;
                    tipo: "categoria" | "subcategoria" | "produto";
                    categoria_nome: string | null;
                    produto_id: string | null;
                    meta_qtd: number;
                    meta_valor_centavos: number;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["equipe_metas_categorias"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["equipe_metas_categorias"]["Insert"]>;
            };
catalog_items: {
                Row: {
                    id: string;
                    empresa_id: string;
                    item_type: string;
                    name: string;
                    cost_price: number;
                    sale_price: number;
                    stock_qty: number;
                    stock_alert_qty: number | null;
                    show_in_storefront: boolean | null;
                    description: string | null;
                    sku: string | null;
                    barcode: string | null;
                    image_url: string | null;
                    ncm: string | null;
                    cfop: string | null;
                    origin_code: string | null;
                    cest: string | null;
                    brand_id: string | null;
                    pricing_segment_id: string | null;
                    subcategory: string | null;
                    condicao: string | null;
                    color: string | null;
                    grade: string | null;
                    storage: string | null;
                    ram: string | null;
                    battery_health: number | null;
                    imei: string | null;
                    imei2: string | null;
                    accessory_type: string | null;
                    compatible_models: string | null;
                    part_type: string | null;
                    quality: string | null;
                    compatible_models_parts: string[] | null;
                    supplier: string | null;
                    part_brand: string | null;
                    model: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["catalog_items"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["catalog_items"]["Insert"]>;
            };
                        product_types: {
                Row: {
                    id: string;
                    empresa_id: string;
                    name: string;
                    slug: string;
                    show_device_specs: boolean;
                    show_imei: boolean;
                    show_grade: boolean;
                    show_battery_health: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["product_types"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["product_types"]["Insert"]>;
            };
            pricing_segments: {
                Row: {
                    id: string;
                    empresa_id: string;
                    name: string;
                    default_margin: number;
                    payment_gateway_id: string | null;
                    warranty_days: number;
                    requires_nf: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["pricing_segments"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["pricing_segments"]["Insert"]>;
            };
            brands: {
                Row: {
                    id: string;
                    empresa_id: string;
                    name: string;
                    default_pricing_segment_id: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["brands"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["brands"]["Insert"]>;
            };
            units: {
                Row: {
                    id: string;
                    empresa_id: string;
                    name: string;
                    address: string | null;
                    is_active: boolean;
                    has_repair_lab: boolean;
                    has_parts_stock: boolean;
                    has_sales: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["units"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
            };
            unit_stock: {
                Row: {
                    id: string;
                    tenant_id: string;
                    unit_id: string;
                    catalog_item_id: string;
                    qty: number;
                    alert_qty: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["unit_stock"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["unit_stock"]["Insert"]>;
            };
            stock_movements: {
                Row: {
                    id: string;
                    tenant_id: string;
                    unit_id: string;
                    catalog_item_id: string;
                    movement_type: "entrada" | "saida_os" | "saida_venda" | "transferencia_saida" | "transferencia_entrada" | "ajuste";
                    qty: number;
                    reference_id: string | null;
                    notes: string | null;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["stock_movements"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>;
            };
            os_unit_transfers: {
                Row: {
                    id: string;
                    tenant_id: string;
                    os_id: string;
                    from_unit_id: string;
                    to_unit_id: string;
                    status: "pendente" | "em_transito" | "recebido" | "cancelado";
                    sent_by: string | null;
                    received_by: string | null;
                    sent_at: string | null;
                    received_at: string | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["os_unit_transfers"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["os_unit_transfers"]["Insert"]>;
            };
            part_compatibility: {
                Row: {
                    id: string;
                    tenant_id: string;
                    catalog_item_id: string;
                    device_model: string;
                    device_model_display: string;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["part_compatibility"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["part_compatibility"]["Insert"]>;
            };
            os_parts: {
                Row: {
                    id: string;
                    tenant_id: string;
                    os_id: string;
                    catalog_item_id: string;
                    unit_id: string;
                    qty: number;
                    cost_price: number;
                    created_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["os_parts"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["os_parts"]["Insert"]>;
            };
            payment_gateways: {
                Row: {
                    id: string;
                    empresa_id: string;
                    nome: string;
                    taxa_pix_pct: number;
                    taxa_debito_pct: number;
                    taxas_credito_json: Json;
                    is_default: boolean;
                    enabled: boolean;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["payment_gateways"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["payment_gateways"]["Insert"]>;
            };
            warranty_claims: {
                Row: {
                    id: string;
                    tenant_id: string;
                    unit_id: string;
                    original_os_id: string;
                    warranty_os_id: string | null;
                    claim_type: "peca_defeituosa" | "erro_tecnico" | "dano_acidental" | "nao_relacionado";
                    is_covered: boolean;
                    coverage_reason: string | null;
                    diagnosis_charged: boolean;
                    diagnosis_amount: number;
                    supplier_claim_status: "nao_aplicavel" | "pendente" | "enviado" | "ressarcido" | "negado";
                    supplier_name: string | null;
                    supplier_claim_notes: string | null;
                    responsible_technician_id: string | null;
                    customer_complaint: string;
                    status: "aberta" | "em_analise" | "aprovada" | "reparo_em_andamento" | "concluida" | "negada";
                    opened_by: string | null;
                    opened_at: string;
                    closed_by: string | null;
                    closed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["warranty_claims"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["warranty_claims"]["Insert"]>;
            };
            warranty_evidences: {
                Row: {
                    id: string;
                    tenant_id: string;
                    warranty_claim_id: string;
                    evidence_type: "foto_defeito" | "foto_aparelho" | "foto_saida" | "documento" | "outro";
                    file_url: string;
                    file_name: string | null;
                    notes: string | null;
                    uploaded_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["warranty_evidences"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["warranty_evidences"]["Insert"]>;
            };
            warranty_checklist_snapshot: {
                Row: {
                    id: string;
                    tenant_id: string;
                    warranty_claim_id: string;
                    original_os_id: string;
                    checklist_data: Json;
                    captured_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["warranty_checklist_snapshot"]["Row"], "id" | "captured_at">;
                Update: Partial<Database["public"]["Tables"]["warranty_checklist_snapshot"]["Insert"]>;
            };
            device_imeis: {
                Row: {
                    id: string;
                    tenant_id: string;
                    imei: string;
                    catalog_item_id: string | null;
                    status: 'em_estoque' | 'em_transito' | 'vendido' | 'em_garantia' | 'bloqueado';
                    current_unit_id: string | null;
                    sale_id: string | null;
                    sold_to_customer_id: string | null;
                    sold_at: string | null;
                    registered_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["device_imeis"]["Row"], "id" | "created_at" | "updated_at">;
                Update: Partial<Database["public"]["Tables"]["device_imeis"]["Insert"]>;
            };
            imei_history: {
                Row: {
                    id: string;
                    tenant_id: string;
                    imei_id: string;
                    imei: string;
                    event_type: 'cadastrado' | 'transferido' | 'vendido' | 'retornou' | 'garantia_aberta' | 'desbloqueado' | 'bloqueado';
                    from_status: string | null;
                    to_status: string | null;
                    unit_id: string | null;
                    reference_id: string | null;
                    notes: string | null;
                    performed_by: string | null;
                    created_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["imei_history"]["Row"], "id" | "created_at">;
                Update: never;
            };
            imei_anatel_checks: {
                Row: {
                    id: string;
                    imei: string;
                    is_blocked: boolean;
                    block_reason: string | null;
                    raw_response: Json | null;
                    checked_at: string;
                    expires_at: string;
                };
                Insert: Omit<Database["public"]["Tables"]["imei_anatel_checks"]["Row"], "id" | "checked_at">;
                Update: Partial<Database["public"]["Tables"]["imei_anatel_checks"]["Insert"]>;
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
export type Caixa = Database["public"]["Tables"]["caixas"]["Row"];
export type CaixaMovimentacao = Database["public"]["Tables"]["caixa_movimentacoes"]["Row"];
export type FinanceiroTitulo = Database["public"]["Tables"]["financeiro_titulos"]["Row"];
export type XmlImportacao = Database["public"]["Tables"]["xml_importacoes"]["Row"];
export type Solicitacao = Database["public"]["Tables"]["solicitacoes"]["Row"];
export type EquipeMeta = Database["public"]["Tables"]["equipe_metas"]["Row"];
export type EquipeMetaCategoria = Database["public"]["Tables"]["equipe_metas_categorias"]["Row"];
export type ProductType = Database["public"]["Tables"]["product_types"]["Row"];
export type PricingSegment = Database["public"]["Tables"]["pricing_segments"]["Row"];
export type Brand = Database["public"]["Tables"]["brands"]["Row"];
export type PaymentGatewayTable = Database["public"]["Tables"]["payment_gateways"]["Row"];

export type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];
export type WarrantyClaim = Database["public"]["Tables"]["warranty_claims"]["Row"];
export type WarrantyEvidence = Database["public"]["Tables"]["warranty_evidences"]["Row"];
export type WarrantyChecklistSnapshot = Database["public"]["Tables"]["warranty_checklist_snapshot"]["Row"];

export type DeviceImei = Database["public"]["Tables"]["device_imeis"]["Row"];
export type ImeiHistoryEvent = Database["public"]["Tables"]["imei_history"]["Row"];
export type ImeiAnatelCheck = Database["public"]["Tables"]["imei_anatel_checks"]["Row"];

export type OsStatus = OrdemServico["status"];
export type UserPapel = Usuario["papel"];
export type Plano = Empresa["plano"];
