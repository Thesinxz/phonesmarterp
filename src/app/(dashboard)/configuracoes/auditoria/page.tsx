"use client";

import { useState, useEffect } from "react";
import {
    History,
    Search,
    Filter,
    User,
    Table,
    Clock,
    Eye,
    ArrowLeft,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { getAuditLogs } from "@/services/audit";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function AuditoriaPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    async function loadLogs() {
        setLoading(true);
        try {
            const data = await getAuditLogs({ limit: 50 });
            setLogs(data);
        } catch (error) {
            console.error("Erro ao carregar logs:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <FeatureGate feature="auditoria_logs" featureName="Logs de Auditoria">
            <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/configuracoes" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Logs de Auditoria</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Rastreabilidade completa de alterações no sistema</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} />
                        Sistema Blindado
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* List Table */}
                <GlassCard className="col-span-2 p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                className="input-glass pl-9 h-9 text-xs"
                                placeholder="Filtrar por tabela ou ação..."
                            />
                        </div>
                        <button onClick={loadLogs} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all active:scale-90">
                            <Clock size={16} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">🕒 Data/Hora</th>
                                    <th className="px-6 py-4">👤 Usuário</th>
                                    <th className="px-6 py-4">📁 Tabela</th>
                                    <th className="px-6 py-4">⚡ Ação</th>
                                    <th className="px-6 py-4 text-right">Ver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4 h-12 bg-slate-50/20" />
                                        </tr>
                                    ))
                                ) : logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className={cn(
                                            "group hover:bg-slate-50/50 transition-colors cursor-pointer",
                                            selectedLog?.id === log.id && "bg-brand-50/50"
                                        )}
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-600">
                                            {formatDate(log.criado_em)}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                                            {log.usuario?.nome || "Sistema"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="badge badge-slate text-[9px]">{log.tabela.toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border",
                                                log.acao === 'INSERT' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                                log.acao === 'UPDATE' && "bg-amber-50 text-amber-600 border-amber-100",
                                                log.acao === 'DELETE' && "bg-red-50 text-red-600 border-red-100"
                                            )}>
                                                {log.acao}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 hover:bg-white rounded-lg text-slate-300 hover:text-brand-600 transition-all opacity-0 group-hover:opacity-100">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Details Panel */}
                <div className="space-y-6">
                    <GlassCard title="Detalhes do Log" icon={History}>
                        {selectedLog ? (
                            <div className="space-y-4 py-2">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Resumo</p>
                                    <p className="text-sm text-slate-700 font-medium">
                                        Usuário <b>{selectedLog.usuario?.nome}</b> realizou um <b>{selectedLog.acao}</b> na tabela <b>{selectedLog.tabela}</b>.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dados Enviados</p>
                                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-60 scrollbar-thin">
                                        {JSON.stringify(selectedLog.dado_novo_json, null, 2)}
                                    </pre>
                                </div>

                                {selectedLog.dado_anterior_json && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Estado Anterior</p>
                                        <pre className="p-3 bg-slate-900/50 border border-slate-800/50 rounded-2xl text-[10px] text-slate-400 font-mono overflow-x-auto max-h-60 scrollbar-thin">
                                            {JSON.stringify(selectedLog.dado_anterior_json, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Eye size={24} />
                                </div>
                                <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Selecione um log na tabela para ver os detalhes técnicos da alteração.</p>
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard title="Infraestrutura" icon={Table} className="bg-slate-900 border-none">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    <span className="text-white/80 text-xs">Retenção de 90 dias</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    <span className="text-white/80 text-xs">Imutabilidade Ativa</span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
            </div>
        </FeatureGate>
    );
}
