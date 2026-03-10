"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart, Search, Eye, Package, Building2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { getCompras } from "@/services/compras";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

export default function ComprasPage() {
    const { profile } = useAuth();
    const [compras, setCompras] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStart, setFilterStart] = useState<string | undefined>(undefined);
    const [filterEnd, setFilterEnd] = useState<string | undefined>(undefined);

    const loadCompras = useCallback(async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const { data, count } = await getCompras(profile.empresa_id, 1, 50, { startDate: filterStart, endDate: filterEnd });
            setCompras(data);
            setTotal(count || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [profile?.empresa_id, filterStart, filterEnd]);

    useRealtimeSubscription({
        table: 'compras',
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: () => loadCompras()
    });

    useEffect(() => { loadCompras(); }, [loadCompras]);

    const filtered = compras.filter(c =>
        !search || c.fornecedores?.nome?.toLowerCase().includes(search.toLowerCase()) || c.numero_nf?.includes(search)
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "concluida": return "bg-emerald-100 text-emerald-700";
            case "cancelada": return "bg-red-100 text-red-700";
            default: return "bg-amber-100 text-amber-700";
        }
    };

    const totalMes = compras
        .filter(c => c.data_compra?.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((s, c) => s + c.valor_total_centavos, 0);

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ShoppingCart className="text-brand-500" /> Compras
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Histórico de compras e entradas de mercadorias</p>
                </div>
                <Link href="/fiscal/importar" className="btn-primary h-11 px-6 flex items-center gap-2">
                    <Package size={18} /> Importar NF-e
                </Link>
            </div>

            {/* Filtro de Período */}
            <DateRangeFilter
                defaultPreset="tudo"
                onChange={(start, end) => {
                    setFilterStart(start);
                    setFilterEnd(end);
                }}
            />

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total de Compras", value: total, fmt: false },
                    { label: "Compras este Mês", value: compras.filter(c => c.data_compra?.startsWith(new Date().toISOString().slice(0, 7))).length, fmt: false },
                    { label: "Valor Comprado este Mês", value: totalMes, fmt: true },
                ].map(k => (
                    <GlassCard key={k.label} className="p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{k.fmt ? formatCurrency(k.value as number) : k.value}</p>
                    </GlassCard>
                ))}
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-white/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por fornecedor, número da NF..."
                            className="input-glass pl-10"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Fornecedor</th>
                                <th className="px-6 py-4">NF-e / Série</th>
                                <th className="px-6 py-4">Data Compra</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex justify-center mb-2">
                                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        Carregando compras...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                                        <ShoppingCart size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-600 mb-1">Nenhuma compra registrada</p>
                                        <p className="text-sm">Importe uma NF-e de entrada para começar</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(compra => (
                                    <tr key={compra.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", getStatusStyle(compra.status))}>
                                                {compra.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800 truncate max-w-[200px]">
                                                {compra.fornecedores?.nome || "—"}
                                            </p>
                                            <p className="text-xs text-slate-400">{compra.fornecedores?.cnpj || "—"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-700">{compra.numero_nf || "—"}</p>
                                            <p className="text-xs text-slate-400">Série {compra.serie || "—"}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {compra.data_compra ? formatDate(compra.data_compra) : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {compra.data_vencimento ? formatDate(compra.data_vencimento) : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                                            {formatCurrency(compra.valor_total_centavos)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg" title="Ver detalhes">
                                                    <Eye size={16} />
                                                </button>
                                            </div>
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
