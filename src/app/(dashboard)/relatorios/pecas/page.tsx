"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Package, 
    Calendar as CalendarIcon, 
    Filter, 
    Download, 
    TrendingUp, 
    AlertCircle, 
    Building2,
    DollarSign,
    ClipboardList,
    Search
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getPartsConsumptionReport } from "@/app/actions/parts";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";

export default function RelatorioPecasPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedUnit, setSelectedUnit] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadUnits = async () => {
            if (!profile?.empresa_id) return;
            const supabase = createClient();
            const { data: unitsData } = await (supabase.from('units') as any)
                .select('id, name, has_repair_lab, has_parts_stock, has_sales')
                .eq('empresa_id', profile.empresa_id)
                .eq('is_active', true)
                .order('name');
            if (unitsData) setUnits(unitsData);
        };
        if (profile) loadUnits();
    }, [profile]);

    const loadReport = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const result = await getPartsConsumptionReport(
                profile.empresa_id,
                startDate + "T00:00:00Z",
                endDate + "T23:59:59Z",
                { unitId: selectedUnit, type: selectedType }
            );
            setData(result);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, [startDate, endDate, selectedUnit, selectedType, profile]);

    const filteredData = useMemo(() => {
        return data.filter(item => 
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const stats = useMemo(() => {
        const top5 = [...data].sort((a, b) => b.saidasOS + b.saidasVenda - (a.saidasOS + a.saidasVenda)).slice(0, 5);
        const zerado = data.filter(d => d.saldo <= 0).length;
        // Simulação de valor total (poderia ser calculado se tivéssemos o preço médio na query)
        const valorTotalOS = 0; 
        
        return { top5, zerado, valorTotalOS };
    }, [data]);

    const exportToCSV = () => {
        const headers = ["Peça", "Tipo", "Unidade", "Entradas", "Saídas OS", "Saídas Venda", "Saldo"];
        const rows = filteredData.map(d => [
            d.name,
            d.type,
            d.unit,
            d.entradas,
            d.saidasOS,
            d.saidasVenda,
            d.saldo
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `consumo-pecas-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Relatório de Consumo de Peças</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Visão detalhada de movimentações por unidade</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="bg-indigo-600 h-10 px-4 rounded-xl text-white flex items-center justify-center gap-2 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-5 border-white/40">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-500">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Top 5 Consumidas</p>
                            <p className="text-xs text-slate-500">Mais usadas em OS/Vendas</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {stats.top5.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-700 font-medium truncate max-w-[150px]">{item.name}</span>
                                <span className="text-slate-400 font-black">{item.saidasOS + item.saidasVenda} un</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="p-5 border-white/40">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-2xl bg-red-50 text-red-500">
                            <AlertCircle size={22} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.zerado}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Peças Zeradas</p>
                    <p className="text-[10px] text-slate-400 mt-1">Total de itens sem estoque no período</p>
                </GlassCard>

                <GlassCard className="p-5 border-white/40">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-500">
                            <DollarSign size={22} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">---</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Valor em OS</p>
                    <p className="text-[10px] text-slate-400 mt-1">Consumo total valorizado (Em breve)</p>
                </GlassCard>
            </div>

            {/* Filters */}
            <GlassCard className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2 flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Início</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Fim</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Unidade</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <select 
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">Todas</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} {u.has_parts_stock ? "📦" : ""} {u.has_repair_lab ? "🔧" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Tipo Mov.</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <select 
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">Todos</option>
                                <option value="entrada">Só Entradas</option>
                                <option value="saida_os">Só Saídas OS</option>
                                <option value="saida_venda">Só Saídas Venda</option>
                            </select>
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Buscar Peça</label>
                        <Search className="absolute left-3 top-[34px] text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nome da peça..."
                            className="w-full pl-9 p-2 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Main Table */}
            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                                <th className="px-6 py-4">Peça / Tipo</th>
                                <th className="px-6 py-4">Unidade</th>
                                <th className="px-6 py-4 text-center">Entradas</th>
                                <th className="px-6 py-4 text-center">Saídas OS</th>
                                <th className="px-6 py-4 text-center">Vendas</th>
                                <th className="px-6 py-4 text-right">Saldo Período</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 italic">Carregando dados...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 italic">Nenhum dado encontrado para o período.</td>
                                </tr>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <tr key={`${item.id}-${item.unit}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-tight">{item.type || 'peca'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Building2 size={12} />
                                                <span className="text-xs">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-emerald-600 font-bold">{item.entradas > 0 ? `+${item.entradas}` : '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-red-500 font-medium">
                                            {item.saidasOS > 0 ? `-${item.saidasOS}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center text-red-500 font-medium">
                                            {item.saidasVenda > 0 ? `-${item.saidasVenda}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                "px-2 py-1 rounded-lg font-black text-xs",
                                                item.saldo > 0 ? "bg-emerald-50 text-emerald-600" :
                                                item.saldo < 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400"
                                            )}>
                                                {item.saldo > 0 ? `+${item.saldo}` : item.saldo}
                                            </span>
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
