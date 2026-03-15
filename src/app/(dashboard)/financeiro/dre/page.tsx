"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDre, type DreData } from "@/services/dre";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Calculator, TrendingUp, TrendingDown, DollarSign,
    ArrowRight, Percent, Building2, Package, Calendar
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function DrePage() {
    const { profile } = useAuth();
    const [dre, setDre] = useState<DreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadDre();
        }
    }, [profile?.empresa_id, mes, ano]);

    async function loadDre() {
        setLoading(true);
        try {
            const data = await getDre(profile!.empresa_id, mes, ano);
            setDre(data);
        } catch (error) {
            console.error("Erro ao carregar DRE", error);
        } finally {
            setLoading(false);
        }
    }

    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const formatPercent = (val: number) => {
        return `${val.toFixed(2)}%`;
    };

    return (
        <FeatureGate feature="relatorios_avancados" featureName="DRE e Relatórios Avançados">
            <div className="space-y-6 page-enter pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        DRE Gerencial
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                            Analítico
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Demonstração do Resultado do Exercício</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <select
                        value={mes}
                        onChange={e => setMes(Number(e.target.value))}
                        className="bg-transparent border-none text-slate-700 font-bold text-sm focus:ring-0 cursor-pointer pl-3 py-2"
                    >
                        {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <div className="w-px h-6 bg-slate-200" />
                    <select
                        value={ano}
                        onChange={e => setAno(Number(e.target.value))}
                        className="bg-transparent border-none text-slate-700 font-bold text-sm focus:ring-0 cursor-pointer pr-3 py-2"
                    >
                        {[ano - 1, ano, ano + 1].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-6 animate-pulse">
                    <div className="h-40 bg-slate-100 rounded-3xl" />
                    <div className="h-64 bg-slate-100 rounded-3xl" />
                </div>
            ) : dre ? (
                <>
                    {/* Resumo Rápido */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Receita Bruta</p>
                                    <p className="text-slate-500 text-xs text-indigo-600/60 font-medium">Qtd pagamentos recebidos</p>
                                </div>
                            </div>
                            <p className="text-3xl font-black text-indigo-950">{formatCurrency(dre.receitaBruta)}</p>
                        </GlassCard>

                        <GlassCard className="p-6 bg-gradient-to-br from-rose-50 to-white border-rose-100/50">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                                    <TrendingDown size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Custos / Despesas</p>
                                    <p className="text-slate-500 text-xs text-rose-600/60 font-medium">CMV + Operacional</p>
                                </div>
                            </div>
                            <p className="text-3xl font-black text-rose-950">
                                {formatCurrency(dre.cmv + dre.despesasOperacionais)}
                            </p>
                        </GlassCard>

                        <GlassCard className={cn(
                            "p-6 border",
                            dre.lucroLiquido >= 0
                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white shadow-lg shadow-red-500/20"
                        )}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Lucro Líquido</p>
                                    <p className="text-xs text-white/70 font-medium font-mono">
                                        Margem: {formatPercent(dre.margemLiquida)}
                                    </p>
                                </div>
                            </div>
                            <p className="text-3xl font-black text-white">{formatCurrency(dre.lucroLiquido)}</p>
                        </GlassCard>
                    </div>

                    {/* DRE Detalhado */}
                    <GlassCard className="p-0 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <Calculator size={20} className="text-indigo-500" />
                            <h2 className="font-bold text-slate-800 text-lg">Demonstrativo Detalhado</h2>
                            <span className="ml-auto text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                                {dre.periodo}
                            </span>
                        </div>

                        <div className="p-6">
                            <div className="font-mono text-sm space-y-2">
                                {/* Receita */}
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="font-bold text-slate-800 flex items-center gap-2">
                                        <ArrowRight size={14} className="text-indigo-400" /> (=) Receita Bruta Operacional
                                    </span>
                                    <span className="font-bold text-indigo-600 text-base">{formatCurrency(dre.receitaBruta)}</span>
                                </div>

                                <div className="flex justify-between items-center py-2 text-slate-500 pl-6">
                                    <span>(-) Impostos e Deduções s/ Vendas</span>
                                    <span className="text-red-500">{formatCurrency(dre.impostosDeducoes)}</span>
                                </div>

                                {/* Receita Líquida */}
                                <div className="flex justify-between items-center py-3 border-y border-slate-200 bg-slate-50/50 mt-4 px-4 rounded-lg">
                                    <span className="font-bold text-slate-800">(=) Receita Líquida</span>
                                    <span className="font-bold text-slate-800 text-base">{formatCurrency(dre.receitaLiquida)}</span>
                                </div>

                                {/* CMV */}
                                <div className="flex justify-between items-center py-2 text-slate-500 pl-6 mt-4">
                                    <span className="flex items-center gap-2">
                                        <Package size={14} /> (-) Custo da Mercadoria Vendida (CMV)
                                    </span>
                                    <span className="text-red-500">{formatCurrency(dre.cmv)}</span>
                                </div>

                                {/* Lucro Bruto */}
                                <div className="flex justify-between items-center py-3 border-y border-slate-200 bg-slate-50/50 mt-4 px-4 rounded-lg">
                                    <span className="font-bold text-slate-800">(=) Lucro Bruto</span>
                                    <span className="font-bold text-slate-800 text-base">{formatCurrency(dre.lucroBruto)}</span>
                                </div>

                                {/* Despesas */}
                                <div className="flex justify-between items-center py-2 text-slate-500 pl-6 mt-4">
                                    <span className="flex items-center gap-2">
                                        <Building2 size={14} /> (-) Despesas Operacionais (Fixas/Variáveis)
                                    </span>
                                    <span className="text-red-500">{formatCurrency(dre.despesasOperacionais)}</span>
                                </div>

                                {/* Resultado Liquido */}
                                <div className={cn(
                                    "flex justify-between items-center py-4 mt-6 px-4 rounded-xl border-2",
                                    dre.lucroLiquido >= 0 ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/50"
                                )}>
                                    <span className={cn(
                                        "font-black text-lg uppercase tracking-wide",
                                        dre.lucroLiquido >= 0 ? "text-emerald-700" : "text-red-700"
                                    )}>
                                        (=) Resultado Líquido
                                    </span>
                                    <span className={cn(
                                        "font-black text-2xl",
                                        dre.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {formatCurrency(dre.lucroLiquido)}
                                    </span>
                                </div>

                                {/* Margem */}
                                <div className="flex justify-end pt-2 text-xs font-bold text-slate-400 pb-4">
                                    <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                                        Margem Líquida:
                                        <span className={dre.margemLiquida >= 0 ? "text-emerald-500" : "text-red-500"}>
                                            {formatPercent(dre.margemLiquida)}
                                        </span>
                                    </span>
                                </div>

                            </div>
                        </div>
                    </GlassCard>
                </>
            ) : null}
            </div>
        </FeatureGate>
    );
}
