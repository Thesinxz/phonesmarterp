"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTitulos, getResumoTitulos, darBaixaTitulo } from "@/services/titulos";
import { type FinanceiroTitulo } from "@/types/database";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Filter, Plus, CheckCircle2, Clock, AlertCircle,
    MoreHorizontal, ArrowUpRight, Search, TrendingUp,
    Calendar
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
// Importar ModalFuturo de Pagamento (Mockado para este passo)

export default function ContasReceberPage() {
    const { profile } = useAuth();
    const [titulos, setTitulos] = useState<any[]>([]);
    const [resumo, setResumo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Filtros
    const [statusFilter, setStatusFilter] = useState("todos");
    const [filterStart, setFilterStart] = useState<string | undefined>(undefined);
    const [filterEnd, setFilterEnd] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadData();
        }
    }, [profile?.empresa_id, statusFilter, filterStart, filterEnd]);

    // Simple debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            if (profile?.empresa_id) loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Realtime Supabase (Firebase-like)
    useRealtimeSubscription({
        table: 'financeiro_titulos',
        callback: (payload) => {
            if (profile?.empresa_id) {
                // Atualiza a lista quando houver qualquer alteração no banco
                loadData();
            }
        }
    });

    async function loadData() {
        setLoading(true);
        try {
            // 1. Carrega Resumo
            const resumoData = await getResumoTitulos(profile!.empresa_id, 'receber', { startDate: filterStart, endDate: filterEnd });
            setResumo(resumoData);

            // 2. Carrega Lista
            const filters: any = {};
            if (statusFilter !== "todos") {
                filters.status = [statusFilter];
            }
            if (searchTerm) {
                filters.busca = searchTerm;
            }

            const r = await getTitulos(profile!.empresa_id, 'receber', 1, 50, filters);
            setTitulos(r.data);

        } catch (error: any) {
            toast.error("Erro ao carregar contas a receber: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleBaixarTitulo = async (id: string, valorTotal: number) => {
        if (!confirm("Deseja confirmar o recebimento total deste título?")) return;

        try {
            await darBaixaTitulo(id, valorTotal);
            toast.success("Título recebido com sucesso!");
            loadData();
        } catch (error: any) {
            toast.error("Erro ao baixar título: " + error.message);
        }
    };

    const getStatusStyle = (status: string, vencimento: string) => {
        if (status === 'pago') return "bg-emerald-50 text-emerald-600 border-emerald-100";
        if (status === 'cancelado') return "bg-slate-50 text-slate-500 border-slate-200";

        const isAtrasado = new Date(vencimento) < new Date();
        if (isAtrasado || status === 'atrasado') return "bg-red-50 text-red-600 border-red-100";

        return "bg-amber-50 text-amber-600 border-amber-100"; // pendente ou parcial
    };

    const getStatusText = (status: string, vencimento: string) => {
        if (status === 'pago') return "Recebido";
        if (status === 'cancelado') return "Cancelado";
        if (status === 'parcial') return "Parcial";

        const isAtrasado = new Date(vencimento) < new Date();
        if (isAtrasado) return "Atrasado";

        return "A Receber";
    };

    return (
        <div className="space-y-6 page-enter pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Contas a Receber
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                            Receitas
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Gestão de crediário, parcelas e vendas a prazo.</p>
                </div>
                <div className="flex gap-3">
                    <button className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                        <Plus size={18} />
                        Novo Recebimento
                    </button>
                </div>
            </div>

            {/* Filtro de Período */}
            <DateRangeFilter
                defaultPreset="tudo"
                onChange={(start, end) => {
                    setFilterStart(start);
                    setFilterEnd(end);
                }}
            />

            {/* Metricas Rapidas */}
            {resumo && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <GlassCard className="p-5 border-l-4 border-l-slate-400">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total a Receber</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(resumo.totalAberto)}</p>
                    </GlassCard>
                    <GlassCard className="p-5 border-l-4 border-l-red-400">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Em Atraso</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(resumo.atrasado)}</p>
                    </GlassCard>
                    <GlassCard className="p-5 border-l-4 border-l-amber-400">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Vencendo Hoje</p>
                        <p className="text-xl font-black text-slate-800">{formatCurrency(resumo.vencendoHoje)}</p>
                    </GlassCard>
                    <GlassCard className="p-5 border-l-4 border-l-emerald-400 bg-emerald-50/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Recebido (Mês)</p>
                        <p className="text-xl font-black text-emerald-700">{formatCurrency(resumo.recebidoPagoMensal)}</p>
                    </GlassCard>
                </div>
            )}

            {/* Componente de Tabela / Lista */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {['todos', 'pendente', 'atrasado', 'pago'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => setStatusFilter(opt)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                                    statusFilter === opt
                                        ? "bg-emerald-100 text-emerald-700 shadow-sm"
                                        : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                                )}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar descrição ou ID..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/10 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Cliente / Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/30" />
                                    </tr>
                                ))
                            ) : titulos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 className="text-slate-300" size={24} />
                                        </div>
                                        <p className="text-slate-500 font-medium">Nenhuma conta a receber encontrada.</p>
                                    </td>
                                </tr>
                            ) : (
                                titulos.map((item) => {
                                    const isAtrasado = new Date(item.data_vencimento) < new Date() && item.status !== 'pago';
                                    const saldoRestante = item.valor_total_centavos - (item.valor_pago_centavos || 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "flex items-center gap-1.5 w-max text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full border",
                                                    getStatusStyle(item.status, item.data_vencimento)
                                                )}>
                                                    {item.status === 'pago' ? <CheckCircle2 size={12} /> :
                                                        isAtrasado ? <AlertCircle size={12} /> : <Clock size={12} />}
                                                    {getStatusText(item.status, item.data_vencimento)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={cn("font-semibold", isAtrasado ? "text-red-600" : "text-slate-700")}>
                                                    {formatDate(item.data_vencimento)}
                                                </p>
                                                {item.data_pagamento && (
                                                    <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                                                        <CheckCircle2 size={10} /> Pago em {formatDate(item.data_pagamento)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{item.clientes?.nome || "Cliente Removido/Nulo"}</p>
                                                <p className="text-xs text-slate-500">{item.descricao}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                                                    {item.categoria}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-black text-emerald-600 text-base">
                                                    {formatCurrency(item.valor_total_centavos)}
                                                </p>
                                                {item.valor_pago_centavos > 0 && item.status !== 'pago' && (
                                                    <p className="text-[10px] text-slate-400">
                                                        Resta: {formatCurrency(saldoRestante)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    {item.status !== 'pago' && item.status !== 'cancelado' && (
                                                        <button
                                                            onClick={() => handleBaixarTitulo(item.id, saldoRestante)}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
                                                            title="Receber Agora"
                                                        >
                                                            <ArrowUpRight size={14} /> Baixar
                                                        </button>
                                                    )}
                                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
