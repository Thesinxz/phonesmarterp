import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────
export interface MarketingLog {
    id: string;
    empresa_id: string;
    tipo: "automacao" | "campanha" | "manual";
    template_nome: string | null;
    destinatario_telefone: string | null;
    destinatario_nome: string | null;
    cliente_id: string | null;
    status: "enviado" | "entregue" | "lido" | "falha";
    erro: string | null;
    campanha_id: string | null;
    message_id: string | null;
    created_at: string;
}

export interface MarketingCampanha {
    id: string;
    empresa_id: string;
    nome: string;
    template_nome: string;
    segmento: any;
    mensagem_preview: string | null;
    status: "rascunho" | "enviando" | "concluida" | "erro" | "cancelada";
    total_destinatarios: number;
    total_enviados: number;
    total_falhas: number;
    created_at: string;
    enviado_em: string | null;
}

export interface MarketingAutomacao {
    id: string;
    nome: string;
    descricao: string;
    gatilho: "venda_finalizada" | "venda_entregue" | "recompra" | "aniversario" | "os_pronta_sem_retirada";
    enabled: boolean;
    delay_horas: number;
    template_nome: string;
}

export interface MarketingTemplate {
    id: string;
    nome: string;
    descricao: string;
    variaveis: string[];
    preview_texto: string;
    tipo: "pos_venda" | "campanha" | "os" | "geral";
}

// ─── Logs ─────────────────────────────────────────────────
export async function getMarketingLogs(page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count, error } = await (supabase.from("marketing_logs") as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;
    return { data: (data || []) as MarketingLog[], count: count || 0, totalPages: count ? Math.ceil(count / limit) : 0 };
}

export async function getMarketingStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("marketing_logs") as any)
        .select("status, tipo")
        .gte("created_at", startOfMonth);

    if (error) throw error;

    const logs = data || [];
    return {
        total: logs.length,
        enviados: logs.filter((l: any) => l.status === "enviado").length,
        entregues: logs.filter((l: any) => l.status === "entregue" || l.status === "lido").length,
        falhas: logs.filter((l: any) => l.status === "falha").length,
        automacoes: logs.filter((l: any) => l.tipo === "automacao").length,
        campanhas: logs.filter((l: any) => l.tipo === "campanha").length,
    };
}

export async function createMarketingLog(log: Omit<MarketingLog, "id" | "created_at">) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("marketing_logs") as any)
        .insert(log)
        .select()
        .single();

    if (error) throw error;
    return data as MarketingLog;
}

// ─── Automações (config JSONB) ────────────────────────────
const DEFAULT_AUTOMACOES: MarketingAutomacao[] = [
    {
        id: "agradecimento",
        nome: "Agradecimento Pós-Venda",
        descricao: "Envia mensagem de agradecimento após finalizar a venda",
        gatilho: "venda_finalizada",
        enabled: false,
        delay_horas: 0,
        template_nome: ""
    },
    {
        id: "avaliacao",
        nome: "Pedir Avaliação",
        descricao: "Solicita avaliação 3 dias após a entrega",
        gatilho: "venda_entregue",
        enabled: false,
        delay_horas: 72,
        template_nome: ""
    },
    {
        id: "recompra",
        nome: "Oferta de Recompra",
        descricao: "Oferta para clientes que não compram há 30+ dias",
        gatilho: "recompra",
        enabled: false,
        delay_horas: 720,
        template_nome: ""
    },
    {
        id: "aniversario",
        nome: "Aniversário do Cliente",
        descricao: "Parabéns automático na data de nascimento",
        gatilho: "aniversario",
        enabled: false,
        delay_horas: 0,
        template_nome: ""
    },
    {
        id: "os_lembrete",
        nome: "Retirada de OS",
        descricao: "Lembrete para retirar equipamento pronto há 2 dias",
        gatilho: "os_pronta_sem_retirada",
        enabled: false,
        delay_horas: 48,
        template_nome: ""
    }
];

export async function getAutomacoes(): Promise<MarketingAutomacao[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("configuracoes") as any)
        .select("valor")
        .eq("chave", "marketing_automacoes")
        .maybeSingle();

    if (data?.valor && Array.isArray(data.valor)) {
        // Merge com defaults para garantir que novos fields existam
        return DEFAULT_AUTOMACOES.map(def => {
            const saved = (data.valor as MarketingAutomacao[]).find(a => a.id === def.id);
            return saved ? { ...def, ...saved } : def;
        });
    }
    return DEFAULT_AUTOMACOES;
}

export async function saveAutomacoes(empresaId: string, automacoes: MarketingAutomacao[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("configuracoes") as any)
        .upsert({
            empresa_id: empresaId,
            chave: "marketing_automacoes",
            valor: automacoes,
            descricao: "Configurações de automações de marketing pós-venda",
            is_secret: false
        }, { onConflict: "empresa_id,chave" });

    if (error) throw error;
}

