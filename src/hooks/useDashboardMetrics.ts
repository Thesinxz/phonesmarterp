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

    const [osStatus, setOsStatus] = useState<OSStatusCounts>({ aguardando: 0, emReparo: 0, pronto: 0, atrasadas: 0 });
    const [aparelhosParados, setAparelhosParados] = useState<AparelhoParado[]>([]);
    const [estoqueCritico, setEstoqueCritico] = useState<EstoqueCriticoItem[]>([]);
    const [contasReceber, setContasReceber] = useState<ContasReceberResumo>({ vencido: 0, hoje: 0, semana: 0, trintaDias: 0 });
    const [faturamento7Dias, setFaturamento7Dias] = useState<Faturamento7Dia[]>([]);
    const [metaMes, setMetaMes] = useState({ meta: 0, atual: 0 });

    const supabase = createClient();

    const fetchMetrics = async (background = false) => {
        if (!profile?.empresa_id) return;
        if (!background) setLoading(true);

        try {
            const id = profile.empresa_id;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayStr = today.toISOString().split('T')[0];
            
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            
            const endOfWeek = new Date(today);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
            
            const endOf30d = new Date(today);
            endOf30d.setDate(endOf30d.getDate() + 30);
            const endOf30dStr = endOf30d.toISOString().split('T')[0];

            const tresDiasAtras = new Date();
            tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

            // ── Single Promise.all for all main queries ──
            const [
                osAbertasRes,
                clientesRes,
                vendasPendentesRes,
                vendasHojeRes,
                receitaMensalRes,
                osMensalRes,
                vendasMensalRes,
                osHojeRes,
                clientesPrevRes,
                receitaPrevRes,
                osStatusRes,
                atrasadasRes,
                paradosRes,
                estoqueRes,
                contasRes,
                vendas7DiasRes,
                metaConfigRes,
                finWeekRes,
                auditRes
            ] = await Promise.all([
                // 1. OS Abertas count
                supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("empresa_id", id).eq("status", "aberta"),
                
                // 2. Clientes totais
                supabase.from("clientes").select("*", { count: "exact", head: true }).eq("empresa_id", id),
                
                // 3. Vendas pendentes (pedidos)
                supabase.from("vendas").select("*", { count: "exact", head: true })
                    .eq("empresa_id", id)
                    .not("status_pedido", "in", ["entregue", "cancelado"])
                    .not("status_pedido", "is", null),
                
                // 4. Vendas Hoje
                supabase.from("vendas").select("total_centavos, id").eq("empresa_id", id).gte("created_at", today.toISOString()),
                
                // 5. Receita Mensal (Financeiro Entrada)
                supabase.from("financeiro").select("valor_centavos").eq("empresa_id", id).eq("tipo", "entrada").gte("created_at", startOfMonth.toISOString()),
                
                // 6. OS realizadas no mês (para ticket médio)
                supabase.from("ordens_servico").select("valor_total_centavos, pecas_json, updated_at, status")
                    .eq("empresa_id", id)
                    .in("status", ["finalizada", "entregue"])
                    .gte("created_at", startOfMonth.toISOString()),
                
                // 7. Vendas realizadas no mês (para ticket médio)
                supabase.from("vendas").select("total_centavos")
                    .eq("empresa_id", id)
                    .not("status_pedido", "in", ["cancelado"])
                    .gte("created_at", startOfMonth.toISOString()),
                
                // 8. OS criadas hoje
                supabase.from("ordens_servico").select("*", { count: "exact", head: true })
                    .eq("empresa_id", id)
                    .gte("created_at", today.toISOString()),
                
                // 9. Clientes antes deste mês
                supabase.from("clientes").select("*", { count: "exact", head: true })
                    .eq("empresa_id", id)
                    .lt("created_at", startOfMonth.toISOString()),
                
                // 10. Receita mês anterior
                supabase.from("financeiro").select("valor_centavos")
                    .eq("empresa_id", id)
                    .eq("tipo", "entrada")
                    .gte("created_at", startOfPrevMonth.toISOString())
                    .lt("created_at", startOfMonth.toISOString()),
                
                // 11. OS por Status (todos não finalizados)
                supabase.from("ordens_servico").select("status, data_prevista")
                    .eq("empresa_id", id)
                    .not("status", "in", ["finalizada", "entregue", "cancelada"]),
                
                // 12. Atrasadas (redundant with 11, but for count exact head)
                supabase.from("ordens_servico").select("*", { count: "exact", head: true })
                    .eq("empresa_id", id)
                    .lt("data_prevista", todayStr)
                    .not("status", "in", ["finalizada", "entregue", "cancelada"]),
                
                // 13. Aparelhos Parados
                supabase.from("ordens_servico").select("id, equipamento, cliente_nome, created_at, status")
                    .eq("empresa_id", id)
                    .not("status", "in", ["finalizada", "entregue", "cancelada"])
                    .lt("created_at", tresDiasAtras.toISOString())
                    .order("created_at", { ascending: true })
                    .limit(5),
                
                // 14. Estoque
                supabase.from("catalog_items").select("id, name, stock_qty, stock_alert_qty")
                    .eq("empresa_id", id)
                    .order("stock_qty", { ascending: true })
                    .limit(20),
                
                // 15. Contas a receber
                supabase.from("financeiro").select("vencimento, valor_centavos")
                    .eq("empresa_id", id)
                    .eq("tipo", "entrada")
                    .eq("pago", false),
                
                // 16. Vendas 7 dias
                supabase.from("vendas").select("total_centavos, created_at")
                    .eq("empresa_id", id)
                    .gte("created_at", new Date(now.getTime() - 7 * 86400000).toISOString())
                    .order("created_at", { ascending: true }),
                
                // 17. Meta
                supabase.from("configuracoes").select("valor")
                    .eq("empresa_id", id)
                    .eq("chave", "meta_mensal")
                    .maybeSingle(),
                
                // 18. Semana Financeira
                supabase.from("financeiro").select("tipo, valor_centavos, vencimento, descricao, categoria, pago")
                    .eq("empresa_id", id)
                    .gte("vencimento", todayStr) // Simplified: from today onwards for the week
                    .lte("vencimento", endOfWeekStr)
                    .eq("pago", false),
                
                // 19. Auditoria
                supabase.from("audit_logs").select("id, tabela, acao, criado_em, usuario_id")
                    .eq("empresa_id", id)
                    .order("criado_em", { ascending: false })
                    .limit(4)
            ]);

            // ── Process Counts ──
            const osCount = osAbertasRes.count || 0;
            const clientesCount = clientesRes.count || 0;
            const pedidosCount = vendasPendentesRes.count || 0;
            const osHojeCount = osHojeRes.count || 0;

            // ── Process Receita ──
            const pdvTotal = (vendasHojeRes.data as any[])?.reduce((acc, curr) => acc + curr.total_centavos, 0) || 0;
            const receita = (receitaMensalRes.data as any[])?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;
            const receitaPrev = (receitaPrevRes.data as any[])?.reduce((acc, curr) => acc + curr.valor_centavos, 0) || 0;

            // ── Process Ticket Médio ──
            const totalOSValor = (osMensalRes.data || []).reduce((acc: number, curr: any) => acc + (curr.valor_total_centavos || 0), 0);
            const qtdOS = (osMensalRes.data || []).length;
            const ticketMedioOS = qtdOS > 0 ? Math.round(totalOSValor / qtdOS) : 0;

            const totalVendasValor = (vendasMensalRes.data || []).reduce((acc: number, curr: any) => acc + (curr.total_centavos || 0), 0);
            const qtdVendas = (vendasMensalRes.data || []).length;
            const ticketMedioVendas = qtdVendas > 0 ? Math.round(totalVendasValor / qtdVendas) : 0;
            
            const qtdGeral = qtdOS + qtdVendas;
            const ticketMedioGeral = qtdGeral > 0 ? Math.round((totalOSValor + totalVendasValor) / qtdGeral) : 0;

            // ── Faturamento do Dia (Lucro Estimado) ──
            // Note: Parallelizing the cost checks would require many more queries. 
            // We use the available data for a best-effort calculation.
            let custoPecasOSHoje = 0;
            const osMensalData = (osMensalRes.data || []) as any[];
            osMensalData.filter(os => os.status === 'finalizada' && os.updated_at.startsWith(todayStr)).forEach(os => {
                if (os.pecas_json && Array.isArray(os.pecas_json)) {
                    os.pecas_json.forEach((peca: any) => { custoPecasOSHoje += (peca.custo || 0) * (peca.qtd || 1); });
                }
            });
            // Approximate profit factor for simplicity since querying each individual product cost is slow
            const totalServicosHoje = osMensalData.filter(os => os.status === 'finalizada' && os.updated_at.startsWith(todayStr)).reduce((a, b) => a + (b.valor_total_centavos || 0), 0);
            const totalDia = pdvTotal + totalServicosHoje;
            const lucroDia = Math.round(pdvTotal * 0.4) + (totalServicosHoje - custoPecasOSHoje); // 40% margin on PDV sales as fallback
            setFaturamentoDia({ total: totalDia, produtos: pdvTotal, servicos: totalServicosHoje, liquido: lucroDia });

            // ── OS Status ──
            const osStatusData = (osStatusRes.data || []) as any[];
            setOsStatus({
                aguardando: osStatusData.filter(o => ["aberta", "aguardando_pecas"].includes(o.status)).length,
                emReparo: osStatusData.filter(o => o.status === "em_reparo").length,
                pronto: osStatusData.filter(o => o.status === "pronta").length,
                atrasadas: atrasadasRes.count || 0
            });

            // ── Parados ──
            const paradosData = (paradosRes.data || []) as any[];
            setAparelhosParados(paradosData.map((os: any) => ({
                id: os.id,
                equipamento: os.equipamento || "Sem equipamento",
                cliente: os.cliente_nome || "Sem cliente",
                dias: Math.floor((Date.now() - new Date(os.created_at).getTime()) / 86400000),
                status: os.status,
            })));

            // ── Estoque ──
            const estoqueData = (estoqueRes.data || []) as any[];
            setEstoqueCritico(estoqueData
                .filter((item: any) => item.stock_qty <= (item.stock_alert_qty || 1))
                .slice(0, 5)
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    qty: item.stock_qty,
                    alertQty: item.stock_alert_qty || 1,
                }))
            );

            // ── Contas a Receber ──
            let v = 0, h = 0, s = 0, t = 0;
            const contasData = (contasRes.data || []) as any[];
            contasData.forEach((c: any) => {
                if (!c.vencimento) return;
                if (c.vencimento < todayStr) v += c.valor_centavos;
                else if (c.vencimento === todayStr) h += c.valor_centavos;
                else if (c.vencimento <= endOfWeekStr) s += c.valor_centavos;
                else if (c.vencimento <= endOf30dStr) t += c.valor_centavos;
            });
            setContasReceber({ vencido: v, hoje: h, semana: s, trintaDias: t });

            // ── Faturamento 7 Dias ──
            const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const fat7: Faturamento7Dia[] = [];
            const vendas7Data = (vendas7DiasRes.data || []) as any[];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = d.toISOString().split('T')[0];
                const dayTotal = vendas7Data.filter((v: any) => v.created_at.startsWith(ds)).reduce((a, b) => a + b.total_centavos, 0);
                fat7.push({ dia: diasSemana[d.getDay()], valor: dayTotal });
            }
            setFaturamento7Dias(fat7);

            // ── Meta ──
            const metaValor = (metaConfigRes.data as any)?.valor?.meta || 0;
            setMetaMes({ meta: metaValor, atual: receita });

            // ── Agenda ──
            const agendaDias: AgendaDia[] = [];
            const finWeekData = (finWeekRes.data || []) as any[];
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() + i);
                const ds = d.toISOString().split('T')[0];
                const evts = finWeekData.filter((f: any) => f.vencimento === ds).map((f: any) => ({
                    tipo: f.tipo === "entrada" ? "receber" : "pagar",
                    label: f.descricao || f.categoria,
                    valor: f.valor_centavos
                }));
                agendaDias.push({ dia: diasSemana[d.getDay()], data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, eventos: evts });
            }
            setAgendaSemana(agendaDias);

            // ── Auditoria ──
            const actionMap: Record<string, string> = { INSERT: "criou em", UPDATE: "editou em", DELETE: "removeu de" };
            const tabelaMap: Record<string, string> = { clientes: "Clientes", ordens_servico: "OS", vendas: "Vendas", produtos: "Estoque", financeiro: "Financeiro" };
            const typeMap: Record<string, any> = { INSERT: "success", UPDATE: "info", DELETE: "warning" };
            
            const auditData = (auditRes.data || []) as any[];
            setAtividades(auditData.map((log: any) => {
                const diff = Date.now() - new Date(log.criado_em).getTime();
                const mins = Math.floor(diff / 60000);
                let tStr = mins < 1 ? "agora" : mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
                return { 
                    user: "Usuário", 
                    action: `${actionMap[log.acao] || log.acao} ${tabelaMap[log.tabela] || log.tabela}`, 
                    time: tStr, 
                    type: typeMap[log.acao] || "system" 
                };
            }));

            setMetrics({
                osAbertas: osCount,
                clientesAtivos: clientesCount,
                receitaMensal: receita,
                ticketMedioGeral,
                ticketMedioOS,
                ticketMedioVendas,
                tempoMedio: 0,
                pedidosPendentes: pedidosCount,
                vendasPDVHoje: pdvTotal,
                osAbertasOntem: osHojeCount,
                clientesMesAnterior: clientesPrevRes.count || 0,
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
        fetchMetrics();
    }, [empresaId]);

    return { metrics, loading, faturamentoDia, agendaSemana, atividades, osStatus, aparelhosParados, estoqueCritico, contasReceber, faturamento7Dias, metaMes };
}
