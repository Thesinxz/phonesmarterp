"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

interface AuditLog {
    id: string;
    tabela: string;
    acao: string;
    criado_em: string;
    usuario_id: string;
}

interface FinanceItem {
    tipo: string;
    valor_centavos: number;
    vencimento: string | null;
    descricao: string | null;
    categoria: string;
    pago: boolean;
}

export interface FaturamentoDia {
    total: number;
    produtos: number;
    servicos: number;
    liquido: number;
}

export interface AgendaEvento {
    tipo: string;
    label: string;
    valor: number;
}

export interface AgendaDia {
    dia: string;
    data: string;
    eventos: AgendaEvento[];
}

export interface AtividadeRecente {
    user: string;
    action: string;
    time: string;
    type: "success" | "info" | "warning" | "system";
}

export function useDashboardMetrics() {
    const { profile } = useAuth();
    const [metrics, setMetrics] = useState({
        osAbertas: 0,
        clientesAtivos: 0,
        receitaMensal: 0,
        ticketMedio: 0,
        tempoMedio: 0,
        pedidosPendentes: 0,
        vendasPDVHoje: 0,
        // Novos campos: comparação temporal
        osAbertasOntem: 0,
        clientesMesAnterior: 0,
        receitaMesAnterior: 0,
    });
    const [faturamentoDia, setFaturamentoDia] = useState<FaturamentoDia>({
        total: 0,
        produtos: 0,
        servicos: 0,
        liquido: 0,
    });
    const [agendaSemana, setAgendaSemana] = useState<AgendaDia[]>([]);
    const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchMetrics = async () => {
        try {
            // ──── Métricas Top Cards ────────────────────────────────

            // OS Abertas
            const { count: osCount } = await supabase
                .from("ordens_servico")
                .select("*", { count: "exact", head: true })
                .eq("status", "aberta");

            // Clientes (Total)
            const { count: clientesCount } = await supabase
                .from("clientes")
                .select("*", { count: "exact", head: true });

            // Pedidos Pendentes (Vendas que não são PDV direto ou estão em status aberto)
            const { count: pedidosCount } = await supabase
                .from("vendas")
                .select("*", { count: "exact", head: true })
                .not("status_pedido", "in", '("entregue","cancelado")')
                .not("status_pedido", "is", null);

            // Vendas PDV Hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: pdvData } = await supabase
                .from("vendas")
                .select("total_centavos")
                .gte("created_at", today.toISOString());

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdvTotal = (pdvData as any)?.reduce((acc: number, curr: any) => acc + curr.total_centavos, 0) || 0;

            // Receita Mensal (mês atual)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: financeiroData } = await supabase
                .from("financeiro")
                .select("valor_centavos")
                .eq("tipo", "entrada")
                .gte("created_at", startOfMonth.toISOString());

            const receita = (financeiroData as { valor_centavos: number }[] | null)?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;
            const ticket = clientesCount ? Math.round(receita / (clientesCount || 1)) : 0;

            // ──── Comparação temporal para trends ────────────────────

            // OS abertas ontem (para mostrar variação "+X hoje")
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);

            const { count: osHoje } = await supabase
                .from("ordens_servico")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today.toISOString())
                .lte("created_at", todayEnd.toISOString());

            // Clientes mês anterior (para comparação)
            const startOfPrevMonth = new Date(startOfMonth);
            startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

            const { count: clientesPrevMonth } = await supabase
                .from("clientes")
                .select("*", { count: "exact", head: true })
                .lt("created_at", startOfMonth.toISOString());

            // Receita mês anterior
            const { data: receitPrevData } = await supabase
                .from("financeiro")
                .select("valor_centavos")
                .eq("tipo", "entrada")
                .gte("created_at", startOfPrevMonth.toISOString())
                .lt("created_at", startOfMonth.toISOString());

            const receitaPrev = (receitPrevData as { valor_centavos: number }[] | null)?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;

            // ──── Faturamento do Dia & Lucro ──────────────────────────

            // 1. Vendas (PDV)
            const { data: vendasHojeData } = await supabase
                .from("vendas")
                .select("id, total_centavos")
                .gte("created_at", today.toISOString());

            const totalVendasHoje = (vendasHojeData as any[])?.reduce((acc, curr) => acc + curr.total_centavos, 0) || 0;

            // Calcular custo das vendas de hoje
            let custoVendasHoje = 0;
            if (vendasHojeData && vendasHojeData.length > 0) {
                const vendaIds = (vendasHojeData as any[]).map(v => v.id);
                const { data: itensVenda } = await supabase
                    .from("venda_itens")
                    .select("quantidade, produto_id")
                    .in("venda_id", vendaIds);

                if (itensVenda) {
                    for (const item of itensVenda as any[]) {
                        if (item.produto_id) {
                            const { data: prod } = await (supabase as any).from("produtos").select("preco_custo_centavos").eq("id", item.produto_id).maybeSingle();
                            if (prod) custoVendasHoje += (prod.preco_custo_centavos || 0) * item.quantidade;
                        }
                    }
                }
            }

            // 2. Ordens de Serviço (Finalizadas hoje)
            const { data: osHojeData } = await supabase
                .from("ordens_servico")
                .select("valor_total_centavos, pecas_json")
                .gte("updated_at", today.toISOString())
                .eq("status", "finalizada");

            const totalServicosHoje = (osHojeData as any[])?.reduce((acc, curr) => acc + curr.valor_total_centavos, 0) || 0;

            // Calcular custo das peças nas OS de hoje
            let custoPecasOSHoje = 0;
            if (osHojeData) {
                for (const os of osHojeData as any[]) {
                    if (os.pecas_json && Array.isArray(os.pecas_json)) {
                        for (const peca of os.pecas_json) {
                            custoPecasOSHoje += (peca.custo || 0) * (peca.qtd || 1);
                        }
                    }
                }
            }

            const totalDia = totalVendasHoje + totalServicosHoje;
            const lucroDia = totalDia - (custoVendasHoje + custoPecasOSHoje);

            setFaturamentoDia({
                total: totalDia,
                produtos: totalVendasHoje,
                servicos: totalServicosHoje,
                liquido: lucroDia,
            });

            // ──── Agenda da Semana ───────────────────────────────────

            const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const nowDate = new Date();
            const dayOfWeek = nowDate.getDay(); // 0 = domingo
            // Começar da segunda
            const monday = new Date(nowDate);
            monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7));
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            // Buscar financeiro com vencimento nesta semana
            const { data: finWeek } = await supabase
                .from("financeiro")
                .select("tipo, valor_centavos, vencimento, descricao, categoria, pago")
                .gte("vencimento", monday.toISOString().split("T")[0])
                .lte("vencimento", sunday.toISOString().split("T")[0])
                .eq("pago", false);

            const agendaDias: AgendaDia[] = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(d.getDate() + i);

                const dateStr = d.toISOString().split("T")[0];
                const diaEvts: AgendaEvento[] = [];

                // Filtrar financeiro deste dia
                if (finWeek) {
                    for (const f of finWeek as FinanceItem[]) {
                        if (f.vencimento === dateStr) {
                            diaEvts.push({
                                tipo: f.tipo === "entrada" ? "receber" : "pagar",
                                label: f.descricao || f.categoria,
                                valor: f.valor_centavos,
                            });
                        }
                    }
                }

                agendaDias.push({
                    dia: diasSemana[d.getDay()],
                    data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
                    eventos: diaEvts,
                });
            }
            setAgendaSemana(agendaDias);

            // ──── Atividades Recentes (audit_logs) ──────────────────

            const { data: auditData } = await supabase
                .from("audit_logs")
                .select("id, tabela, acao, criado_em, usuario_id")
                .order("criado_em", { ascending: false })
                .limit(4);

            if (auditData && auditData.length > 0) {
                const now = Date.now();
                const mapped = (auditData as AuditLog[]).map((log) => {
                    const diff = now - new Date(log.criado_em).getTime();
                    const mins = Math.floor(diff / 60000);
                    let time = "";
                    if (mins < 1) time = "agora";
                    else if (mins < 60) time = `${mins} min atrás`;
                    else if (mins < 1440) time = `${Math.floor(mins / 60)}h atrás`;
                    else time = `${Math.floor(mins / 1440)}d atrás`;

                    const actionMap: Record<string, string> = {
                        INSERT: "criou em",
                        UPDATE: "editou em",
                        DELETE: "removeu de",
                    };
                    const tabelaMap: Record<string, string> = {
                        clientes: "Clientes",
                        ordens_servico: "Ordens de Serviço",
                        vendas: "Vendas",
                        produtos: "Estoque",
                        financeiro: "Financeiro",
                        equipamentos: "Equipamentos",
                    };
                    const typeMap: Record<string, "success" | "info" | "warning" | "system"> = {
                        INSERT: "success",
                        UPDATE: "info",
                        DELETE: "warning",
                    };

                    return {
                        user: "Usuário",
                        action: `${actionMap[log.acao] || log.acao} ${tabelaMap[log.tabela] || log.tabela}`,
                        time,
                        type: typeMap[log.acao] || "system",
                    };
                });
                setAtividades(mapped);
            } else {
                setAtividades([]);
            }

            // ──── Setar métricas ────────────────────────────────────

            setMetrics({
                osAbertas: osCount || 0,
                clientesAtivos: clientesCount || 0,
                receitaMensal: receita,
                ticketMedio: ticket,
                tempoMedio: 0,
                pedidosPendentes: pedidosCount || 0,
                vendasPDVHoje: pdvTotal,
                osAbertasOntem: osHoje || 0,
                clientesMesAnterior: clientesPrevMonth || 0,
                receitaMesAnterior: receitaPrev,
            });

        } catch (error) {
            console.error("Error fetching metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Sync
    const filter = profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined;

    useRealtimeSubscription({
        table: "ordens_servico",
        filter,
        callback: () => fetchMetrics()
    });

    useRealtimeSubscription({
        table: "clientes",
        filter,
        callback: () => fetchMetrics()
    });

    useRealtimeSubscription({
        table: "financeiro",
        filter,
        callback: () => fetchMetrics()
    });

    useRealtimeSubscription({
        table: "vendas",
        filter,
        callback: () => fetchMetrics()
    });

    useEffect(() => {
        if (!profile?.empresa_id) return;
        fetchMetrics();
    }, [profile?.empresa_id]);

    return { metrics, loading, faturamentoDia, agendaSemana, atividades };
}
