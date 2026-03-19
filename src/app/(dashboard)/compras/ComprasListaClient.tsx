"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
    ShoppingCart, Search, Eye, Plus, 
    Info
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getCompras } from "@/app/actions/compras";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { StatusBadge, OrigemBadge } from "@/components/compras/StatusBadges";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

interface Props {
    comprasIniciais: any[];
    empresaId: string;
}

export function ComprasListaClient({ comprasIniciais, empresaId }: Props) {
    const [compras, setCompras] = useState<any[]>(comprasIniciais);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("Todos os status");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");

    const loadData = useCallback(async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            const data = await getCompras(empresaId, {
                status: filterStatus === "Todos os status" ? undefined : filterStatus,
                dataInicio: dataInicio || undefined,
                dataFim: dataFim || undefined
            });
            setCompras(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [empresaId, filterStatus, dataInicio, dataFim]);

    // Escutar mudanças em tempo real
    useRealtimeTable('compras', empresaId, loadData);

    const filtered = useMemo(() => {
        return compras.filter(c =>
            !search || 
            c.fornecedor_nome?.toLowerCase().includes(search.toLowerCase()) || 
            c.nota_fiscal_numero?.includes(search) ||
            `OC-${String(c.numero).padStart(3, '0')}`.includes(search)
        );
    }, [compras, search]);

    const isVencido = (data: string | null, status: string) => {
        if (!data || status === 'pago') return false;
        return new Date(data) < new Date();
    };

    const totalPendente = useMemo(() => filtered
        .filter(c => c.status === 'pendente')
        .reduce((s, c) => s + (c.valor_total || 0), 0), [filtered]);
        
    const totalPago = useMemo(() => filtered
        .filter(c => c.status === 'pago')
        .reduce((s, c) => s + (c.valor_total || 0), 0), [filtered]);

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ShoppingCart className="text-brand-500" /> Gestão de Compras
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Controle de entradas, estoque e financeiro</p>
                </div>
                <Link href="/compras/nova" className="btn-primary h-12 px-6 flex items-center gap-2 shadow-brand-glow">
                    <Plus size={20} /> Nova Compra
                </Link>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                    { label: "Total Pendente", value: totalPendente, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Total Pago", value: totalPago, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Ordens Realizadas", value: filtered.length, color: "text-slate-700", bg: "bg-slate-50", fmt: false },
                ].map(k => (
                    <GlassCard key={k.label} className={cn("p-5 border-none", k.bg)}>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{k.label}</p>
                        <p className={cn("text-2xl font-black mt-2", k.color)}>
                            {k.fmt === false ? k.value : formatCurrency(k.value as number)}
                        </p>
                    </GlassCard>
                ))}
            </div>

            {/* Filtros */}
            <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar OC, fornecedor ou nota fiscal..."
                        className="input-glass pl-11 h-11"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="select-glass text-xs font-bold h-11 w-40"
                    >
                        <option>Todos os status</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                    <input 
                        type="date" 
                        value={dataInicio} 
                        onChange={e => setDataInicio(e.target.value)}
                        className="input-glass text-xs h-11 w-32" 
                    />
                    <input 
                        type="date" 
                        value={dataFim} 
                        onChange={e => setDataFim(e.target.value)}
                        className="input-glass text-xs h-11 w-32" 
                    />
                </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Nº / Ordem</th>
                                <th className="px-6 py-4">Fornecedor</th>
                                <th className="px-6 py-4">Data Compra</th>
                                <th className="px-6 py-4">Vencimento</th>
                                <th className="px-6 py-4">Itens</th>
                                <th className="px-6 py-4 text-right">Valor Total</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Origem</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <div className="h-8 w-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                                            <p className="mt-2 font-bold uppercase text-[10px]">Sincronizando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-20 text-center text-slate-400">
                                        <ShoppingCart size={40} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-bold text-slate-700">Nenhuma compra encontrada</p>
                                        <Link href="/compras/nova" className="text-brand-500 text-xs font-bold hover:underline mt-2 inline-block">
                                            Criar primeira compra →
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(compra => (
                                    <tr key={compra.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-black text-[#1E40AF] tracking-tight">
                                                OC-{String(compra.numero).padStart(3, '0')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {compra.fornecedor_nome || "Diverso"}
                                        </td>
                                        <td 
                                            className="px-6 py-4 text-slate-500 text-xs font-medium cursor-help"
                                            title={`Registrado em: ${formatDateTime(compra.created_at)}`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {formatDate(compra.data_compra)}
                                                <Info size={10} className="text-slate-300" />
                                            </div>
                                        </td>
                                        <td className={cn(
                                            "px-6 py-4 text-xs font-bold",
                                            isVencido(compra.data_vencimento, compra.status) ? "text-red-500" : "text-slate-500"
                                        )}>
                                            {compra.data_vencimento ? formatDate(compra.data_vencimento) : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs font-bold">
                                            {compra.compra_itens?.[0]?.count || 0} ITENS
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800">
                                            {formatCurrency(compra.valor_total)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={compra.status} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <OrigemBadge origem={compra.origem} />
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link 
                                                href={`/compras/${compra.id}`} 
                                                className="p-2 text-brand-500 hover:bg-brand-50 rounded-xl transition-all inline-block"
                                            >
                                                <Eye size={16} />
                                            </Link>
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
