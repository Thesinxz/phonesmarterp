"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Package, AlertTriangle, Box, DollarSign, Edit, Trash2, Smartphone, Headphones, Wrench, ChevronDown, Download, FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CatalogItem } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { getCatalogItems, deleteCatalogItem } from "@/services/catalog";
import { createClient } from "@/lib/supabase/client";
import { searchPartsByModel, type PartSearchResult } from "@/app/actions/parts";

export default function EstoquePage() {
    const { profile } = useAuth();
    const searchParams = useSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTab, setActiveTab] = useState("todos"); // todos, celular, acessorio, peca
    const [brandFilter, setBrandFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("todos"); // todos, in_stock, low_stock, out_of_stock
    const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [unitStocks, setUnitStocks] = useState<any[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState("todos");
    const [isModelSearch, setIsModelSearch] = useState(false);
    const [partResults, setPartResults] = useState<PartSearchResult[]>([]);

    useEffect(() => {
        const filter = searchParams.get('filter');
        if (filter === 'baixo_estoque') {
            setStockFilter('low_stock');
        }
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const fetchBrandsAndUnits = async () => {
            const supabase = createClient();
            const [bRes, uRes] = await Promise.all([
                supabase.from("brands").select("id, name").eq("empresa_id", profile.empresa_id).order("name"),
                supabase.from("units").select("id, name").eq("empresa_id", profile.empresa_id).eq("is_active", true)
            ]);
            if (bRes.data) setBrands(bRes.data as any);
            if (uRes.data) setUnits(uRes.data as any);
        }
        fetchBrandsAndUnits();
    }, [profile?.empresa_id]);

    const MODEL_TRIGGERS = [
        'iphone', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco',
        'motorola', 'moto', 'realme', 'lg', 'asus', 'nokia'
    ];

    function detectSearchType(input: string): 'model' | 'name' {
        const lower = input.toLowerCase();
        // Se começar com uma marca ou contiver marcas conhecidas + algo mais, assume modelo
        return MODEL_TRIGGERS.some(t => lower.includes(t)) ? 'model' : 'name';
    }

    const loadData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        setIsModelSearch(false);
        setPartResults([]);

        try {
            const searchType = detectSearchType(debouncedSearch);

            if (searchType === 'model' && (activeTab === 'peca' || activeTab === 'todos') && debouncedSearch.length > 2) {
                setIsModelSearch(true);
                const results = await searchPartsByModel(profile.empresa_id, debouncedSearch);
                setPartResults(results);
                // Para manter compatibilidade com o resto da UI, vamos "mentir" um pouco no items
                // Mas o ideal é tratar separadamente no render
            }

            const data = await getCatalogItems(profile.empresa_id, {
                search: debouncedSearch,
                item_type: activeTab,
                brand_id: brandFilter || undefined,
                stock_status: stockFilter !== 'todos' ? stockFilter : undefined
            });
            setItems(data);
            
            // Buscar estoques por unidade para os itens retornados
            if (data.length > 0) {
                const supabase = createClient();
                const { data: stocks } = await supabase
                    .from("unit_stock")
                    .select("*")
                    .in("catalog_item_id", (data as any[]).map(i => i.id));
                if (stocks) setUnitStocks(stocks);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar estoque.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [profile?.empresa_id, debouncedSearch, activeTab, brandFilter, stockFilter]);

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este item permanentemente?")) return;
        try {
            await deleteCatalogItem(id);
            toast.success("Item excluído!");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir");
        }
    };

    const totalItemsCount = useMemo(() => {
        if (selectedUnitId === 'todos') return (items as any[]).reduce((acc, it) => acc + (it.stock_qty || 0), 0);
        return (unitStocks as any[])
            .filter(us => us.unit_id === selectedUnitId && (items as any[]).some(i => i.id === us.catalog_item_id))
            .reduce((acc, us) => acc + us.qty, 0);
    }, [items, unitStocks, selectedUnitId]);

    const totalValue = useMemo(() => {
        if (selectedUnitId === 'todos') return items.reduce((acc, it) => acc + ((it.sale_price || 0) * (it.stock_qty || 0)), 0);
        return items.reduce((acc, it) => {
            const us = unitStocks.find(s => s.unit_id === selectedUnitId && s.catalog_item_id === it.id);
            return acc + ((it.sale_price || 0) * (us?.qty || 0));
        }, 0);
    }, [items, unitStocks, selectedUnitId]);

    const lowStockCount = useMemo(() => {
        return (items as any[]).filter(it => {
            const qty = selectedUnitId === 'todos' ? it.stock_qty : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === it.id)?.qty || 0);
            return qty > 0 && qty <= (it.stock_alert_qty || 1);
        }).length;
    }, [items, unitStocks, selectedUnitId]);

    const outOfStockCount = useMemo(() => {
        return (items as any[]).filter(it => {
            const qty = selectedUnitId === 'todos' ? it.stock_qty : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === it.id)?.qty || 0);
            return qty <= 0;
        }).length;
    }, [items, unitStocks, selectedUnitId]);

    const exportToCSV = () => {
        if (!items.length) return;
        
        const headers = ["Nome", "Tipo", "Qualidade", "Modelos Compatíveis", "Estoque Total", "Estoque Lojas", "Custo", "Venda"];
        const rows = items.map(item => {
            const itemStocks = unitStocks.filter(us => us.catalog_item_id === item.id);
            const stocksStr = itemStocks.map(us => {
                const unit = units.find(u => u.id === us.unit_id);
                return `${unit?.name || 'Unidade'}: ${us.qty}`;
            }).join(' | ');

            return [
                item.name,
                item.item_type,
                item.grade || 'N/A',
                (item.compatible_models || '').replace(/,/g, ';'),
                item.stock_qty,
                stocksStr,
                (item.cost_price / 100).toFixed(2),
                (item.sale_price / 100).toFixed(2)
            ];
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `estoque-${profile?.empresa_id || 'erp'}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTypeIcon = (type: string) => {
        if (type === 'celular') return <Smartphone size={16} className="text-blue-500" />;
        if (type === 'acessorio') return <Headphones size={16} className="text-emerald-500" />;
        return <Wrench size={16} className="text-amber-500" />;
    };

    return (
        <div className="space-y-4 sm:space-y-6 page-enter max-w-7xl mx-auto pb-20 w-full overflow-x-hidden sm:overflow-visible">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        Estoque <span className="text-sm font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{totalItemsCount}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Catálogo unificado de produtos e peças</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => exportToCSV()}
                        className="bg-white h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all w-full sm:w-auto"
                    >
                        <Download size={18} /> Exportar
                    </button>
                    <Link 
                        href="/marketing/lista-precos"
                        className="bg-white h-10 px-4 rounded-xl border border-indigo-100 text-indigo-600 flex items-center justify-center gap-2 text-sm font-bold hover:bg-indigo-50 transition-all w-full sm:w-auto"
                    >
                        <FileText size={18} /> Lista de Preços
                    </Link>
                    <Link href="/estoque/novo" className="btn-primary flex-1 sm:flex-initial justify-center">
                        <Plus size={18} /> Novo Item
                    </Link>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                <GlassCard className="p-3 sm:p-4 bg-brand-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-brand-600">
                        <Package size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Total Estoque</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-brand-900 truncate">{totalItemsCount}</p>
                </GlassCard>
                <GlassCard className="p-3 sm:p-4 bg-amber-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-amber-600">
                        <AlertTriangle size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Abaixo Min</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-900 truncate">{lowStockCount}</p>
                </GlassCard>
                <GlassCard className="p-3 sm:p-4 bg-red-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-red-500">
                        <Box size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Sem Estoque</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-red-900 truncate">{outOfStockCount}</p>
                </GlassCard>
                <GlassCard className="p-3 sm:p-4 bg-emerald-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-emerald-600">
                        <DollarSign size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Valor (Venda)</p>
                    </div>
                    <p className="text-lg sm:text-xl font-black text-emerald-900 truncate">
                        {loading ? "..." : (totalValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </GlassCard>
            </div>

            {/* Filtros */}
            <GlassCard className="p-3 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 items-center w-full">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="w-full bg-slate-50 border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium"
                        placeholder="Buscar produto ou modelo (ex: iPhone 13)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full md:w-auto">
                    <select 
                        value={selectedUnitId} 
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        className="w-full input-glass text-xs font-bold md:w-48"
                    >
                        <option value="todos">Todas as Unidades</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                
                <div className="w-full overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-2 min-w-max pb-1 md:pb-0">
                        {['todos', 'celular', 'acessorio', 'peca'].map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={cn(
                                    "px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                                    activeTab === t ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}>
                                {t === 'todos' ? 'Todos' : t === 'celular' ? 'Celulares' : t === 'acessorio' ? 'Acessórios' : 'Peças'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {(activeTab === 'todos' || activeTab === 'celular') && (
                        <select className="input-glass text-xs font-bold w-1/2 md:w-32" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                            <option value="">Todas Marcas</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    <select className="input-glass text-xs font-bold flex-1 md:w-36" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
                        <option value="todos">Todo o Estoque</option>
                        <option value="in_stock">Em Estoque</option>
                        <option value="low_stock">Estoque Baixo</option>
                        <option value="out_of_stock">Sem Estoque</option>
                    </select>
                </div>
            </GlassCard>

            {/* Banner de Busca por Modelo */}
            {isModelSearch && partResults.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Busca por compatibilidade: <span className="text-indigo-600 italic">"{debouncedSearch}"</span></p>
                            <p className="text-xs text-indigo-700 font-medium">Mostrando peças que servem neste modelo de aparelho.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* View Mobile: Cards Empilhados */}
            <div className="block md:hidden">
                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 font-medium">Carregando estoque...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-medium">Nenhum item encontrado.</div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="bg-white/80 p-4 border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                        {getTypeIcon(item.item_type)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-800 text-sm truncate">{item.name}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase truncate max-w-[80px]">
                                                {item.item_type === 'peca' ? item.part_type || 'Peça' : item.brand?.name || item.item_type}
                                            </span>
                                            <span className={cn("text-[10px] font-black rounded px-1.5 py-0.5 whitespace-nowrap", 
                                                (() => {
                                                    const qty = selectedUnitId === 'todos' ? (item.stock_qty || 0) : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === item.id)?.qty || 0);
                                                    return qty > (item.stock_alert_qty || 1) ? "bg-emerald-50 text-emerald-600" :
                                                           qty > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600";
                                                })()
                                            )}>
                                                {selectedUnitId === 'todos' ? (item.stock_qty || 0) : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === item.id)?.qty || 0)} em est.
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end mt-1">
                                            <span className="text-sm font-bold text-emerald-600">
                                                {item.sale_price > 0 
                                                    ? ((item.sale_price || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                    : <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">Aguardando Precificação</span>
                                                }
                                            </span>
                                            {(item as any).sale_price_usd > 0 && (
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded-md mt-0.5">
                                                    $ {((item as any).sale_price_usd / 100).toFixed(2)} Atacado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <Link href={`/estoque/${item.id}`} className="p-2.5 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-xl transition-all">
                                        <Edit size={16} />
                                    </Link>
                                    <button onClick={() => handleDelete(item.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* View Desktop: Tabela de Dados */}
            <div className="hidden md:block">
                <GlassCard className="p-0 overflow-hidden w-full">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50">
                                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                                    <th className="px-6 py-4">{(activeTab === 'todos' || activeTab === 'celular') ? 'Produto / Nome' : activeTab === 'peca' ? 'Peça' : 'Produto'}</th>
                                    {(activeTab === 'todos' || activeTab === 'celular' || activeTab === 'peca') && <th className="px-6 py-4">Tipo</th>}
                                    {(activeTab === 'todos' || activeTab === 'celular') && <th className="px-6 py-4">Marca</th>}
                                    {activeTab === 'celular' && <th className="px-6 py-4">Cond / Grade</th>}
                                    {(activeTab === 'acessorio' || activeTab === 'peca') && <th className="px-6 py-4">Compatibilidade</th>}
                                    {activeTab === 'peca' && <th className="px-6 py-4">Qualidade</th>}
                                    <th className="px-6 py-4 text-right">Custo</th>
                                    <th className="px-6 py-4 text-right">Venda</th>
                                    <th className="px-6 py-4 text-right">Atacado (US$)</th>
                                    <th className="px-6 py-4 text-center">Estoque</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">Carregando...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum item encontrado.</td></tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 group">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                        {getTypeIcon(item.item_type)}
                                                    </div>
                                                    <div className="flex flex-col min-w-[120px]">
                                                        <span className="font-bold text-slate-800 text-xs overflow-hidden text-ellipsis line-clamp-2 leading-tight py-0.5">{item.name}</span>
                                                        {item.sku && <span className="text-[10px] text-slate-400">SKU: {item.sku}</span>}
                                                        {item.imei && <span className="text-[10px] text-slate-400 font-mono">{item.imei}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            {(activeTab === 'todos' || activeTab === 'celular' || activeTab === 'peca') && (
                                                <td className="px-6 py-3">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase">
                                                        {item.item_type === 'peca' ? (item.part_type || 'Peça') : item.item_type}
                                                    </span>
                                                </td>
                                            )}
                                            {(activeTab === 'todos' || activeTab === 'celular') && (
                                                <td className="px-6 py-3 text-xs font-medium text-slate-600">
                                                    {item.brand?.name || '-'}
                                                </td>
                                            )}
                                            {activeTab === 'celular' && (
                                                <td className="px-6 py-3 text-xs text-slate-500">
                                                    {item.condicao ? <span className="capitalize">{item.condicao.replace('_', ' ')}</span> : '-'} 
                                                    {item.grade && <span className="ml-1 bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-bold">{item.grade}</span>}
                                                </td>
                                            )}
                                            {(activeTab === 'acessorio' || activeTab === 'peca') && (
                                                <td className="px-6 py-3 text-[10px] text-slate-500 max-w-[150px] truncate">
                                                    {isModelSearch && partResults.find(p => p.id === item.id) ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {partResults.find(p => p.id === item.id)?.matchedModels.map(m => (
                                                                <span key={m} className="bg-indigo-50 text-indigo-600 px-1 rounded font-bold">{m}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        item.compatible_models || (item.compatible_models_parts ? item.compatible_models_parts.join(', ') : '-')
                                                    )}
                                                </td>
                                            )}
                                            {activeTab === 'peca' && (
                                                <td className="px-6 py-3">
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase">
                                                        {item.quality || '-'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-3 text-right text-xs font-mono text-slate-400">
                                                {((item.cost_price || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                             <td className="px-6 py-3 text-right font-bold text-emerald-600 text-sm">
                                                {item.sale_price > 0 
                                                    ? ((item.sale_price || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                    : <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase tracking-tighter whitespace-nowrap">Aguardando Precificação</span>
                                                }
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {(item as any).sale_price_usd > 0 ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                                            $ {((item as any).sale_price_usd / 100).toFixed(2)}
                                                        </span>
                                                        {(item as any).sale_price_usd_rate > 0 && (
                                                            <span className="text-[9px] text-slate-400 mt-1 font-bold">@ {(item as any).sale_price_usd_rate.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300">---</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {selectedUnitId === 'todos' ? (
                                                        <>
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-lg text-xs font-black",
                                                                (item.stock_qty || 0) > (item.stock_alert_qty || 1) ? "bg-emerald-50 text-emerald-600" :
                                                                (item.stock_qty || 0) > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                                            )}>
                                                                {item.stock_qty || 0}
                                                            </span>
                                                            
                                                            {/* Detalhe por unidade */}
                                                            {units.length > 1 && (
                                                                <div className="flex flex-wrap justify-center gap-1 mt-1">
                                                                    {units.map(unit => {
                                                                        const s = unitStocks.find(us => us.unit_id === unit.id && us.catalog_item_id === item.id);
                                                                        const qty = s?.qty || 0;
                                                                        return (
                                                                            <span key={unit.id} className={cn(
                                                                                "text-[8px] px-1 py-0.5 rounded font-bold uppercase",
                                                                                qty > 0 ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-400"
                                                                            )} title={unit.name}>
                                                                                {unit.name.substring(0, 3)}: {qty}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        (() => {
                                                            const qty = unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === item.id)?.qty || 0;
                                                            return (
                                                                <span className={cn(
                                                                    "px-3 py-1 rounded-lg text-xs font-black",
                                                                    qty > (item.stock_alert_qty || 1) ? "bg-emerald-50 text-emerald-600" :
                                                                    qty > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                                                )}>
                                                                    {qty} un
                                                                </span>
                                                            );
                                                        })()
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/estoque/${item.id}`} className="p-2 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg">
                                                        <Trash2 size={16} />
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
        </div>
    );
}
