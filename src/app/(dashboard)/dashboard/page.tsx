"use client";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import {
    ClipboardList,
    Users,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ShoppingBag,
    Wrench,
    Plus,
    ShoppingCart,
    Calendar,
    ClipboardCheck,
    History as HistoryIcon,
    Inbox
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";

const eventoColors: Record<string, string> = {
    receber: "bg-emerald-100 text-emerald-700",
    pagar: "bg-red-100 text-red-700",
    os: "bg-blue-100 text-blue-700",
    compromisso: "bg-purple-100 text-purple-700",
};

export default function DashboardPage() {
    const { metrics, loading, faturamentoDia, agendaSemana, atividades } = useDashboardMetrics();

    // Calcular trends reais
    const osHojeChange = metrics.osAbertasOntem;
    const clientesNovos = (metrics.clientesAtivos || 0) - (metrics.clientesMesAnterior || 0);
    const receitaChange = metrics.receitaMesAnterior > 0
        ? (((metrics.receitaMensal - metrics.receitaMesAnterior) / metrics.receitaMesAnterior) * 100).toFixed(1)
        : metrics.receitaMensal > 0 ? "100" : "0";

    const metricsList = [
        {
            label: "OS Abertas",
            value: loading ? "..." : metrics.osAbertas.toString(),
            icon: ClipboardList,
            color: "text-blue-500",
            bg: "bg-blue-50",
            change: osHojeChange > 0 ? `+${osHojeChange}` : "0",
            changeType: osHojeChange > 0 ? "up" as const : "neutral" as const,
            changeLabel: "hoje",
        },
        {
            label: "Clientes Ativos",
            value: loading ? "..." : metrics.clientesAtivos.toString(),
            icon: Users,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            change: clientesNovos > 0 ? `+${clientesNovos}` : "0",
            changeType: clientesNovos > 0 ? "up" as const : "neutral" as const,
            changeLabel: "este mês",
        },
        {
            label: "Receita Mensal",
            value: loading ? "..." : formatCurrency(metrics.receitaMensal),
            icon: DollarSign,
            color: "text-brand-500",
            bg: "bg-brand-50",
            change: `${Number(receitaChange) >= 0 ? "+" : ""}${receitaChange}%`,
            changeType: Number(receitaChange) >= 0 ? "up" as const : "down" as const,
            changeLabel: "vs mês anterior",
        },
        {
            label: "Caixa PDV (Hoje)",
            value: loading ? "..." : formatCurrency(metrics.vendasPDVHoje),
            icon: ShoppingCart,
            color: "text-amber-500",
            bg: "bg-amber-50",
            change: "Real",
            changeType: "neutral" as const,
            changeLabel: "vendas",
        },
        {
            label: "Pedidos em Aberto",
            value: loading ? "..." : metrics.pedidosPendentes.toString(),
            icon: ClipboardCheck,
            color: "text-purple-500",
            bg: "bg-purple-50",
            change: "Pipeline",
            changeType: "neutral" as const,
            changeLabel: "pendentes",
        },
    ];

    return (
        <div className="space-y-6 page-enter">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Visão geral em tempo real</p>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-5 gap-4">
                {metricsList.map((m) => {
                    const Icon = m.icon;
                    return (
                        <div key={m.label} className="glass-card animate-slide-up">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                                    <Icon className={`w-4.5 h-4.5 ${m.color}`} size={18} />
                                </div>
                                {m.changeType !== "neutral" && (
                                    <div className={`flex items-center gap-1 text-xs font-medium ${m.changeType === "up" ? "text-emerald-600" : "text-red-500"}`}>
                                        {m.changeType === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                        {m.change}
                                    </div>
                                )}
                                {m.changeType === "neutral" && (
                                    <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                                        {m.change}
                                    </div>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-slate-800 leading-tight">{m.value}</p>
                            <p className="text-slate-500 text-xs mt-1">{m.label}</p>
                            <p className="text-slate-400 text-xs">{m.changeLabel}</p>
                        </div>
                    );
                })}
            </div>

            {/* Faturamento do Dia + Atividades */}
            <div className="grid grid-cols-3 gap-4">
                {/* Faturamento do Dia */}
                <GlassCard title="Faturamento do Dia" icon={DollarSign}>
                    {faturamentoDia.total === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400">Nenhuma venda registrada hoje</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                                    <span className="text-slate-600 text-sm">Total</span>
                                </div>
                                <span className="font-bold text-slate-800">{formatCurrency(faturamentoDia.total)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-500 text-sm">Produtos</span>
                                </div>
                                <span className="text-slate-700 text-sm font-medium">{formatCurrency(faturamentoDia.produtos)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-500 text-sm">Serviços</span>
                                </div>
                                <span className="text-slate-700 text-sm font-medium">{formatCurrency(faturamentoDia.servicos)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-slate-600 text-sm font-medium">Líquido</span>
                                </div>
                                <span className="text-emerald-600 font-bold">{formatCurrency(faturamentoDia.liquido)}</span>
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Atividades Recentes */}
                <div className="col-span-1">
                    <GlassCard title="Atividades Recentes" icon={HistoryIcon}>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                            {loading ? (
                                <p className="text-xs text-slate-400">Carregando...</p>
                            ) : atividades.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                                    <p className="text-xs text-slate-400">Nenhuma atividade recente</p>
                                    <p className="text-[10px] text-slate-300 mt-1">As ações no sistema aparecerão aqui</p>
                                </div>
                            ) : (
                                atividades.map((act, i) => (
                                    <div key={i} className="flex gap-3 relative pb-4 last:pb-0">
                                        {i < atividades.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100" />}
                                        <div className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10",
                                            act.type === 'success' && "bg-emerald-100 text-emerald-600",
                                            act.type === 'info' && "bg-blue-100 text-blue-600",
                                            act.type === 'warning' && "bg-amber-100 text-amber-600",
                                            act.type === 'system' && "bg-slate-100 text-slate-600",
                                        )}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate">{act.action}</p>
                                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                <span>{act.user}</span>
                                                <span>{act.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {atividades.length > 0 && (
                            <Link href="/configuracoes/auditoria" className="block text-center mt-4 text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest">
                                Ver todos os logs →
                            </Link>
                        )}
                    </GlassCard>
                </div>

                {/* Agenda da Semana */}
                <div className="col-span-2">
                    <GlassCard title="Agenda da Semana" icon={Calendar}>
                        {agendaSemana.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-400">Carregando agenda...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1.5">
                                {agendaSemana.map((dia) => (
                                    <div key={dia.dia + dia.data} className="space-y-1">
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-slate-500">{dia.dia}</p>
                                            <p className="text-xs text-slate-400">{dia.data.split("/")[0]}</p>
                                        </div>
                                        <div className="space-y-1 min-h-[60px]">
                                            {dia.eventos.length === 0 && (
                                                <div className="text-[10px] text-slate-300 text-center py-2">—</div>
                                            )}
                                            {dia.eventos.map((ev, i) => (
                                                <div
                                                    key={i}
                                                    className={`text-[10px] px-1.5 py-1 rounded-lg font-medium leading-tight ${eventoColors[ev.tipo] || "bg-slate-100 text-slate-600"}`}
                                                >
                                                    {ev.label}
                                                    {ev.valor > 0 && (
                                                        <div className="font-bold mt-0.5">{formatCurrency(ev.valor)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4">
                <Link href="/os/nova" className="glass-card flex items-center gap-3 hover:shadow-glass-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                        <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">Nova OS</p>
                        <p className="text-slate-400 text-xs">Abrir ordem de serviço</p>
                    </div>
                </Link>
                <Link href="/pdv" className="glass-card flex items-center gap-3 hover:shadow-glass-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">Nova Venda</p>
                        <p className="text-slate-400 text-xs">Abrir PDV</p>
                    </div>
                </Link>
                <Link href="/clientes/novo" className="glass-card flex items-center gap-3 hover:shadow-glass-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">Novo Cliente</p>
                        <p className="text-slate-400 text-xs">Cadastrar cliente</p>
                    </div>
                </Link>
                <Link href="/estoque/novo" className="glass-card flex items-center gap-3 hover:shadow-glass-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                        <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">Novo Produto</p>
                        <p className="text-slate-400 text-xs">Adicionar ao estoque</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
