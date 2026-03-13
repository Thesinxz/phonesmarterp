"use client";

import { useState, useEffect } from "react";
import {
    Megaphone,
    Send,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Bot,
    Loader2,
    MessageSquare,
    Users,
    Zap
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { getMarketingStats, getMarketingLogs, type MarketingLog } from "@/services/marketing";
import { formatDate } from "@/utils/formatDate";

export default function MarketingPage() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({ total: 0, enviados: 0, entregues: 0, falhas: 0, automacoes: 0, campanhas: 0 });
    const [logs, setLogs] = useState<MarketingLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id]);

    async function loadData() {
        setLoading(true);
        try {
            const [statsData, logsData] = await Promise.all([
                getMarketingStats(),
                getMarketingLogs(1, 15)
            ]);
            setStats(statsData);
            setLogs(logsData.data);
        } catch (error) {
            console.error("Erro ao carregar dados de marketing:", error);
        } finally {
            setLoading(false);
        }
    }

    const taxaEntrega = stats.total > 0 ? Math.round((stats.entregues / stats.total) * 100) : 0;

    return (
        <div className="space-y-6 page-enter pb-20 lg:pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                        <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Marketing</h1>
                        <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Central de comunicação, automações e campanhas</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-5 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 border-violet-100/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                            <Send size={18} className="text-violet-600" />
                        </div>
                        <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Enviadas (Mês)</p>
                    </div>
                    <p className="text-3xl font-black text-violet-900">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.total}
                    </p>
                </GlassCard>

                <GlassCard className="p-5 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-100/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <CheckCircle2 size={18} className="text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Taxa Entrega</p>
                    </div>
                    <p className="text-3xl font-black text-emerald-900">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${taxaEntrega}%`}
                    </p>
                </GlassCard>

                <GlassCard className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Bot size={18} className="text-blue-600" />
                        </div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Automações</p>
                    </div>
                    <p className="text-3xl font-black text-blue-900">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.automacoes}
                    </p>
                </GlassCard>

                <GlassCard className="p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-100/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Users size={18} className="text-amber-600" />
                        </div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Campanhas</p>
                    </div>
                    <p className="text-3xl font-black text-amber-900">
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.campanhas}
                    </p>
                </GlassCard>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <a href="/marketing/pos-venda" className="group">
                    <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-violet-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Pós-Venda</h3>
                                <p className="text-xs text-slate-500">Automações de mensagens</p>
                            </div>
                        </div>
                    </GlassCard>
                </a>

                <a href="/marketing/templates" className="group">
                    <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-emerald-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Templates</h3>
                                <p className="text-xs text-slate-500">Modelos de mensagens</p>
                            </div>
                        </div>
                    </GlassCard>
                </a>

                <a href="/marketing/campanhas" className="group">
                    <GlassCard className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-amber-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                <Megaphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Campanhas</h3>
                                <p className="text-xs text-slate-500">Envio em massa</p>
                            </div>
                        </div>
                    </GlassCard>
                </a>
            </div>

            {/* Recent Logs */}
            <GlassCard title="Últimas Mensagens" icon={Send}>
                {loading ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Send size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">Nenhuma mensagem enviada ainda</p>
                        <p className="text-xs text-slate-300 mt-1">Configure automações ou envie campanhas para ver os registros aqui</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-4 py-3 text-left">Destinatário</th>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-left">Template</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-700">{log.destinatario_nome || "—"}</p>
                                            <p className="text-[10px] text-slate-400">{log.destinatario_telefone}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                                                log.tipo === "automacao" ? "bg-violet-50 text-violet-600" :
                                                    log.tipo === "campanha" ? "bg-amber-50 text-amber-600" :
                                                        "bg-slate-100 text-slate-500"
                                            )}>
                                                {log.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{log.template_nome || "—"}</td>
                                        <td className="px-4 py-3 text-center">
                                            {log.status === "falha" ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-bold">
                                                    <XCircle size={12} /> Falha
                                                </span>
                                            ) : log.status === "lido" ? (
                                                <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-bold">
                                                    <CheckCircle2 size={12} /> Lido
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                                                    <CheckCircle2 size={12} /> {log.status === "entregue" ? "Entregue" : "Enviado"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-400">{formatDate(log.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
