import { createClient } from "@/lib/supabase/client";
import { type OrdemServico, type Database, type OsStatus } from "@/types/database";

const supabase = createClient();

export interface OSFilters {
    status?: OsStatus;
    tecnico_id?: string;
    cliente_id?: string;
    search?: string;
}

export async function getOrdensServico(page = 1, limit = 50, filters?: OSFilters) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("ordens_servico")
        .select(`
            *,
            cliente:clientes(nome),
            equipamento:equipamentos(marca, modelo),
            tecnico:usuarios(nome)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }
    if (filters?.tecnico_id) {
        query = query.eq("tecnico_id", filters.tecnico_id);
    }
    if (filters?.cliente_id) {
        query = query.eq("cliente_id", filters.cliente_id);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return {
        data: data as (OrdemServico & {
            cliente: { nome: string },
            equipamento: { marca: string, modelo: string },
            tecnico: { nome: string } | null
        })[],
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
    };
}

export async function getOrdemServicoById(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("ordens_servico")
        .select(`
            *,
            cliente:clientes(*),
            equipamento:equipamentos(*),
            tecnico:usuarios(nome),
            timeline:os_timeline(*)
        `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

export async function updateOSStatus(
    id: string,
    status: OsStatus,
    usuarioId: string,
    empresaId: string,
    extraFields: any = {}
) {
    // 1. Buscar OS atual para checar peças e se já baixou estoque
    const { data: currentOS, error: fetchError } = await (supabase as any)
        .from("ordens_servico")
        .select("status, pecas_json, estoque_baixado, valor_total_centavos, numero")
        .eq("id", id)
        .single();

    if (fetchError) throw fetchError;

    // 2. Definir se deve baixar estoque
    // Regra: Se o novo status é 'finalizada' ou 'entregue' E ainda não baixou estoque
    const deveBaixarEstoque = (status === "finalizada" || status === "entregue") && !currentOS.estoque_baixado;

    // 3. Processar baixa de estoque se necessário
    if (deveBaixarEstoque && currentOS.pecas_json && Array.isArray(currentOS.pecas_json)) {
        for (const peca of currentOS.pecas_json) {
            if (peca.produto_id) {
                // Buscar quantidade atual
                const { data: prod } = await (supabase as any)
                    .from("produtos")
                    .select("estoque_qtd, nome")
                    .eq("id", peca.produto_id)
                    .single();

                if (prod) {
                    const novaQtd = Math.max(0, (prod.estoque_qtd || 0) - (peca.qtd || 1));

                    // Atualizar estoque
                    await (supabase as any)
                        .from("produtos")
                        .update({ estoque_qtd: novaQtd })
                        .eq("id", peca.produto_id);

                    // Registrar no histórico do produto
                    const { addProdutoHistorico } = await import("./historico_produto");
                    await addProdutoHistorico(
                        peca.produto_id,
                        empresaId,
                        "os_finalizada",
                        `Uso em OS #${String(currentOS.numero).padStart(4, '0')} | Qtd: ${peca.qtd || 1}`
                    );
                }
            }
        }
    }

    // 4. Se for cancelada e já tiver baixado estoque, devolve ao estoque
    if (status === "cancelada" && currentOS.estoque_baixado && currentOS.pecas_json && Array.isArray(currentOS.pecas_json)) {
        for (const peca of currentOS.pecas_json) {
            if (peca.produto_id) {
                const { data: prod } = await (supabase as any).from("produtos").select("estoque_qtd").eq("id", peca.produto_id).single();
                if (prod) {
                    const novaQtd = (prod.estoque_qtd || 0) + (peca.qtd || 1);
                    await (supabase as any).from("produtos").update({ estoque_qtd: novaQtd }).eq("id", peca.produto_id);

                    const { addProdutoHistorico } = await import("./historico_produto");
                    await addProdutoHistorico(
                        peca.produto_id,
                        empresaId,
                        "devolucao",
                        `Retorno ao estoque por cancelamento OS #${String(currentOS.numero).padStart(4, '0')}`
                    );
                }
            }
        }
        // Marcar que estoque não está mais baixado (foi devolvido)
        extraFields.estoque_baixado = false;
    }

    // 5. Registrar no financeiro se estiver sendo entregue
    // Se mudou para entregue e o valor > 0, registra entrada no financeiro como pago
    if (status === "entregue" && currentOS.valor_total_centavos > 0) {
        // Verificar se já não existe uma entrada para esta OS
        const { count } = await supabase
            .from("financeiro")
            .select("*", { count: 'exact', head: true })
            .eq("descricao", `Recebimento OS #${String(currentOS.numero).padStart(4, "0")}`);

        if (count === 0) {
            await (supabase as any).from("financeiro").insert({
                empresa_id: empresaId,
                tipo: "entrada",
                valor_centavos: currentOS.valor_total_centavos,
                categoria: "Serviços de Manutenção",
                descricao: `Recebimento OS #${String(currentOS.numero).padStart(4, "0")}`,
                pago: true,
                vencimento: new Date().toISOString()
            });
        }
    }

    // 5. Update OS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("ordens_servico") as any)
        .update({
            ...extraFields,
            status,
            updated_at: new Date().toISOString(),
            estoque_baixado: currentOS.estoque_baixado || deveBaixarEstoque
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;

    // 6. Add to timeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("os_timeline") as any).insert({
        os_id: id,
        empresa_id: empresaId,
        usuario_id: usuarioId,
        evento: `Status alterado para ${status}${deveBaixarEstoque ? " (Estoque baixado)" : ""}`,
        dados_json: { status_anterior: currentOS.status, novo_status: status }
    });

    // 7. Trigger WhatsApp notification automatically for important statuses
    if (status === "finalizada" || status === "entregue") {
        try {
            const { notifyOSStatusChange } = await import("@/actions/notifications");
            // Call without await to not block the main flow
            notifyOSStatusChange(id, status).catch(e => console.error("[WhatsApp Auto] Error:", e));
        } catch (e) {
            console.error("[WhatsApp Auto] Failed to import notifyOSStatusChange:", e);
        }
    }

    return data as OrdemServico;
}

export async function createOS(os: Database["public"]["Tables"]["ordens_servico"]["Insert"], usuarioId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("ordens_servico") as any)
        .insert(os)
        .select()
        .single();

    if (error) throw error;

    // Add initial timeline event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("os_timeline") as any).insert({
        os_id: data.id,
        empresa_id: os.empresa_id,
        usuario_id: usuarioId,
        evento: "Ordem de Serviço criada",
        dados_json: { status: data.status }
    });

    return data as OrdemServico;
}

export async function createDetailedOS(osData: any, usuarioId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("ordens_servico") as any)
        .insert(osData)
        .select()
        .single();

    if (error) throw error;

    // Add initial timeline event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("os_timeline") as any).insert({
        os_id: data.id,
        empresa_id: osData.empresa_id,
        usuario_id: usuarioId,
        evento: "Ordem de Serviço criada (Wizard)",
        dados_json: { status: data.status, prioridade: data.prioridade }
    });

    return data;
}

export async function gerarTokenTeste(osId: string): Promise<string> {
    const token = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("ordens_servico") as any)
        .update({ token_teste: token })
        .eq("id", osId);

    if (error) throw error;
    return token;
}
