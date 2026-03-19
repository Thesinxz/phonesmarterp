"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

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

export interface OSStatusCounts {
    aguardando: number;
    emReparo: number;
    pronto: number;
    atrasadas: number;
}

export interface AparelhoParado {
    id: string;
    equipamento: string;
    cliente: string;
    dias: number;
    status: string;
}

export interface EstoqueCriticoItem {
    id: string;
    name: string;
    qty: number;
    alertQty: number;
}

export interface ContasReceberResumo {
    vencido: number;
    hoje: number;
    semana: number;
    trintaDias: number;
}

export interface Faturamento7Dia {
    dia: string;
    valor: number;
}

export function useDashboardMetrics() {
    const { profile } = useAuth();
    const [metrics, setMetrics] = useState({
        osAbertas: 0,
        clientesAtivos: 0,
        receitaMensal: 0,
        ticketMedioGeral: 0,
        ticketMedioOS: 0,
        ticketMedioVendas: 0,
        tempoMedio: 0,
        pedidosPendentes: 0,
        vendasPDVHoje: 0,
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

    // New dashboard data
    const [osStatus, setOsStatus] = useState<OSStatusCounts>({ aguardando: 0, emReparo: 0, pronto: 0, atrasadas: 0 });
    const [aparelhosParados, setAparelhosParados] = useState<AparelhoParado[]>([]);
    const [estoqueCritico, setEstoqueCritico] = useState<EstoqueCriticoItem[]>([]);
    const [contasReceber, setContasReceber] = useState<ContasReceberResumo>({ vencido: 0, hoje: 0, semana: 0, trintaDias: 0 });
    const [faturamento7Dias, setFaturamento7Dias] = useState<Faturamento7Dia[]>([]);
    const [metaMes, setMetaMes] = useState({ meta: 0, atual: 0 });

    const supabase = createClient();

    const fetchMetrics = async (background = false) => {
        if (!background) setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // ── Counts ──
            const [
                { count: osCount },
                { count: clientesCount },
                { count: pedidosCount },
            ] = await Promise.all([
                supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("status", "aberta"),
                supabase.from("clientes").select("*", { count: "exact", head: true }),
                supabase.from("vendas").select("*", { count: "exact", head: true })
                    .not("status_pedido", "in", ["entregue", "cancelado"])
                    .not("status_pedido", "is", null),
            ]);

            // ── PDV Hoje ──
            const { data: pdvData } = await supabase.from("vendas").select("total_centavos").gte("created_at", today.toISOString());
            const pdvTotal = (pdvData as any)?.reduce((acc: number, curr: any) => acc + curr.total_centavos, 0) || 0;

            // ── Receita Mensal ──
            const { data: financeiroData } = await supabase.from("financeiro").select("valor_centavos").eq("tipo", "entrada").gte("created_at", startOfMonth.toISOString());
            const receita = (financeiroData as { valor_centavos: number }[] | null)?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;

            // ── Ticket Médio ──
            const { data: dataOSRealizadas } = await supabase.from("ordens_servico").select("valor_total_centavos").in("status", ["finalizada", "entregue"]).gte("created_at", startOfMonth.toISOString());
            const totalOSValor = (dataOSRealizadas || []).reduce((acc: number, curr: any) => acc + (curr.valor_total_centavos || 0), 0);
            const qtdOS = (dataOSRealizadas || []).length;
            const ticketMedioOS = qtdOS > 0 ? Math.round(totalOSValor / qtdOS) : 0;

            const { data: dataVendasRealizadas } = await supabase.from("vendas").select("total_centavos").not("status_pedido", "in", ["cancelado"]).gte("created_at", startOfMonth.toISOString());
            const totalVendasValor = (dataVendasRealizadas || []).reduce((acc: number, curr: any) => acc + (curr.total_centavos || 0), 0);
            const qtdVendas = (dataVendasRealizadas || []).length;
            const ticketMedioVendas = qtdVendas > 0 ? Math.round(totalVendasValor / qtdVendas) : 0;
            const qtdGeral = qtdOS + qtdVendas;
            const ticketMedioGeral = qtdGeral > 0 ? Math.round((totalOSValor + totalVendasValor) / qtdGeral) : 0;

            // ── Comparação Temporal ──
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            const { count: osHoje } = await supabase.from("ordens_servico").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).lte("created_at", todayEnd.toISOString());

            const startOfPrevMonth = new Date(startOfMonth);
            startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
            const { count: clientesPrevMonth } = await supabase.from("clientes").select("*", { count: "exact", head: true }).lt("created_at", startOfMonth.toISOString());
            const { data: receitPrevData } = await supabase.from("financeiro").select("valor_centavos").eq("tipo", "entrada").gte("created_at", startOfPrevMonth.toISOString()).lt("created_at", startOfMonth.toISOString());
            const receitaPrev = (receitPrevData as { valor_centavos: number }[] | null)?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;

            // ── Faturamento do Dia ──
            const { data: vendasHojeData } = await supabase.from("vendas").select("id, total_centavos").gte("created_at", today.toISOString());
            const totalVendasHoje = (vendasHojeData as any[])?.reduce((acc, curr) => acc + curr.total_centavos, 0) || 0;

            let custoVendasHoje = 0;
            if (vendasHojeData && vendasHojeData.length > 0) {
                const vendaIds = (vendasHojeData as any[]).map(v => v.id);
                const { data: itensVenda } = await supabase.from("venda_itens").select("quantidade, produto_id").in("venda_id", vendaIds);
                if (itensVenda) {
                    for (const item of itensVenda as any[]) {
                        if (item.produto_id) {
                            const { data: prod } = await (supabase as any).from("produtos").select("preco_custo_centavos").eq("id", item.produto_id).maybeSingle();
                            if (prod) custoVendasHoje += (prod.preco_custo_centavos || 0) * item.quantidade;
                        }
                    }
                }
            }

            const { data: osHojeData } = await supabase.from("ordens_servico").select("valor_total_centavos, pecas_json").gte("updated_at", today.toISOString()).eq("status", "finalizada");
            const totalServicosHoje = (osHojeData as any[])?.reduce((acc, curr) => acc + curr.valor_total_centavos, 0) || 0;
            let custoPecasOSHoje = 0;
            if (osHojeData) {
                for (const os of osHojeData as any[]) {
                    if (os.pecas_json && Array.isArray(os.pecas_json)) {
                        for (const peca of os.pecas_json) { custoPecasOSHoje += (peca.custo || 0) * (peca.qtd || 1); }
                    }
                }
            }
            const totalDia = totalVendasHoje + totalServicosHoje;
            const lucroDia = totalDia - (custoVendasHoje + custoPecasOSHoje);
            setFaturamentoDia({ total: totalDia, produtos: totalVendasHoje, servicos: totalServicosHoje, liquido: lucroDia });

            // ── OS por Status ──
            const [
                { count: agCount },
                { count: repCount },
                { count: prontoCount },
            ] = await Promise.all([
                supabase.from("ordens_servico").select("*", { count: "exact", head: true }).in("status", ["aberta", "aguardando_pecas"]),
                supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("status", "em_reparo"),
                supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("status", "pronta"),
            ]);

            // Atrasadas: data_prevista < hoje e status não finalizado
            const { count: atrasadasCount } = await supabase
                .from("ordens_servico")
                .select("*", { count: "exact", head: true })
                .lt("data_prevista", today.toISOString().split('T')[0])
                .not("status", "in", ["finalizada", "entregue", "cancelada"]);

            setOsStatus({
                aguardando: agCount || 0,
                emReparo: repCount || 0,
                pronto: prontoCount || 0,
                atrasadas: atrasadasCount || 0,
            });

            // ── Aparelhos Parados (> 3 dias) ──
            const tresDiasAtras = new Date();
            tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
            const { data: paradosData } = await supabase
                .from("ordens_servico")
                .select("id, equipamento, cliente_nome, created_at, status")
                .not("status", "in", ["finalizada", "entregue", "cancelada"])
                .lt("created_at", tresDiasAtras.toISOString())
                .order("created_at", { ascending: true })
                .limit(5);

            if (paradosData) {
                setAparelhosParados((paradosData as any[]).map(os => ({
                    id: os.id,
                    equipamento: os.equipamento || "Sem equipamento",
                    cliente: os.cliente_nome || "Sem cliente",
                    dias: Math.floor((Date.now() - new Date(os.created_at).getTime()) / 86400000),
                    status: os.status,
                })));
            }

            // ── Estoque Crítico ──
            const { data: estoqueData } = await supabase
                .from("catalog_items")
                .select("id, name, stock_qty, stock_alert_qty")
                .order("stock_qty", { ascending: true })
                .limit(20);

            if (estoqueData) {
                setEstoqueCritico(
                    (estoqueData as any[])
                        .filter(item => item.stock_qty <= (item.stock_alert_qty || 1))
                        .slice(0, 5)
                        .map(item => ({
                            id: item.id,
                            name: item.name,
                            qty: item.stock_qty,
                            alertQty: item.stock_alert_qty || 1,
                        }))
                );
            }

            // ── Contas a Receber ──
            const todayStr = today.toISOString().split('T')[0];
            const endOfWeek = new Date(today);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
            const endOf30d = new Date(today);
            endOf30d.setDate(endOf30d.getDate() + 30);
            const endOf30dStr = endOf30d.toISOString().split('T')[0];

            const { data: contasData } = await supabase
                .from("financeiro")
                .select("vencimento, valor_centavos")
                .eq("tipo", "entrada")
                .eq("pago", false);

            if (contasData) {
                let vencido = 0, hojeVal = 0, semanaVal = 0, trintaVal = 0;
                for (const c of contasData as any[]) {
                    if (!c.vencimento) continue;
                    if (c.vencimento < todayStr) vencido += c.valor_centavos;
                    else if (c.vencimento === todayStr) hojeVal += c.valor_centavos;
                    else if (c.vencimento <= endOfWeekStr) semanaVal += c.valor_centavos;
                    else if (c.vencimento <= endOf30dStr) trintaVal += c.valor_centavos;
                }
                setContasReceber({ vencido, hoje: hojeVal, semana: semanaVal, trintaDias: trintaVal });
            }

            // ── Faturamento 7 Dias ──
            const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const fat7: Faturamento7Dia[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                d.setHours(0, 0, 0, 0);
                const nextD = new Date(d);
                nextD.setDate(nextD.getDate() + 1);

                const { data: dData } = await supabase.from("vendas").select("total_centavos").gte("created_at", d.toISOString()).lt("created_at", nextD.toISOString());
                const dayTotal = (dData as any[])?.reduce((acc, curr) => acc + curr.total_centavos, 0) || 0;
                fat7.push({ dia: diasSemana[d.getDay()], valor: dayTotal });
            }
            setFaturamento7Dias(fat7);

            // ── Meta do Mês (from config) ──
            const { data: metaConfig } = await supabase.from("configuracoes").select("valor").eq("chave", "meta_mensal").maybeSingle();
            const metaValor = (metaConfig as any)?.valor?.meta || 0;
            setMetaMes({ meta: metaValor, atual: receita });

            // ── Agenda da Semana ──
            const nowDate = new Date();
            const dayOfWeek = nowDate.getDay();
            const monday = new Date(nowDate);
            monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

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
                if (finWeek) {
                    for (const f of finWeek as FinanceItem[]) {
                        if (f.vencimento === dateStr) {
                            diaEvts.push({ tipo: f.tipo === "entrada" ? "receber" : "pagar", label: f.descricao || f.categoria, valor: f.valor_centavos });
                        }
                    }
                }
                agendaDias.push({ dia: diasSemana[d.getDay()], data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, eventos: diaEvts });
            }
            setAgendaSemana(agendaDias);

            // ── Atividades Recentes ──
            const { data: auditData } = await supabase.from("audit_logs").select("id, tabela, acao, criado_em, usuario_id").order("criado_em", { ascending: false }).limit(4);
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
                    const actionMap: Record<string, string> = { INSERT: "criou em", UPDATE: "editou em", DELETE: "removeu de" };
                    const tabelaMap: Record<string, string> = { clientes: "Clientes", ordens_servico: "OS", vendas: "Vendas", produtos: "Estoque", financeiro: "Financeiro", equipamentos: "Equipamentos" };
                    const typeMap: Record<string, "success" | "info" | "warning" | "system"> = { INSERT: "success", UPDATE: "info", DELETE: "warning" };
                    return { user: "Usuário", action: `${actionMap[log.acao] || log.acao} ${tabelaMap[log.tabela] || log.tabela}`, time, type: typeMap[log.acao] || "system" };
                });
                setAtividades(mapped);
            } else {
                setAtividades([]);
            }

            // ── Setar Métricas ──
            setMetrics({
                osAbertas: osCount || 0,
                clientesAtivos: clientesCount || 0,
                receitaMensal: receita,
                ticketMedioGeral,
                ticketMedioOS,
                ticketMedioVendas,
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
            if (!background) setLoading(false);
        }
    };

    const empresaId = profile?.empresa_id || '';
    const onchange = () => fetchMetrics(true);

    useRealtimeTable('ordens_servico', empresaId, onchange);
    useRealtimeTable('clientes', empresaId, onchange);
    useRealtimeTable('financeiro', empresaId, onchange);
    useRealtimeTable('vendas', empresaId, onchange);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        fetchMetrics();
    }, [profile?.empresa_id]);

    return { metrics, loading, faturamentoDia, agendaSemana, atividades, osStatus, aparelhosParados, estoqueCritico, contasReceber, faturamento7Dias, metaMes };
}
