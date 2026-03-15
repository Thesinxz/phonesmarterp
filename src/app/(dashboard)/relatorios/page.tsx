"use client";

import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import Link from "next/link";
import {
    BarChart3,
    TrendingUp,
    PieChart,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    ClipboardList,
    DollarSign,
    Package,
    Download,
    Shield,
    ChevronRight
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { RefreshCw } from "lucide-react";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function RelatoriosPage() {
    const { metrics, loading } = useDashboardMetrics();

    const reportCards = [
        {
            label: "Faturamento Bruto",
            value: formatCurrency(metrics.receitaMensal),
            // change: "+12.5%", // Removido fake change
            type: "neutral",
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            label: "Total de OS Abertas",
            value: metrics.osAbertas, // Usando dado real
            // change: "+8%", // Removido fake change
            type: "neutral",
            icon: ClipboardList,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            label: "Ticket Médio",
            value: formatCurrency(metrics.ticketMedioGeral),
            // change: "-2.4%", // Removido fake change
            type: "neutral",
            icon: BarChart3,
            color: "text-purple-500",
            bg: "bg-purple-50"
        },
        {
            label: "Clientes Ativos",
            value: metrics.clientesAtivos,
            // change: "+15%", // Removido fake change
            type: "neutral",
            icon: Users,
            color: "text-brand-500",
            bg: "bg-brand-50"
        }
    ];

    return (
        <FeatureGate
            feature="relatorios_avancados"
            featureName="Relatórios & Insights"
            description="Acesse análises detalhadas, gráficos de tendências e composição de DRE para uma gestão profissional."
        >
            <div className="space-y-6 page-enter pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Relatórios & Insights</h1>
                        <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Análise detalhada do seu negócio</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="bg-white/60 h-10 px-4 rounded-xl border border-white/60 text-slate-600 flex items-center justify-center gap-2 text-[10px] md:text-sm font-medium hover:bg-white/80 transition-all opacity-50 cursor-not-allowed w-full sm:w-auto" disabled>
                            <Download size={16} />
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {reportCards.map((card, i) => (
                        <GlassCard key={i} className="p-5 border-white/40">
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-2.5 rounded-2xl", card.bg, card.color)}>
                                    <card.icon size={22} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-800">{loading ? "..." : card.value}</p>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">{card.label}</p>
                        </GlassCard>
                    ))}
                </div>

                {/* Relatórios Disponíveis */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest px-1">Relatórios Detalhados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                title: "Consumo de Peças",
                                desc: "Análise de saída de estoque para reparos e vendas.",
                                href: "/relatorios/pecas",
                                icon: Package,
                                color: "text-amber-500",
                                bg: "bg-amber-50",
                                status: "Disponível"
                            },
                            {
                                title: "Gestão de Garantias",
                                desc: "Retornos, taxa de re-trabalho e falhas técnicas.",
                                href: "/relatorios/garantias",
                                icon: Shield,
                                color: "text-indigo-500",
                                bg: "bg-indigo-50",
                                status: "Novo"
                            },
                            {
                                title: "Relatório de Trade-ins",
                                desc: "Análise de aparelhos recebidos como parte do pagamento.",
                                href: "/relatorios/trade-ins",
                                icon: RefreshCw,
                                color: "text-emerald-500",
                                bg: "bg-emerald-50",
                                status: "Novo"
                            }
                        ].map((report, i) => (
                            <Link key={i} href={report.href}>
                                <GlassCard className="p-6 group hover:border-indigo-200 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", report.bg, report.color)}>
                                            <report.icon size={28} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{report.title}</h4>
                                                {report.status === 'Novo' && (
                                                    <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Novo</span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-xs font-medium">{report.desc}</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </GlassCard>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Empty State for Advanced Reports */}
                <GlassCard className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <BarChart3 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Relatórios Financeiros Avançados</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                        A coleta de dados para gráficos de tendências de faturamento e composição de DRE requer mais histórico de lançamentos. Continue utilizando o financeiro para gerar insights automáticos.
                    </p>
                </GlassCard>
            </div>
        </FeatureGate>
    );
}

function AlertTriangle({ size }: { size: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
