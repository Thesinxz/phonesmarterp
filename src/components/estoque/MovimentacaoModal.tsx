"use client";

import { useState, useEffect } from "react";
import { X, History, ArrowUpRight, ArrowDownLeft, RefreshCcw, User, Calendar, Tag } from "lucide-react";
import { getProdutoHistorico } from "@/services/historico_produto";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

interface MovimentacaoModalProps {
    produtoId: string;
    onClose: () => void;
}

export function MovimentacaoModal({ produtoId, onClose }: MovimentacaoModalProps) {
    const [historico, setHistorico] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistorico();
    }, [produtoId]);

    async function loadHistorico() {
        setLoading(true);
        try {
            const data = await getProdutoHistorico(produtoId);
            setHistorico(data);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        } finally {
            setLoading(false);
        }
    }

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case "entrada": return <ArrowUpRight className="text-emerald-500" size={18} />;
            case "saida": return <ArrowDownLeft className="text-red-500" size={18} />;
            default: return <RefreshCcw className="text-indigo-500" size={18} />;
        }
    };

    const getBadgeStyle = (tipo: string) => {
        switch (tipo) {
            case "entrada": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "saida": return "bg-red-50 text-red-700 border-red-100";
            default: return "bg-indigo-50 text-indigo-700 border-indigo-100";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                            <History size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Histórico de Movimentação</h2>
                            <p className="text-xs text-slate-500">Rastreabilidade completa do produto</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <RefreshCcw className="animate-spin mb-3" size={24} />
                            <p className="text-sm">Carregando histórico...</p>
                        </div>
                    ) : historico.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <History size={40} className="mb-4 opacity-20" />
                            <p className="text-sm italic">Nenhuma movimentação registrada para este produto.</p>
                        </div>
                    ) : (
                        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {historico.map((item, index) => (
                                <div key={item.id} className="relative flex items-start gap-4 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="relative z-10 w-10 h-10 shrink-0 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm">
                                        {getIcon(item.tipo_evento)}
                                    </div>
                                    <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-100 p-4 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                getBadgeStyle(item.tipo_evento)
                                            )}>
                                                {item.tipo_evento}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                <Calendar size={12} />
                                                {formatDate(item.created_at)}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 font-medium mb-3">
                                            {item.descricao}
                                        </p>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center overflow-hidden">
                                                    <User size={12} />
                                                </div>
                                                <span className="font-semibold">{item.usuario_nome}</span>
                                            </div>
                                            {item.referencia_id && (
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Tag size={10} />
                                                    Ref: {item.referencia_id.substring(0, 8)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-ghost px-6 py-2"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
