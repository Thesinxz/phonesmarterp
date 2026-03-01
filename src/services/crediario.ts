/**
 * Crediário Service — Lógica de negócio para crediário próprio da loja
 */

import { createClient } from "@/lib/supabase/client";

export interface ParcelaPreview {
    numero: number;
    valor_centavos: number;
    vencimento: string; // YYYY-MM-DD
}

export interface CrediarioCreateData {
    empresa_id: string;
    cliente_id: string;
    venda_id?: string;
    valor_total_centavos: number;
    entrada_centavos?: number;
    num_parcelas: number;
    tipo: "efibank" | "interno";
    juros_percentual?: number;
    multa_percentual?: number;
    observacoes?: string;
}

/**
 * Calcular preview das parcelas (usado no modal de criação)
 */
export function calcularParcelas(
    valorTotalCentavos: number,
    numParcelas: number,
    jurosMensal: number = 0,
    entradaCentavos: number = 0
): ParcelaPreview[] {
    const valorFinanciar = valorTotalCentavos - entradaCentavos;
    const parcelas: ParcelaPreview[] = [];

    let valorParcela: number;

    if (jurosMensal > 0) {
        // Juros compostos: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
        const i = jurosMensal / 100;
        const fator = Math.pow(1 + i, numParcelas);
        valorParcela = Math.round(valorFinanciar * (i * fator) / (fator - 1));
    } else {
        valorParcela = Math.round(valorFinanciar / numParcelas);
    }

    const hoje = new Date();

    for (let p = 1; p <= numParcelas; p++) {
        const vencimento = new Date(hoje);
        vencimento.setMonth(vencimento.getMonth() + p);

        // Ajustar se o dia não existe no mês (ex: 31 fev → 28 fev)
        if (vencimento.getDate() !== hoje.getDate()) {
            vencimento.setDate(0); // último dia do mês anterior
        }

        // Última parcela absorve diferença de arredondamento
        const valor = p === numParcelas
            ? valorFinanciar - (valorParcela * (numParcelas - 1))
            : valorParcela;

        parcelas.push({
            numero: p,
            valor_centavos: valor,
            vencimento: vencimento.toISOString().split("T")[0],
        });
    }

    return parcelas;
}

/**
 * Listar crediários da empresa com dados do cliente
 */
export async function listarCrediarios(filtros?: {
    status?: string;
    cliente_id?: string;
}) {
    const supabase = createClient();

    let query = (supabase.from("crediarios") as any)
        .select(`
            *,
            cliente:clientes(id, nome, cpf_cnpj, telefone),
            parcelas:crediario_parcelas(id, numero_parcela, valor_centavos, vencimento, status, data_pagamento, forma_pagamento)
        `)
        .order("created_at", { ascending: false });

    if (filtros?.status) {
        query = query.eq("status", filtros.status);
    }
    if (filtros?.cliente_id) {
        query = query.eq("cliente_id", filtros.cliente_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Obter detalhes de um crediário específico com todas as parcelas
 */
export async function getCrediarioDetalhes(crediarioId: string) {
    const supabase = createClient();

    const { data, error } = await (supabase.from("crediarios") as any)
        .select(`
            *,
            cliente:clientes(id, nome, cpf_cnpj, telefone, email, endereco_json),
            parcelas:crediario_parcelas(*)
        `)
        .eq("id", crediarioId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Criar crediário (chama API route interna)
 */
export async function criarCrediario(data: CrediarioCreateData) {
    const res = await fetch("/api/crediario/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar crediário");
    }

    return await res.json();
}

/**
 * Baixa manual de parcela
 */
export async function baixarParcela(parcelaId: string, formaPagamento: string, valorPagoCentavos?: number) {
    const res = await fetch("/api/crediario/baixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcela_id: parcelaId, forma_pagamento: formaPagamento, valor_pago_centavos: valorPagoCentavos }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro na baixa da parcela");
    }

    return await res.json();
}

/**
 * Editar os dados de uma parcela pendente
 */
export async function editarParcela(parcelaId: string, novoValorCentavos?: number, novoVencimento?: string) {
    const res = await fetch("/api/crediario/editar-parcela", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            parcela_id: parcelaId,
            novo_valor_centavos: novoValorCentavos,
            novo_vencimento: novoVencimento
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro na edição da parcela");
    }

    return await res.json();
}

/**
 * Excluir um crediário completo
 */
export async function excluirCrediario(crediarioId: string) {
    const res = await fetch("/api/crediario/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crediario_id: crediarioId }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro na exclusão do crediário");
    }

    return await res.json();
}

/**
 * Obter parcelas vencidas (inadimplentes)
 */
export async function getParcelasVencidas() {
    const supabase = createClient();

    const { data, error } = await (supabase.from("crediario_parcelas") as any)
        .select(`
            *,
            crediario:crediarios(id, numero, cliente:clientes(id, nome, telefone))
        `)
        .in("status", ["atrasado", "pendente"])
        .lt("vencimento", new Date().toISOString().split("T")[0])
        .order("vencimento", { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Obter métricas resumidas do crediário para o dashboard
 */
export async function getCrediarioMetricas() {
    const supabase = createClient();

    const { data: crediarios, error } = await (supabase.from("crediarios") as any)
        .select(`
            id, status, valor_total_centavos, entrada_centavos,
            parcelas:crediario_parcelas(valor_centavos, status, vencimento)
        `);

    if (error) throw error;

    const metricas = {
        total_aberto_centavos: 0,
        total_recebido_centavos: 0,
        total_inadimplente_centavos: 0,
        a_receber_mes_centavos: 0,
        contratos_ativos: 0,
        contratos_inadimplentes: 0,
        contratos_quitados: 0,
    };

    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

    for (const c of (crediarios || [])) {
        if (c.status === "ativo") metricas.contratos_ativos++;
        if (c.status === "inadimplente") metricas.contratos_inadimplentes++;
        if (c.status === "quitado") metricas.contratos_quitados++;

        for (const p of (c.parcelas || [])) {
            if (p.status === "pago") {
                metricas.total_recebido_centavos += p.valor_centavos;
            } else if (p.status === "atrasado") {
                metricas.total_inadimplente_centavos += p.valor_centavos;
            } else if (p.status === "pendente") {
                metricas.total_aberto_centavos += p.valor_centavos;
                if (p.vencimento?.startsWith(mesAtual)) {
                    metricas.a_receber_mes_centavos += p.valor_centavos;
                }
            }
        }
    }

    return metricas;
}

/**
 * Formatar valor em centavos para reais
 */
export function formatarValor(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}
