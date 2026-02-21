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

    // 3. Registrar no financeiro (Novo Módulo Títulos ou Caixa)
    // Se for crédito parcelado ou "fiado", deve ir para Títulos a Receber.
    // Se for à vista (dinheiro, pix, debito), idealmente cairia no Caixa Atual, 
    // mas para manter compatibilidade temporária com o Dashboard antigo, registramos como pago.

    // Suporta: credito_1x, boleto_3x, crediario_5x
    const isPrazo =
        venda.forma_pagamento?.startsWith('credito_') ||
        venda.forma_pagamento?.startsWith('boleto_') ||
        venda.forma_pagamento?.startsWith('crediario_');

    if (isPrazo) {
        // Gerar parcelas no Contas a Receber
        let qtdParcelas = 1;

        // Pega o número final depois do underline (ex: credito_3x -> 3)
        const parts = venda.forma_pagamento?.split('_') || [];
        if (parts.length > 1) {
            qtdParcelas = parseInt(parts[1].replace('x', '')) || 1;
        }

        const baseType = parts[0] || venda.forma_pagamento; // credito, boleto, crediario

        const valorParcela = Math.round(venda.total_centavos / qtdParcelas);
        const titulos = [];

        for (let i = 1; i <= qtdParcelas; i++) {
            // Vencimento projeta 30 dias para frente por parcela
            const vto = new Date();
            vto.setDate(vto.getDate() + (30 * i));

            titulos.push({
                empresa_id: venda.empresa_id,
                tipo: 'receber',
                status: 'pendente',
                valor_total_centavos: (i === qtdParcelas) ? venda.total_centavos - (valorParcela * (qtdParcelas - 1)) : valorParcela,
                valor_pago_centavos: 0,
                data_vencimento: vto.toISOString().split('T')[0],
                cliente_id: venda.cliente_id,
                categoria: 'Venda Produtos',
                descricao: `Parcela ${i}/${qtdParcelas} (${baseType}) - Venda PDV #${vendaData.numero || vendaData.id.substring(0, 8)}`,
                origem_tipo: 'venda',
                origem_id: vendaData.id
            });
        }

        const { error: titulosError } = await (supabase.from('financeiro_titulos') as any).insert(titulos);
        if (titulosError) console.error("Erro ao gerar parcelas no financeiro:", titulosError);

    } else {
        // Registro em Tabela Antiga / Baixado Automático
        const { error: finError } = await (supabase.from("financeiro") as any).insert({
            empresa_id: venda.empresa_id,
            tipo: "entrada",
            valor_centavos: venda.total_centavos,
            categoria: "Venda de Produtos",
            descricao: `Venda PDV à vista #${vendaData.numero ? String(vendaData.numero).padStart(5, '0') : vendaData.id.substring(0, 8)}`,
            pago: true,
            vencimento: new Date().toISOString()
        });

        if (finError) console.error("Erro ao registrar financeiro antigo:", finError);
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

    // 3. Registrar no financeiro como A RECEBER (pago: false) no novo módulo
    const { error: titulosError } = await (supabase.from('financeiro_titulos') as any).insert({
        empresa_id: venda.empresa_id,
        tipo: 'receber',
        status: 'pendente',
        valor_total_centavos: venda.total_centavos,
        valor_pago_centavos: 0,
        data_vencimento: new Date().toISOString().split('T')[0], // Ou usar uma data vinda do form
        cliente_id: venda.cliente_id,
        categoria: 'Pedido de Venda',
        descricao: `Pedido #${vendaData.numero || vendaData.id.substring(0, 8)}`,
        origem_tipo: 'venda', // Mantemos 'venda' para relacionar facilmente (pedidos e vendas estão na mesma tabela)
        origem_id: vendaData.id
    });

    if (titulosError) console.error("Erro ao gerar título pendente do pedido:", titulosError);

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
