"use client";

import { useState, useEffect } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Filter,
    Plus,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    CheckCircle2,
    Clock,
    MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { getFinanceiro, togglePagamento } from "@/services/financeiro";
import { type Financeiro } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export default function FinanceiroPage() {
    const { profile } = useAuth();
    const [movimentacoes, setMovimentacoes] = useState<Financeiro[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Carga inicial
        loadData();

        const supabase = createClient();
        const channelId = profile?.empresa_id ? `financeiro-realtime-${profile.empresa_id}` : 'financeiro-realtime-global';
        const filter = profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined;

        const channel = supabase
            .channel(channelId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "financeiro",
                    filter: filter
                },
                (payload) => {
                    console.log("Realtime Financeiro:", payload.eventType, payload);

                    if (payload.eventType === 'UPDATE') {
                        setMovimentacoes(current => current.map(m =>
                            m.id === payload.new.id ? { ...m, ...payload.new } : m
                        ));
                    } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                        loadData();
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Realtime Financeiro Status [${channelId}]:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.empresa_id]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await getFinanceiro();
            setMovimentacoes(data);
        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus(item: Financeiro) {
        try {
            await togglePagamento(item.id, !item.pago);
            loadData();
        } catch (error) {
            console.error("Erro ao alterar status:", error);
        }
    }

    const entradas = movimentacoes
        .filter(m => m.tipo === "entrada" && m.pago)
        .reduce((sum, current) => sum + current.valor_centavos, 0);

    const saidas = movimentacoes
        .filter(m => m.tipo === "saida" && m.pago)
        .reduce((sum, current) => sum + current.valor_centavos, 0);

    const saldo = entradas - saidas;

    return (
        <div className="space-y-6 page-enter pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Controle seu fluxo de caixa e faturamento</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white/60 h-10 px-4 rounded-xl border border-white/60 text-slate-600 flex items-center gap-2 text-sm font-medium hover:bg-white/80 transition-all">
                        <Calendar size={16} />
                        Este Mês
                    </button>
                    <Link href="/financeiro/novo" className="btn-primary">
                        <Plus size={18} />
                        Nova Movimentação
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
                <GlassCard className="p-6 relative overflow-hidden border-emerald-100/50 bg-emerald-50/10">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Entradas</p>
                            <p className="text-2xl font-black text-slate-800">
                                R$ {(entradas / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <ArrowUpCircle size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-emerald-600">
                        <TrendingUp size={120} />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden border-red-100/50 bg-red-50/10">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Saídas</p>
                            <p className="text-2xl font-black text-slate-800">
                                R$ {(saidas / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                            <ArrowDownCircle size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-red-600">
                        <TrendingDown size={120} />
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden border-brand-100/50 bg-brand-50/10">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Saldo Atual</p>
                            <p className={cn(
                                "text-2xl font-black text-slate-900",
                                saldo < 0 && "text-red-600"
                            )}>
                                R$ {(saldo / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                            <DollarSign size={28} />
                        </div>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-brand-600">
                        <DollarSign size={120} />
                    </div>
                </GlassCard>
            </div>

            {/* List */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <h2 className="font-bold text-slate-700">Fluxo de Caixa</h2>
                    <div className="relative">
                        <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            <Filter size={14} />
                            FILTRAR POR CATEGORIA
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/10 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data/Vencimento</th>
                                <th className="px-6 py-4">Descrição / Categoria</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/30" />
                                    </tr>
                                ))
                            ) : movimentacoes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        Nenhuma movimentação registrada.
                                    </td>
                                </tr>
                            ) : (
                                movimentacoes.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(item)}
                                                className={cn(
                                                    "flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-full border",
                                                    item.pago
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}
                                            >
                                                {item.pago ? (
                                                    <><CheckCircle2 size={12} /> Pago</>
                                                ) : (
                                                    <><Clock size={12} /> Pendente</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-700">{item.vencimento ? formatDate(item.vencimento) : '--/--/----'}</p>
                                            <p className="text-[10px] text-slate-400">Registrado em {formatDate(item.created_at)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{item.descricao || "Sem descrição"}</p>
                                            <span className="badge badge-slate px-1.5 py-0 text-[10px]">{item.categoria}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "font-black text-base",
                                                item.tipo === "entrada" ? "text-emerald-600" : "text-red-500"
                                            )}>
                                                {item.tipo === "entrada" ? "+" : "-"} R$ {(item.valor_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
