import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Meta {
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
}

export interface MetaCategoria {
    id: string;
    meta_id: string;
    empresa_id: string;
    tipo: "categoria" | "subcategoria" | "produto";
    categoria_nome: string | null;
    produto_id: string | null;
    meta_qtd: number;
    meta_valor_centavos: number;
    created_at: string;
    // Progresso (preenchido dinamicamente)
    realizado_qtd?: number;
    realizado_valor_centavos?: number;
}

export interface MetaComCategorias extends Meta {
    categorias: MetaCategoria[];
    usuario?: { id: string; nome: string; email: string };
}

export interface MetaProgresso {
    meta: MetaComCategorias;
    realizado_centavos: number;
    realizado_qtd: number;
    percentual_faturamento: number;
    percentual_qtd: number;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function getMetas(empresaId: string, filtros?: { ano?: number; mes?: number; usuario_id?: string }): Promise<MetaComCategorias[]> {
    let query = (supabase.from("equipe_metas") as any)
        .select("*, categorias:equipe_metas_categorias(*), usuario:usuarios(id, nome, email)")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });

    if (filtros?.ano) query = query.eq("ano", filtros.ano);
    if (filtros?.mes) query = query.eq("mes", filtros.mes);
    if (filtros?.usuario_id) query = query.eq("usuario_id", filtros.usuario_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as MetaComCategorias[];
}

export async function criarMeta(
    empresaId: string,
    meta: {
        usuario_id: string;
        tipo_periodo: string;
        ano: number;
        mes?: number | null;
        semana?: number | null;
        meta_faturamento_centavos: number;
        meta_qtd_vendas?: number;
    },
    categorias?: { tipo: string; categoria_nome?: string; produto_id?: string; meta_qtd: number; meta_valor_centavos?: number }[]
): Promise<Meta> {
    const { data, error } = await (supabase.from("equipe_metas") as any)
        .insert({
            empresa_id: empresaId,
            ...meta,
        })
        .select()
        .single();

    if (error) throw error;

    if (categorias && categorias.length > 0) {
        const cats = categorias.map(c => ({
            meta_id: data.id,
            empresa_id: empresaId,
            ...c,
        }));
        await (supabase.from("equipe_metas_categorias") as any).insert(cats);
    }

    return data as Meta;
}

export async function atualizarMeta(metaId: string, updates: Partial<Meta>): Promise<void> {
    const { error } = await (supabase.from("equipe_metas") as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", metaId);
    if (error) throw error;
}

export async function excluirMeta(metaId: string): Promise<void> {
    const { error } = await (supabase.from("equipe_metas") as any)
        .update({ ativo: false })
        .eq("id", metaId);
    if (error) throw error;
}

// ─── Progresso ────────────────────────────────────────────────────────────────
export async function getProgressoMetas(empresaId: string, ano: number, mes: number): Promise<MetaProgresso[]> {
    // 1. Buscar metas do período
    const metas = await getMetas(empresaId, { ano, mes });

    // 2. Para cada meta, calcular realizado
    const startDate = new Date(ano, mes - 1, 1).toISOString();
    const endDate = new Date(ano, mes, 0, 23, 59, 59).toISOString();

    const progressos: MetaProgresso[] = [];

    for (const meta of metas) {
        // Buscar vendas e itens do vendedor no período
        const { data: vendas, error } = await (supabase.from("vendas") as any)
            .select(`
                total_centavos,
                itens:venda_itens(
                    quantidade,
                    preco_unitario_centavos,
                    produto:produtos(categoria)
                )
            `)
            .eq("empresa_id", empresaId)
            .eq("vendedor_id", meta.usuario_id)
            .gte("created_at", startDate)
            .lte("created_at", endDate);

        if (error) {
            console.error("Erro ao buscar vendas para progresso:", error);
            continue;
        }

        const realizado_centavos = (vendas || []).reduce((sum: number, v: any) => sum + (v.total_centavos || 0), 0);
        const realizado_qtd = (vendas || []).length;

        // Inicializar progressos específicos das categorias
        if (meta.categorias) {
            meta.categorias.forEach(cat => {
                cat.realizado_qtd = 0;
                cat.realizado_valor_centavos = 0;
            });

            // Processar os itens vendidos
            (vendas || []).forEach((venda: any) => {
                if (!venda.itens) return;
                venda.itens.forEach((item: any) => {
                    const categoriaItem = item.produto?.categoria?.toLowerCase() || "sem categoria";
                    // Procurar se a categoria desse item faz parte das metas específicas
                    const catMeta = meta.categorias.find(c => c.categoria_nome?.toLowerCase() === categoriaItem);
                    if (catMeta) {
                        if (catMeta.realizado_qtd !== undefined) catMeta.realizado_qtd += (item.quantidade || 1);
                        if (catMeta.realizado_valor_centavos !== undefined) catMeta.realizado_valor_centavos += ((item.quantidade || 1) * (item.preco_unitario_centavos || 0));
                    }
                });
            });
        }

        progressos.push({
            meta,
            realizado_centavos,
            realizado_qtd,
            percentual_faturamento: meta.meta_faturamento_centavos > 0
                ? Math.round((realizado_centavos / meta.meta_faturamento_centavos) * 100)
                : 0,
            percentual_qtd: meta.meta_qtd_vendas > 0
                ? Math.round((realizado_qtd / meta.meta_qtd_vendas) * 100)
                : 0,
        });
    }

    // Ordenar por percentual (ranking)
    progressos.sort((a, b) => b.percentual_faturamento - a.percentual_faturamento);
    return progressos;
}
