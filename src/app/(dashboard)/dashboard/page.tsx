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
    Package,
    Shield,
    AlertTriangle,
    BarChart3,
    Clock,
    CalendarDays,
    ArrowRight,
    Inbox,
    Target,
    CreditCard,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { getLowStockParts } from "@/app/actions/parts";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

type DashboardTab = "geral" | "os" | "financeiro" | "estoque";

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="animate-pulse h-96 bg-slate-50 rounded-xl" />}>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { profile, empresa } = useAuth();
    const { 
        metrics, loading, faturamentoDia, atividades, 
        osStatus, aparelhosParados, estoqueCritico, contasReceber, faturamento7Dias, metaMes 
    } = useDashboardMetrics();
    const [lowStockParts, setLowStockParts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<DashboardTab>("geral");
    const searchParams = useSearchParams();

    useEffect(() => {
        if (profile) {
            getLowStockParts(profile.empresa_id).then(setLowStockParts);
        }
    }, [profile]);

    useEffect(() => {
        if (searchParams.get('payment') === 'success') {
            toast.success("Assinatura confirmada! Seu plano foi atualizado com sucesso.", {
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
                duration: 6000,
            });
            // Limpar a URL
            window.history.replaceState({}, '', '/dashboard');
        }
    }, [searchParams]);

    const osHojeChange = metrics.osAbertasOntem;
    const clientesNovos = (metrics.clientesAtivos || 0) - (metrics.clientesMesAnterior || 0);
    const receitaChange = metrics.receitaMesAnterior > 0
        ? (((metrics.receitaMensal - metrics.receitaMesAnterior) / metrics.receitaMesAnterior) * 100).toFixed(1)
        : metrics.receitaMensal > 0 ? "100" : "0";

    const today = new Date();
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} de ${monthNames[today.getMonth()]}`;

    const metaPercent = metaMes.meta > 0 ? Math.min(100, Math.round((metaMes.atual / metaMes.meta) * 100)) : 0;

    const maxFat7 = Math.max(...faturamento7Dias.map(f => f.valor), 1);

    const tabs: { key: DashboardTab; label: string }[] = [
        { key: "geral", label: "Geral" },
        { key: "os", label: "OS" },
        { key: "financeiro", label: "Financeiro" },
        { key: "estoque", label: "Estoque" },
    ];

    const kpis = [
        {
            label: "Receita do Mês",
            value: loading ? "..." : formatCurrency(metrics.receitaMensal),
            change: `${Number(receitaChange) >= 0 ? "+" : ""}${receitaChange}%`,
            changeType: Number(receitaChange) >= 0 ? "up" : "down",
            accent: true,
        },
        {
            label: "Caixa Hoje",
            value: loading ? "..." : formatCurrency(metrics.vendasPDVHoje),
            change: "Tempo real",
            changeType: "neutral",
        },
        {
            label: "OS Abertas",
            value: loading ? "..." : metrics.osAbertas.toString(),
            change: osHojeChange > 0 ? `+${osHojeChange} hoje` : "0 hoje",
            changeType: osHojeChange > 0 ? "up" : "neutral",
        },
        {
            label: "Clientes Ativos",
            value: loading ? "..." : metrics.clientesAtivos.toString(),
            change: clientesNovos > 0 ? `+${clientesNovos} mês` : "0 mês",
            changeType: clientesNovos > 0 ? "up" : "neutral",
        },
        {
            label: "Ticket Médio",
            value: loading ? "..." : formatCurrency(metrics.ticketMedioGeral),
            change: "Consolidado",
            changeType: "neutral",
        },
    ];

    return (
        <div className="space-y-3.5 page-enter">

            {/* Page Header + Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
                    <p className="text-slate-400 text-xs mt-0.5">{dateStr} · {empresa?.nome}</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg p-0.5" style={{ border: '0.5px solid #E2E8F0' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                activeTab === tab.key
                                    ? "bg-[#1E40AF] text-white"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: Geral */}
            {activeTab === "geral" && (
                <>
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                        {kpis.map((kpi, i) => (
                            <div 
                                key={kpi.label} 
                                className="glass-card"
                                style={kpi.accent ? { borderLeft: '3px solid #1E40AF', borderRadius: '0 10px 10px 0' } : undefined}
                            >
                                <p className="text-[9px] font-medium text-slate-400 tracking-wide uppercase mb-1">{kpi.label}</p>
                                <p className="text-xl font-semibold text-slate-800 leading-none">{kpi.value}</p>
                                <p className={cn(
                                    "text-[10px] mt-1",
                                    kpi.changeType === "up" && "text-emerald-600",
                                    kpi.changeType === "down" && "text-red-500",
                                    kpi.changeType === "neutral" && "text-slate-400",
                                )}>
                                    {kpi.changeType === "up" && "↑ "}{kpi.changeType === "down" && "↓ "}{kpi.change}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Main Row: OS Status + Meta + Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        {/* OS Status Card */}
                        <div className="lg:col-span-2 glass-card">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-medium text-slate-800">Ordens de Serviço</p>
                                <Link href="/os" className="text-[10px] text-[#1E40AF] font-medium hover:underline">Ver todas →</Link>
                            </div>

                            {/* Status blocks */}
                            <div className="grid grid-cols-4 gap-1.5 mb-3">
                                <div className="rounded-lg p-2 text-center bg-amber-50">
                                    <p className="text-lg font-semibold text-amber-800">{osStatus.aguardando}</p>
                                    <p className="text-[9px] text-amber-700 opacity-80">Aguardando</p>
                                </div>
                                <div className="rounded-lg p-2 text-center bg-blue-50">
                                    <p className="text-lg font-semibold text-blue-800">{osStatus.emReparo}</p>
                                    <p className="text-[9px] text-blue-700 opacity-80">Em Reparo</p>
                                </div>
                                <div className="rounded-lg p-2 text-center bg-emerald-50">
                                    <p className="text-lg font-semibold text-emerald-800">{osStatus.pronto}</p>
                                    <p className="text-[9px] text-emerald-700 opacity-80">Prontas</p>
                                </div>
                                <div className="rounded-lg p-2 text-center bg-red-50">
                                    <p className="text-lg font-semibold text-red-800">{osStatus.atrasadas}</p>
                                    <p className="text-[9px] text-red-700 opacity-80">Atrasadas</p>
                                </div>
                            </div>

                            {/* Aparelhos parados */}
                            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Parados há mais de 3 dias</p>
                            {aparelhosParados.length === 0 ? (
                                <p className="text-[10px] text-slate-400 py-2">Nenhum aparelho parado ✓</p>
                            ) : (
                                <div className="space-y-0">
                                    {aparelhosParados.map((ap) => (
                                        <Link href={`/os/${ap.id}`} key={ap.id} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors" style={{ borderBottom: '0.5px solid #F1F5F9' }}>
                                            <div className={cn("w-[7px] h-[7px] rounded-full flex-shrink-0", ap.dias > 7 ? "bg-red-500" : "bg-amber-500")} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] text-slate-800 truncate">{ap.equipamento}</p>
                                                <p className="text-[9px] text-slate-400">{ap.cliente}</p>
                                            </div>
                                            <span className={cn("text-[11px] font-medium", ap.dias > 7 ? "text-red-600" : "text-amber-600")}>
                                                {ap.dias}d
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Meta + Faturamento 7 dias */}
                        <div className="space-y-2.5">
                            {/* Meta do Mês */}
                            <div className="glass-card">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-medium text-slate-800">Meta do Mês</p>
                                    <Target className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <p className="text-2xl font-semibold text-slate-800">{metaPercent}%</p>
                                <div className="bg-slate-100 rounded-full h-2 overflow-hidden my-2">
                                    <div 
                                        className="h-full bg-[#1E40AF] rounded-full transition-all duration-700"
                                        style={{ width: `${metaPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>{formatCurrency(metaMes.atual)}</span>
                                    <span>Meta: {metaMes.meta > 0 ? formatCurrency(metaMes.meta) : "Não definida"}</span>
                                </div>
                            </div>

                            {/* Faturamento 7 dias (mini chart) */}
                            <div className="glass-card">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-medium text-slate-800">Últimos 7 dias</p>
                                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <div className="flex items-end gap-1.5 h-16">
                                    {faturamento7Dias.map((f, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div 
                                                className="w-full bg-blue-100 hover:bg-[#1E40AF] transition-colors rounded-sm cursor-default"
                                                style={{ height: `${Math.max(4, (f.valor / maxFat7) * 56)}px` }}
                                                title={formatCurrency(f.valor)}
                                            />
                                            <span className="text-[8px] text-slate-400">{f.dia}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Row: Contas + Estoque + Atividades */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {/* Contas a Receber */}
                        <div className="glass-card">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[11px] font-medium text-slate-800">Contas a Receber</p>
                                <Link href="/financeiro/receber" className="text-[10px] text-[#1E40AF] font-medium">Ver →</Link>
                            </div>
                            <div className="space-y-0">
                                {[
                                    { label: "Vencido", value: contasReceber.vencido, color: "text-red-600" },
                                    { label: "Hoje", value: contasReceber.hoje, color: "text-amber-600" },
                                    { label: "Esta semana", value: contasReceber.semana, color: "text-slate-700" },
                                    { label: "Próx. 30 dias", value: contasReceber.trintaDias, color: "text-slate-500" },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '0.5px solid #F1F5F9' }}>
                                        <span className="text-[11px] text-slate-500">{row.label}</span>
                                        <span className={cn("text-[11px] font-medium", row.color)}>{formatCurrency(row.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Estoque Crítico */}
                        <div className="glass-card">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[11px] font-medium text-slate-800">Estoque Crítico</p>
                                <Link href="/estoque" className="text-[10px] text-[#1E40AF] font-medium">Ver →</Link>
                            </div>
                            {estoqueCritico.length === 0 ? (
                                <p className="text-[10px] text-slate-400 py-4 text-center">Tudo em ordem ✓</p>
                            ) : (
                                <div className="space-y-0">
                                    {estoqueCritico.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '0.5px solid #F1F5F9' }}>
                                            <span className="flex-1 text-[11px] text-slate-700 truncate">{item.name}</span>
                                            <span className={cn(
                                                "text-[11px] font-medium",
                                                item.qty === 0 ? "text-red-600" : "text-amber-600"
                                            )}>
                                                {item.qty} un
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Atividades Recentes */}
                        <div className="glass-card">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[11px] font-medium text-slate-800">Atividade Recente</p>
                                <Link href="/configuracoes/auditoria" className="text-[10px] text-[#1E40AF] font-medium">Ver →</Link>
                            </div>
                            {atividades.length === 0 ? (
                                <p className="text-[10px] text-slate-400 py-4 text-center">Nenhuma atividade</p>
                            ) : (
                                <div className="space-y-2">
                                    {atividades.map((act, i) => (
                                        <div key={i} className="flex gap-2">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                                act.type === 'success' && "bg-emerald-100",
                                                act.type === 'info' && "bg-blue-100",
                                                act.type === 'warning' && "bg-amber-100",
                                                act.type === 'system' && "bg-slate-100",
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    act.type === 'success' && "bg-emerald-500",
                                                    act.type === 'info' && "bg-blue-500",
                                                    act.type === 'warning' && "bg-amber-500",
                                                    act.type === 'system' && "bg-slate-500",
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-medium text-slate-700 truncate">{act.action}</p>
                                                <p className="text-[9px] text-slate-400">{act.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                            { label: "Nova OS", desc: "Abrir OS", href: "/os/nova", icon: Plus, bg: "bg-blue-50", iconColor: "text-[#1E40AF]" },
                            { label: "PDV", desc: "Ponto de Venda", href: "/pdv", icon: ShoppingCart, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
                            { label: "Novo Cliente", desc: "Cadastrar", href: "/clientes/novo", icon: Users, bg: "bg-purple-50", iconColor: "text-purple-600" },
                            { label: "Novo Produto", desc: "Adicionar estoque", href: "/estoque/novo", icon: Package, bg: "bg-amber-50", iconColor: "text-amber-600" },
                        ].map(action => (
                            <Link 
                                key={action.href} 
                                href={action.href}
                                className="glass-card flex items-center gap-2.5 group"
                            >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", action.bg)}>
                                    <action.icon className={cn("w-4 h-4", action.iconColor)} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-medium text-slate-800">{action.label}</p>
                                    <p className="text-[9px] text-slate-400">{action.desc}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* TAB: OS */}
            {activeTab === "os" && (
                <>
                    {/* OS Status Blocks */}
                    <div className="grid grid-cols-4 gap-2.5">
                        <div className="glass-card text-center bg-amber-50" style={{ borderColor: '#FEF9C3' }}>
                            <p className="text-2xl font-semibold text-amber-800">{osStatus.aguardando}</p>
                            <p className="text-[10px] text-amber-700">Aguardando</p>
                        </div>
                        <div className="glass-card text-center bg-blue-50" style={{ borderColor: '#DBEAFE' }}>
                            <p className="text-2xl font-semibold text-blue-800">{osStatus.emReparo}</p>
                            <p className="text-[10px] text-blue-700">Em Reparo</p>
                        </div>
                        <div className="glass-card text-center bg-emerald-50" style={{ borderColor: '#DCFCE7' }}>
                            <p className="text-2xl font-semibold text-emerald-800">{osStatus.pronto}</p>
                            <p className="text-[10px] text-emerald-700">Prontas</p>
                        </div>
                        <div className="glass-card text-center bg-red-50" style={{ borderColor: '#FEE2E2' }}>
                            <p className="text-2xl font-semibold text-red-800">{osStatus.atrasadas}</p>
                            <p className="text-[10px] text-red-700">Atrasadas</p>
                        </div>
                    </div>

                    {/* Kanban */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {[
                            { title: "Aguardando", items: aparelhosParados.filter(a => a.status === "aberta" || a.status === "aguardando_pecas"), color: "border-amber-200 bg-amber-50/30" },
                            { title: "Em Reparo", items: aparelhosParados.filter(a => a.status === "em_reparo"), color: "border-blue-200 bg-blue-50/30" },
                            { title: "Pronto p/ Retirada", items: aparelhosParados.filter(a => a.status === "pronta"), color: "border-emerald-200 bg-emerald-50/30" },
                        ].map(col => (
                            <div key={col.title} className={cn("glass-card", col.color)} style={{ borderWidth: '0.5px' }}>
                                <p className="text-[11px] font-medium text-slate-700 mb-2">{col.title}</p>
                                {col.items.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 py-3 text-center">Sem itens</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {col.items.map(item => (
                                            <Link href={`/os/${item.id}`} key={item.id} className="block bg-white rounded-lg p-2.5 hover:shadow-sm transition-shadow" style={{ border: '0.5px solid #E2E8F0' }}>
                                                <p className="text-[11px] font-medium text-slate-800">{item.equipamento}</p>
                                                <p className="text-[9px] text-slate-400">{item.cliente} · há {item.dias}d</p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* OS Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="glass-card text-center">
                            <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <p className="text-lg font-semibold text-slate-800">--d</p>
                            <p className="text-[9px] text-slate-400">Tempo médio reparo</p>
                        </div>
                        <div className="glass-card text-center">
                            <TrendingUp className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <p className="text-lg font-semibold text-slate-800">--%</p>
                            <p className="text-[9px] text-slate-400">Taxa conclusão</p>
                        </div>
                        <div className="glass-card text-center">
                            <Plus className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <p className="text-lg font-semibold text-slate-800">{metrics.osAbertasOntem}</p>
                            <p className="text-[9px] text-slate-400">OS abertas hoje</p>
                        </div>
                        <div className="glass-card text-center">
                            <DollarSign className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <p className="text-lg font-semibold text-slate-800">{formatCurrency(metrics.ticketMedioOS)}</p>
                            <p className="text-[9px] text-slate-400">Ticket médio OS</p>
                        </div>
                    </div>
                </>
            )}

            {/* TAB: Financeiro */}
            {activeTab === "financeiro" && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="glass-card" style={{ borderLeft: '3px solid #1E40AF', borderRadius: '0 10px 10px 0' }}>
                            <p className="text-[9px] font-medium text-slate-400 uppercase">Receita Mês</p>
                            <p className="text-xl font-semibold text-slate-800">{formatCurrency(metrics.receitaMensal)}</p>
                        </div>
                        <div className="glass-card">
                            <p className="text-[9px] font-medium text-slate-400 uppercase">Faturamento Hoje</p>
                            <p className="text-xl font-semibold text-slate-800">{formatCurrency(faturamentoDia.total)}</p>
                        </div>
                        <div className="glass-card">
                            <p className="text-[9px] font-medium text-slate-400 uppercase">Lucro Hoje</p>
                            <p className="text-xl font-semibold text-emerald-700">{formatCurrency(faturamentoDia.liquido)}</p>
                        </div>
                        <div className="glass-card">
                            <p className="text-[9px] font-medium text-slate-400 uppercase">Ticket Médio</p>
                            <p className="text-xl font-semibold text-slate-800">{formatCurrency(metrics.ticketMedioGeral)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* Contas a Receber (expanded) */}
                        <div className="glass-card">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-medium text-slate-800">Contas a Receber</p>
                                <Link href="/financeiro/receber" className="text-[10px] text-[#1E40AF] font-medium">Ver todas →</Link>
                            </div>
                            {[
                                { label: "Vencido", value: contasReceber.vencido, color: "text-red-600", bg: "bg-red-50" },
                                { label: "Hoje", value: contasReceber.hoje, color: "text-amber-600", bg: "bg-amber-50" },
                                { label: "Esta semana", value: contasReceber.semana, color: "text-slate-700", bg: "" },
                                { label: "Próx. 30 dias", value: contasReceber.trintaDias, color: "text-slate-500", bg: "" },
                            ].map((row) => (
                                <div key={row.label} className={cn("flex items-center justify-between py-2 px-2 rounded", row.bg)} style={{ borderBottom: '0.5px solid #F1F5F9' }}>
                                    <span className="text-xs text-slate-600">{row.label}</span>
                                    <span className={cn("text-xs font-medium", row.color)}>{formatCurrency(row.value)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Faturamento 7 dias (expanded) */}
                        <div className="glass-card">
                            <p className="text-[11px] font-medium text-slate-800 mb-3">Faturamento — 7 dias</p>
                            <div className="flex items-end gap-2 h-24">
                                {faturamento7Dias.map((f, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                        <span className="text-[8px] text-slate-400 font-medium">{f.valor > 0 ? formatCurrency(f.valor).replace("R$\u00a0", "") : ""}</span>
                                        <div 
                                            className="w-full bg-blue-100 hover:bg-[#1E40AF] transition-colors rounded-sm"
                                            style={{ height: `${Math.max(4, (f.valor / maxFat7) * 64)}px` }}
                                        />
                                        <span className="text-[9px] text-slate-500 font-medium">{f.dia}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* TAB: Estoque */}
            {activeTab === "estoque" && (
                <>
                    {/* Low Stock Alert */}
                    {lowStockParts.length > 0 && (
                        <div className="glass-card bg-amber-50" style={{ borderColor: '#FDE68A', borderWidth: '0.5px' }}>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-slate-800">Peças com estoque baixo</p>
                                    <p className="text-[10px] text-slate-500">{lowStockParts.length} itens abaixo do mínimo</p>
                                </div>
                                <Link href="/estoque/pecas" className="text-[10px] text-[#1E40AF] font-medium">Ver →</Link>
                            </div>
                        </div>
                    )}

                    {/* Estoque Crítico Table */}
                    <div className="glass-card">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-medium text-slate-800">Produtos com Estoque Baixo</p>
                            <Link href="/estoque" className="text-[10px] text-[#1E40AF] font-medium">Ver estoque →</Link>
                        </div>
                        {estoqueCritico.length === 0 ? (
                            <div className="text-center py-6">
                                <Package className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Todos os produtos estão com estoque normal</p>
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {estoqueCritico.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '0.5px solid #F1F5F9' }}>
                                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", item.qty === 0 ? "bg-red-500" : "bg-amber-500")} />
                                        <span className="flex-1 text-xs text-slate-700 truncate">{item.name}</span>
                                        <span className={cn("text-xs font-medium", item.qty === 0 ? "text-red-600" : "text-amber-600")}>
                                            {item.qty} / {item.alertQty}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <Link href="/estoque/novo" className="glass-card flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-[#1E40AF]" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-800">Novo Produto</p>
                                <p className="text-[9px] text-slate-400">Cadastrar item</p>
                            </div>
                        </Link>
                        <Link href="/ferramentas/importacao" className="glass-card flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Package className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-800">Importar iPhones</p>
                                <p className="text-[9px] text-slate-400">Importação em massa</p>
                            </div>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
