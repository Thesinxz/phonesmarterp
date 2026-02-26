"use client";

import { TrendingUp, Trophy } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { type MetaProgresso } from "@/services/metas";

interface MetaProgressCardProps {
    progresso: MetaProgresso;
    rank: number;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function MetaProgressCard({ progresso, rank }: MetaProgressCardProps) {
    const { meta, realizado_centavos, realizado_qtd, percentual_faturamento, percentual_qtd } = progresso;
    const medal = RANK_MEDALS[rank] || `#${rank + 1}`;
    const nomeVendedor = meta.usuario?.nome || "Vendedor";

    const progressColor =
        percentual_faturamento >= 100 ? "bg-emerald-500" :
            percentual_faturamento >= 75 ? "bg-blue-500" :
                percentual_faturamento >= 50 ? "bg-amber-500" :
                    "bg-red-400";

    return (
        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{medal}</span>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">{nomeVendedor}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">
                            {meta.tipo_periodo} — {meta.mes}/{meta.ano}
                        </p>
                    </div>
                </div>
                {percentual_faturamento >= 100 && (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase">Meta Batida!</span>
                    </div>
                )}
            </div>

            {/* Faturamento */}
            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Faturamento</span>
                    <span className="font-bold text-slate-700">
                        R$ {(realizado_centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        <span className="text-slate-400 font-normal"> / R$ {(meta.meta_faturamento_centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(100, percentual_faturamento)}%` }}
                    />
                </div>
                <p className="text-right text-[10px] font-bold mt-0.5" style={{ color: percentual_faturamento >= 100 ? "#10b981" : "#64748b" }}>
                    {percentual_faturamento}%
                </p>
            </div>

            {/* Quantidade de Vendas */}
            {meta.meta_qtd_vendas > 0 && (
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Vendas
                        </span>
                        <span className="font-bold text-slate-700">
                            {realizado_qtd}
                            <span className="text-slate-400 font-normal"> / {meta.meta_qtd_vendas}</span>
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, percentual_qtd)}%` }}
                        />
                    </div>
                    <p className="text-right text-[10px] font-bold mt-0.5 text-slate-500">{percentual_qtd}%</p>
                </div>
            )}

            {/* Metas Específicas */}
            {meta.categorias && meta.categorias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100/50 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Metas Específicas</p>
                    {meta.categorias.map(cat => (
                        <div key={cat.id} className="bg-slate-50 rounded-lg p-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                    {cat.categoria_nome}
                                </span>
                                <div className="text-right flex items-center gap-2">
                                    {cat.meta_qtd > 0 && (
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                                                {cat.realizado_qtd || 0} / {cat.meta_qtd} un.
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                                                {Math.round(((cat.realizado_qtd || 0) / cat.meta_qtd) * 100)}%
                                            </span>
                                        </div>
                                    )}
                                    {cat.meta_valor_centavos > 0 && (
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                                                R$ {((cat.realizado_valor_centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {(cat.meta_valor_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                                                {Math.round(((cat.realizado_valor_centavos || 0) / cat.meta_valor_centavos) * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassCard>
    );
}
