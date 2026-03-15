"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    RefreshCw, 
    Calendar as CalendarIcon, 
    Download, 
    Search, 
    Smartphone, 
    ArrowUpRight, 
    DollarSign,
    Package,
    Loader2,
    Filter
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { getTradeIns } from "@/app/actions/trade-in";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { toast } from "sonner";

export default function TradeInReportPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tradeIns, setTradeIns] = useState<any[]>([]);
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");
    const [search, setSearch] = useState("");

    const loadData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const data = await getTradeIns({
                tenantId: profile.empresa_id,
                unitId: profile.unit_id || undefined,
                dateFrom: filterStart || undefined,
                dateTo: filterEnd || undefined
            });
            setTradeIns(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar trade-ins.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.empresa_id, filterStart, filterEnd]);

    const filteredTradeIns = useMemo(() => {
        if (!search) return tradeIns;
        const s = search.toLowerCase();
        return tradeIns.filter(t => 
            t.device_name?.toLowerCase().includes(s) || 
            t.device_imei?.includes(s) || 
            t.venda?.numero?.toString().includes(s) ||
            t.cliente?.nome?.toLowerCase().includes(s)
        );
    }, [tradeIns, search]);

    const stats = useMemo(() => {
        const totalValue = filteredTradeIns.reduce((acc, t) => acc + (t.applied_value || 0), 0);
        const avgValue = filteredTradeIns.length > 0 ? totalValue / filteredTradeIns.length : 0;
        const directStock = filteredTradeIns.filter(t => t.destination === 'estoque_direto').length;
        const assistencia = filteredTradeIns.filter(t => t.destination === 'assistencia').length;

        return {
            totalCount: filteredTradeIns.length,
            totalValue,
            avgValue,
            directStock,
            assistencia
        };
    }, [filteredTradeIns]);

    const exportToCSV = () => {
        if (!filteredTradeIns.length) return;
        const headers = ["Data", "Aparelho", "IMEI", "Condição", "Valor Avaliado", "Valor Aplicado", "Destino", "Venda #", "Cliente"];
        const rows = filteredTradeIns.map(t => [
            new Date(t.created_at).toLocaleDateString(),
            t.device_name,
            t.device_imei || "-",
            t.device_condition,
            (t.evaluated_value / 100).toFixed(2),
            (t.applied_value / 100).toFixed(2),
            t.destination === 'estoque_direto' ? 'Estoque' : 'Assistência',
            t.venda?.numero || "-",
            t.cliente?.nome || "Consumidor Final"
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `relatorio-tradeins-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    };

    return (
        <div className="space-y-6 page-enter pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Dashboard Trade-in</h1>
                        <p className="text-slate-500 text-sm">Controle de aparelhos recebidos na troca.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={exportToCSV}
                        disabled={filteredTradeIns.length === 0}
                        className="bg-white h-12 px-6 rounded-2xl border border-slate-200 text-slate-600 flex items-center justify-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <Download size={20} /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-5 border-emerald-100 bg-emerald-50/20">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Smartphone size={12} /> Total Recebido
                    </p>
                    <p className="text-3xl font-black text-slate-800">{stats.totalCount}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Aparelhos na troca</p>
                </GlassCard>

                <GlassCard className="p-5 border-blue-100 bg-blue-50/20">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <DollarSign size={12} /> Valor Aplicado
                    </p>
                    <p className="text-3xl font-black text-slate-800">
                        R$ {(stats.totalValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Total em descontos</p>
                </GlassCard>

                <GlassCard className="p-5 border-amber-100 bg-amber-50/20">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <ArrowUpRight size={12} /> Ticket Médio
                    </p>
                    <p className="text-3xl font-black text-slate-800">
                        R$ {(stats.avgValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Por aparelho</p>
                </GlassCard>

                <GlassCard className="p-5 border-indigo-100 bg-indigo-50/20">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Package size={12} /> Destinos
                    </p>
                    <div className="flex gap-4 items-end">
                        <div>
                            <p className="text-2xl font-black text-slate-800">{stats.directStock}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Estoque</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <div>
                            <p className="text-2xl font-black text-slate-800">{stats.assistencia}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">OS (Assis.)</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Filters */}
            <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    <input
                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 text-sm font-medium"
                        placeholder="Buscar por aparelho, IMEI, venda ou cliente..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="bg-slate-50 px-2 rounded-2xl border border-slate-100 h-12 flex items-center min-w-[220px]">
                    <DateRangeFilter
                        onChange={(start, end) => {
                            setFilterStart(start || "");
                            setFilterEnd(end || "");
                        }}
                    />
                </div>
            </GlassCard>

            {/* Table */}
            <GlassCard className="p-0 overflow-hidden shadow-xl border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Aparelho / IMEI</th>
                                <th className="px-6 py-4">Condição</th>
                                <th className="px-6 py-4">Valor Aplicado</th>
                                <th className="px-6 py-4">Venda</th>
                                <th className="px-6 py-4">Destino</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-slate-300" size={32} />
                                    </td>
                                </tr>
                            ) : filteredTradeIns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredTradeIns.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{t.device_name}</span>
                                                <span className="text-[10px] font-mono text-slate-400">{t.device_imei || "S/ IMEI"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter",
                                                t.device_condition === 'otimo' ? "bg-emerald-50 text-emerald-600" :
                                                t.device_condition === 'bom' ? "bg-blue-50 text-blue-600" :
                                                t.device_condition === 'regular' ? "bg-amber-50 text-amber-600" :
                                                "bg-red-50 text-red-600"
                                            )}>
                                                {t.device_condition}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-emerald-600">
                                                R$ {(t.applied_value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {t.venda ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">Pedido #{t.venda.numero || t.venda.id.substring(0,6)}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">{t.cliente?.nome || "Consumidor Final"}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Pendente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {t.destination === 'estoque_direto' ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                                                        <Package size={12} className="text-slate-400" /> Estoque
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-brand-600 font-bold bg-brand-50 px-2 py-1 rounded-lg">
                                                        <RefreshCw size={12} className="text-brand-400 animate-spin-slow" /> OS
                                                    </div>
                                                )}
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
