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
    if (produtos.length === 0) return [];

    const empresaId = produtos[0].empresa_id;
    const totalItens = produtos.length;
    console.log(`[Service:Estoque] Iniciando importação para ${totalItens} produtos na empresa ${empresaId}...`);

    // Helper: Timeout para evitar travamento eterno (RLS hanging)
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                console.error(`[Service:Estoque] TIMEOUT (${ms}ms) em: ${label}`);
                reject(new Error(`Timeout de ${ms / 1000}s em ${label}. Provável travamento por RLS no banco de dados.`));
            }, ms);
            promise.then(
                (val) => { clearTimeout(timer); resolve(val); },
                (err) => { clearTimeout(timer); reject(err); }
            );
        });
    };

    // === ESTRATÉGIA 1: RPC com empresa_id (Nova versão, mais segura) ===
    try {
        console.log("[Service:Estoque] Tentativa 1: RPC importar_produtos_massa (v2, com empresa_id)...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await withTimeout(
            (supabase as any).rpc("importar_produtos_massa", {
                p_produtos: produtos,
                p_empresa_id: empresaId
            }),
            15000,
            "RPC v2"
        );

        if (!result.error && typeof result.data === 'number' && result.data > 0) {
            console.log(`[Service:Estoque] ✅ RPC v2 OK! ${result.data} produtos importados.`);
            return new Array(result.data).fill({ id: 'imported' }) as Produto[];
        }
        if (result.error) {
            console.warn("[Service:Estoque] RPC v2 falhou:", result.error.message);
        }
    } catch (e: any) {
        console.warn("[Service:Estoque] RPC v2 erro/timeout:", e.message);
    }

    // === ESTRATÉGIA 2: RPC sem empresa_id (Versão antiga, se existir no banco) ===
    try {
        console.log("[Service:Estoque] Tentativa 2: RPC importar_produtos_massa (v1, sem empresa_id)...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await withTimeout(
            (supabase as any).rpc("importar_produtos_massa", {
                p_produtos: produtos
            }),
            15000,
            "RPC v1"
        );

        if (!result.error && typeof result.data === 'number' && result.data > 0) {
            console.log(`[Service:Estoque] ✅ RPC v1 OK! ${result.data} produtos importados.`);
            return new Array(result.data).fill({ id: 'imported' }) as Produto[];
        }
        if (result.error) {
            console.warn("[Service:Estoque] RPC v1 falhou:", result.error.message);
        }
    } catch (e: any) {
        console.warn("[Service:Estoque] RPC v1 erro/timeout:", e.message);
    }

    // === ESTRATÉGIA 3: INSERT direto SEM .select() ===
    // IMPORTANTE: NÃO chamamos .select() após .insert() pois o PostgREST
    // tentará executar um SELECT na tabela com RLS, causando recursão infinita.
    try {
        console.log("[Service:Estoque] Tentativa 3: INSERT direto (sem .select(), sem retorno de dados)...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await withTimeout(
            (supabase.from("produtos") as any).insert(produtos),
            20000,
            "INSERT direto"
        );

        if (!result.error) {
            console.log(`[Service:Estoque] ✅ INSERT direto OK! ${totalItens} produtos enviados.`);
            return new Array(totalItens).fill({ id: 'imported' }) as Produto[];
        }
        console.error("[Service:Estoque] INSERT direto falhou:", result.error.message);
        throw result.error;
    } catch (e: any) {
        console.error("[Service:Estoque] ❌ Todas as 3 estratégias falharam:", e.message);
        throw new Error(
            `Falha ao importar produtos. O banco de dados pode estar com problemas de RLS. ` +
            `Detalhes: ${e.message}. ` +
            `Solução: Execute a migration 058 no SQL Editor do Supabase.`
        );
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
