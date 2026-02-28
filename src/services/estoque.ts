import { createClient } from "@/lib/supabase/client";
import { type Produto, type Database } from "@/types/database";
import { addProdutoHistorico } from "./historico_produto";

const supabase = createClient();

export interface ProdutoFilters {
    search?: string;
    grade?: "A" | "B" | "C";
}

export async function getProdutos(page = 1, limit = 50, filters?: ProdutoFilters) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("produtos")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,imei.ilike.%${filters.search}%,codigo_barras.ilike.%${filters.search}%,categoria.ilike.%${filters.search}%,marca.ilike.%${filters.search}%`);
    }

    if (filters?.grade) {
        query = query.eq("grade", filters.grade);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
        data: data as Produto[],
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
    };
}

export async function getProdutoById(id: string) {
    const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Produto;
}

export async function createProduto(produto: Database["public"]["Tables"]["produtos"]["Insert"]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("produtos") as any)
        .insert(produto)
        .select()
        .single();

    if (error) throw error;

    // Registrar histórico
    if (data?.id) {
        addProdutoHistorico(
            data.id,
            data.empresa_id,
            "criacao",
            "Produto cadastrado no sistema."
        );
    }

    return data as Produto;
}

export async function createProdutos(produtos: Database["public"]["Tables"]["produtos"]["Insert"][]) {
    console.log(`[Service:Estoque] Iniciando importação via RPC para ${produtos.length} produtos...`);

    try {
        // Chamamos o RPC especializado que retorna apenas o NÚMERO de itens inseridos
        // Isso é crucial para evitar que o PostgREST tente aplicar RLS no conjunto de resultados, o que causa o travamento.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc("importar_produtos_massa" as any, {
            p_produtos: produtos
        }) as any);

        if (error) {
            console.error("[Service:Estoque] Erro no RPC de Importação:", error);
            throw error;
        }

        const count = typeof data === 'number' ? data : 0;
        console.log(`[Service:Estoque] Importação via RPC concluída. Total: ${count} itens.`);

        // Como o RPC agora retorna apenas a contagem (por performance/RLS),
        // não registramos histórico individual aqui para não onerar o banco.

        // Retornamos um array vazio ou mockado se a tipagem exigir, 
        // mas idealmente o chamador deve lidar com o sucesso/contagem.
        return new Array(count).fill({}) as Produto[];
    } catch (err: any) {
        console.error("[Service:Estoque] Erro crítico no RPC createProdutos:", err);
        throw err;
    }
}

export async function updateProduto(id: string, produto: Partial<Database["public"]["Tables"]["produtos"]["Update"]>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("produtos") as any)
        .update(produto)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;

    if (data?.id) {
        addProdutoHistorico(
            data.id,
            data.empresa_id,
            "edicao",
            "Informações do produto foram atualizadas."
        );
    }

    return data as Produto;
}

export async function deleteProduto(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("produtos") as any)
        .delete()
        .eq("id", id);

    if (error) throw error;
}

export async function deleteProdutos(ids: string[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("produtos") as any)
        .delete()
        .in("id", ids);

    if (error) throw error;
}

export async function uploadProdutoImage(file: File, empresaId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${empresaId}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    // Upload to 'produtos' bucket
    const { data, error } = await supabase.storage
        .from('produtos')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName);

    return publicUrl;
}

export async function adjustStock(id: string, newQtd: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("produtos") as any)
        .update({ estoque_qtd: newQtd })
        .eq("id", id);

    if (error) throw error;

    // Buscar empresa_id do produto para o histórico
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prod } = await (supabase as any).from('produtos').select('empresa_id').eq('id', id).single();
    if (prod) {
        addProdutoHistorico(
            id,
            prod.empresa_id,
            "edicao",
            `Estoque ajustado manualmente para: ${newQtd}`
        );
    }
}

export interface BalancoItem {
    produto_id: string;
    empresa_id: string;
    qtdEsperada: number;
    qtdContada: number;
}

export async function processarBalanco(itens: BalancoItem[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    for (const item of itens) {
        if (item.qtdEsperada !== item.qtdContada) {
            const { error } = await client.from("produtos")
                .update({ estoque_qtd: item.qtdContada })
                .eq("id", item.produto_id);

            if (!error) {
                await addProdutoHistorico(
                    item.produto_id,
                    item.empresa_id,
                    "edicao",
                    `Ajuste por Balanço de Estoque (Esperado: ${item.qtdEsperada} | Contado: ${item.qtdContada})`
                );
            }
        }
    }
}
