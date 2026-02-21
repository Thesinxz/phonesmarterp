"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle,
    CheckCircle2,
    Clock,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getResumoTitulos } from "@/services/titulos";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";

export default function FinanceiroPage() {
    const { profile } = useAuth();
    const [resumoReceber, setResumoReceber] = useState<any>(null);
    const [resumoPagar, setResumoPagar] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadData();
        }
    }, [profile?.empresa_id]);

    async function loadData() {
        setLoading(true);
        try {
            const [receber, pagar] = await Promise.all([
                getResumoTitulos(profile!.empresa_id, 'receber'),
                getResumoTitulos(profile!.empresa_id, 'pagar')
            ]);

            setResumoReceber(receber);
            setResumoPagar(pagar);
        } catch (error) {
            console.error("Erro ao carregar resumos financeiros:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading || !resumoReceber || !resumoPagar) {
        return (
            <div className="p-12 pl-0 flex justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const receberTotal = resumoReceber.totalAberto;
    const pagarTotal = resumoPagar.totalAberto;
    const saldoProjetado = receberTotal - pagarTotal;

    return (
        <div className="space-y-6 page-enter pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Visão Geral Financeira</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Acompanhamento do seu fluxo a pagar e a receber.</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white/60 h-10 px-4 rounded-xl border border-white/60 text-slate-600 flex items-center gap-2 text-sm font-medium hover:bg-white/80 transition-all">
                        <Calendar size={16} />
                        Este Mês
                    </button>
                    <Link href="/financeiro/caixa" className="h-10 px-4 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                        <DollarSign size={16} />
                        Ir para Caixa (PDV)
                    </Link>
                </div>
            </div>

            {/* Projetado Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 relative overflow-hidden border-emerald-100/50 bg-emerald-50/10 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">A Receber Total</p>
                            <p className="text-2xl font-black text-slate-800">
                                {formatCurrency(receberTotal)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <ArrowUpCircle size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-emerald-600 pointer-events-none">
                        <TrendingUp size={120} />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden border-red-100/50 bg-red-50/10 hover:border-red-200 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">A Pagar Total</p>
                            <p className="text-2xl font-black text-slate-800">
                                {formatCurrency(pagarTotal)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                            <ArrowDownCircle size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-red-600 pointer-events-none">
                        <TrendingDown size={120} />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden border-indigo-100/50 bg-indigo-50/10 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Saldo Projetado</p>
                            <p className={cn(
                                "text-2xl font-black text-slate-900",
                                saldoProjetado < 0 && "text-red-600"
                            )}>
                                {formatCurrency(saldoProjetado)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <DollarSign size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-indigo-600 pointer-events-none">
                        <DollarSign size={120} />
                    </div>
                </GlassCard>
            </div>

            {/* Detailed Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* A Pagar Breakdown */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <TrendingDown size={16} />
                            </div>
                            Despesas (A Pagar)
                        </h2>
                        <Link href="/financeiro/pagar" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            Ver todas
                        </Link>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/50">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-red-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">Atrasados</p>
                                    <p className="text-xs text-slate-500">Títulos vencidos não pagos</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-red-600">{formatCurrency(resumoPagar.atrasado)}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl border border-amber-100 bg-amber-50/50">
                            <div className="flex items-center gap-3">
                                <Clock className="text-amber-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">Vencendo Hoje</p>
                                    <p className="text-xs text-slate-500">Atenção com estes pagamentos</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-amber-600">{formatCurrency(resumoPagar.vencendoHoje)}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-slate-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">A Vencer Futuro</p>
                                    <p className="text-xs text-slate-500">Próximos dias</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-slate-600">{formatCurrency(resumoPagar.aVencer)}</span>
                        </div>
                    </div>

                    <Link href="/financeiro/pagar" className="w-full text-center block py-3 rounded-xl border-2 border-dashed border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors">
                        Gerenciar Contas a Pagar
                    </Link>
                </div>

                {/* A Receber Breakdown */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                            Receitas (A Receber)
                        </h2>
                        <Link href="/financeiro/receber" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                            Ver todos
                        </Link>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/50">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-red-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">Inadimplentes</p>
                                    <p className="text-xs text-slate-500">Boletos/crediário vencidos</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-red-600">{formatCurrency(resumoReceber.atrasado)}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="text-emerald-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">Para Receber Hoje</p>
                                    <p className="text-xs text-slate-500">Vencendo nesta data</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-emerald-600">{formatCurrency(resumoReceber.vencendoHoje)}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-slate-500" size={20} />
                                <div>
                                    <p className="font-bold text-slate-700">A Vencer Futuro</p>
                                    <p className="text-xs text-slate-500">Parcelas a longo prazo</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-slate-600">{formatCurrency(resumoReceber.aVencer)}</span>
                        </div>
                    </div>

                    <Link href="/financeiro/receber" className="w-full text-center block py-3 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors">
                        Gerenciar Contas a Receber
                    </Link>
                </div>
            </div>
        </div>
    );
}
