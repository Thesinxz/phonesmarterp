import { createClient } from "@/lib/supabase/client";
import { type Venda, type VendaItem, type Database } from "@/types/database";
import { addProdutoHistorico } from "./historico_produto";

const supabase = createClient();

interface FinalizarVendaData {
    venda: Database["public"]["Tables"]["vendas"]["Insert"];
    itens: Omit<Database["public"]["Tables"]["venda_itens"]["Insert"], "venda_id">[];
    usuarioId: string;
}

export async function finalizarVenda({ venda, itens, usuarioId }: FinalizarVendaData) {
    // 1. Criar a venda com tipo PDV
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vendaData, error: vendaError } = await (supabase.from("vendas") as any)
        .insert({
            ...venda,
            // tipo: "pdv" // TODO: Migration 012
        })
        .select()
        .single();

    if (vendaError) throw vendaError;

    // 2. Criar os itens da venda
    const itensComVendaId = itens.map(item => ({
        ...item,
        venda_id: vendaData.id
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itensError } = await (supabase.from("venda_itens") as any).insert(itensComVendaId);
    if (itensError) throw itensError;

    // 3. Registrar no financeiro (entrada) como PAGO
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: finError } = await (supabase.from("financeiro") as any).insert({
        empresa_id: venda.empresa_id,
        tipo: "entrada",
        valor_centavos: venda.total_centavos,
        categoria: "Venda de Produtos",
        descricao: `Venda PDV #${vendaData.numero ? String(vendaData.numero).padStart(5, '0') : vendaData.id.substring(0, 8)}`,
        pago: true,
        vencimento: new Date().toISOString()
    });

    if (finError) {
        console.error("Erro ao registrar financeiro:", finError);
    }

    // 4. Baixar estoque dos produtos e Pontos de Fidelidade
    for (const item of itens) {
        if (item.produto_id) {
            const { data: prod } = await supabase
                .from("produtos")
                .select("estoque_qtd")
                .eq("id", item.produto_id)
                .single();

            if (prod) {
                const estoqueAtual = (prod as any).estoque_qtd;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from("produtos") as any)
                    .update({ estoque_qtd: Math.max(0, estoqueAtual - (item as any).quantidade) })
                    .eq("id", item.produto_id);

                // --- TIMELINE DO PRODUTO ---
                try {
                    await addProdutoHistorico(
                        item.produto_id,
                        venda.empresa_id,
                        "venda",
                        `Vendido via PDV (Pedido #${vendaData.numero ? String(vendaData.numero).padStart(5, '0') : vendaData.id.split('-')[0]})`,
                        vendaData.id,
                        usuarioId
                    );
                } catch (e) {
                    console.error("Erro ao registrar timeline:", e);
                }
            }
        }
    }

    // 5. Crédito de Pontos de Fidelidade (1 ponto por cada R$ 20,00)
    if (venda.cliente_id) {
        const novosPontos = Math.floor(venda.total_centavos / 2000); // 2000 centavos = R$ 20
        if (novosPontos > 0) {
            // Buscamos pontos atuais
            const { data: cli } = await supabase
                .from("clientes")
                .select("pontos_fidelidade")
                .eq("id", venda.cliente_id)
                .single();

            if (cli) {
                await (supabase.from("clientes") as any)
                    .update({ pontos_fidelidade: ((cli as any).pontos_fidelidade || 0) + novosPontos })
                    .eq("id", venda.cliente_id);
            }
        }
    }

    // 6. Log de Auditoria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_logs") as any).insert({
        empresa_id: venda.empresa_id,
        usuario_id: usuarioId,
        tabela: "vendas",
        acao: "INSERT",
        dado_novo_json: { venda_id: vendaData.id, total: venda.total_centavos, tipo: "pdv" }
    });

    return vendaData as Venda;
}

export async function criarPedido({ venda, itens, usuarioId }: FinalizarVendaData) {
    // 1. Criar a venda com tipo PEDIDO e status rascunho
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vendaData, error: vendaError } = await (supabase.from("vendas") as any)
        .insert({
            ...venda,
            // tipo: "pedido",
            // status_pedido: "rascunho",
            // canal_venda: (venda as any).canal_venda || "balcao"
        })
        .select()
        .single();

    if (vendaError) throw vendaError;

    // 2. Criar os itens da venda
    const itensComVendaId = itens.map(item => ({
        ...item,
        venda_id: vendaData.id
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itensError } = await (supabase.from("venda_itens") as any).insert(itensComVendaId);
    if (itensError) throw itensError;

    // 3. Registrar no financeiro como A RECEBER (pago: false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: finError } = await (supabase.from("financeiro") as any).insert({
        empresa_id: venda.empresa_id,
        tipo: "entrada",
        valor_centavos: venda.total_centavos,
        categoria: "Pedido de Venda",
        descricao: `Pedido #${vendaData.numero ? String(vendaData.numero).padStart(5, '0') : vendaData.id.substring(0, 8)}`,
        pago: false,
        vencimento: new Date().toISOString()
    });

    if (finError) {
        console.error("Erro ao registrar financeiro:", finError);
    }

    // 4. Log de Auditoria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_logs") as any).insert({
        empresa_id: venda.empresa_id,
        usuario_id: usuarioId,
        tabela: "vendas",
        acao: "INSERT",
        dado_novo_json: { venda_id: vendaData.id, total: venda.total_centavos, tipo: "pedido" }
    });

    return vendaData as Venda;
}

export async function atualizarStatusPedido(vendaId: string, status: Venda["status_pedido"], usuarioId: string) {
    const pedido = await getVendaById(vendaId);
    if (!pedido) throw new Error("Pedido não encontrado");

    if (status === "separando" && pedido.status_pedido !== "separando") {
        for (const item of pedido.itens) {
            if (item.produto_id) {
                const { data: prod } = await supabase
                    .from("produtos")
                    .select("estoque_qtd")
                    .eq("id", item.produto_id)
                    .single();

                if (prod) {
                    const estoqueAtual = (prod as any).estoque_qtd;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase.from("produtos") as any)
                        .update({ estoque_qtd: Math.max(0, estoqueAtual - item.quantidade) })
                        .eq("id", item.produto_id);
                }
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // const { error } = await (supabase.from("vendas") as any)
    //     .update({ status_pedido: status })
    //     .eq("id", vendaId);

    // if (error) throw error;

    // Log de Auditoria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_logs") as any).insert({
        empresa_id: pedido.empresa_id,
        usuario_id: usuarioId,
        tabela: "vendas",
        acao: "UPDATE",
        dado_anterior_json: { status: pedido.status_pedido },
        dado_novo_json: { status: status }
    });
}

export async function getVendas(page = 1, limit = 50, filters?: { tipo?: "pdv" | "pedido", status?: string }) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("vendas") as any)
        .select(`
            *,
            cliente:clientes(nome),
            vendedor:usuarios(nome)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    // if (filters?.tipo) query = query.eq("tipo", filters.tipo);
    // if (filters?.status) query = query.eq("status_pedido", filters.status);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
        data,
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
    };
}

export async function getVendaById(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("vendas") as any)
        .select(`
            *,
            cliente:clientes(*),
            vendedor:usuarios(nome),
            itens:venda_itens(
                *,
                produto:produtos(*)
            )
        `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}