// ─── Templates ────────────────────────────────────────────
const DEFAULT_TEMPLATES: MarketingTemplate[] = [
    {
        id: "obrigado_compra",
        nome: "Obrigado pela compra",
        descricao: "Agradecimento após finalizar venda",
        variaveis: ["nome_cliente", "nome_loja", "valor_total"],
        preview_texto: "Olá {{nome_cliente}}! 😊 Obrigado por sua compra na {{nome_loja}}! Valor: {{valor_total}}. Volte sempre!",
        tipo: "pos_venda"
    },
    {
        id: "pedir_avaliacao",
        nome: "Pedir Avaliação",
        descricao: "Solicitar feedback após entrega",
        variaveis: ["nome_cliente", "nome_loja"],
        preview_texto: "Olá {{nome_cliente}}! Como foi sua experiência na {{nome_loja}}? Sua opinião é muito importante para nós! ⭐",
        tipo: "pos_venda"
    },
    {
        id: "oferta_recompra",
        nome: "Oferta de Recompra",
        descricao: "Promoção para clientes inativos",
        variaveis: ["nome_cliente", "nome_loja"],
        preview_texto: "{{nome_cliente}}, sentimos sua falta! 🎁 Temos novidades na {{nome_loja}} esperando por você. Venha conferir!",
        tipo: "campanha"
    },
    {
        id: "aniversario",
        nome: "Feliz Aniversário",
        descricao: "Parabéns no aniversário do cliente",
        variaveis: ["nome_cliente", "nome_loja"],
        preview_texto: "🎂 Parabéns, {{nome_cliente}}! A {{nome_loja}} deseja um feliz aniversário! Passe aqui para um presente especial!",
        tipo: "geral"
    },
    {
        id: "os_pronta",
        nome: "OS Pronta - Lembrete",
        descricao: "Lembrar cliente que o equipamento está pronto",
        variaveis: ["nome_cliente", "nome_loja", "numero_os"],
        preview_texto: "Olá {{nome_cliente}}! Seu equipamento (OS #{{numero_os}}) já está pronto na {{nome_loja}}. Venha retirar! 📱",
        tipo: "os"
    }
];

export async function getTemplates(): Promise<MarketingTemplate[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("configuracoes") as any)
        .select("valor")
        .eq("chave", "marketing_templates")
        .maybeSingle();

    if (data?.valor && Array.isArray(data.valor)) {
        return data.valor as MarketingTemplate[];
    }
    return DEFAULT_TEMPLATES;
}

export async function saveTemplates(empresaId: string, templates: MarketingTemplate[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("configuracoes") as any)
        .upsert({
            empresa_id: empresaId,
            chave: "marketing_templates",
            valor: templates,
            descricao: "Templates de marketing WhatsApp",
            is_secret: false
        }, { onConflict: "empresa_id,chave" });

    if (error) throw error;
}

// ─── Campanhas ────────────────────────────────────────────
export async function getCampanhas(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count, error } = await (supabase.from("marketing_campanhas") as any)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;
    return { data: (data || []) as MarketingCampanha[], count: count || 0, totalPages: count ? Math.ceil(count / limit) : 0 };
}

export async function createCampanha(campanha: Omit<MarketingCampanha, "id" | "created_at" | "enviado_em" | "total_enviados" | "total_falhas">) {
    // Prevent schema cache errors from unused columns in Postgres
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mensagem_preview, ...safeCampanha } = campanha as any;

    const { data, error } = await (supabase.from("marketing_campanhas") as any)
        .insert(safeCampanha)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('schema cache')) {
            console.error("Schema cache desatualizado, tentando bypass...", error);
        }
        throw error;
    }
    return data as MarketingCampanha;
}

export async function updateCampanha(id: string, updates: Partial<MarketingCampanha>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("marketing_campanhas") as any)
        .update(updates)
        .eq("id", id);

    if (error) throw error;
}

export async function deleteCampanha(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("marketing_campanhas") as any)
        .delete()
        .eq("id", id);

    if (error) throw error;
}

// ─── Segmentação de Clientes ──────────────────────────────
export async function getClientesSegmentados(segmento: string, filtros?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("clientes") as any)
        .select("id, nome, telefone, segmento, created_at")
        .not("telefone", "is", null);

    if (segmento === "vip") {
        query = query.eq("segmento", "vip");
    } else if (segmento === "atacadista") {
        query = query.eq("segmento", "atacadista");
    } else if (segmento === "novo") {
        query = query.eq("segmento", "novo");
    }
    // "todos" = sem filtro de segmento

    if (filtros?.ultimaCompraAntesDe) {
        // Filtro avançado: última compra antes de X dias
        // Implementação simplificada — buscar todos e filtrar no client
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).filter((c: any) => c.telefone && c.telefone.replace(/\D/g, "").length >= 10);
}
