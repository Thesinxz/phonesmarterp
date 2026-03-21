"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
    Plus, Search, Filter, Package, AlertTriangle, Box, DollarSign, 
    Edit, Trash2, Smartphone, Headphones, Wrench, ChevronDown, 
    Download, FileText, Printer, Settings, CheckSquare, Layers
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { 
    GlassCard, PageHeader, EmptyState, SearchInput, 
    ConfirmDialog, useConfirmDialog 
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { searchPartsByModel, type PartSearchResult } from "@/app/actions/parts";
import { bulkUpdateCatalogItems, deleteCatalogItem, getCatalogItems } from "@/services/catalog";
import { StockBadge } from "@/components/estoque/StockBadge";
import { CategorySelector } from "@/components/catalog/CategorySelector";
import { BrandSelector } from "@/components/catalog/BrandSelector";
import { PricingSegmentSelector } from "@/components/catalog/PricingSegmentSelector";

interface Props {
    initialItems: any[];
    initialBrands: any[];
    initialUnits: any[];
    initialProductTypes: any[];
    initialPricingSegments: any[];
    initialUnitStocks: any[];
    empresaId: string;
    profileId: string;
}

export function EstoqueListaClient({
    initialItems,
    initialBrands,
    initialUnits,
    initialProductTypes,
    initialPricingSegments,
    initialUnitStocks,
    empresaId,
    profileId
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [items, setItems] = useState<any[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const { confirm, Dialog } = useConfirmDialog();
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTab, setActiveTab] = useState("todos"); // todos, celular, acessorio, peca
    const [brandFilter, setBrandFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("todos"); // todos, in_stock, low_stock, out_of_stock
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const PAGE_SIZE = 50;
    
    // Metadata from props (might update if needed, but mostly static)
    const [brands] = useState(initialBrands);
    const [units] = useState(initialUnits);
    const [unitStocks, setUnitStocks] = useState(initialUnitStocks);
    const [productTypes] = useState(initialProductTypes);
    const [pricingSegments] = useState(initialPricingSegments);

    const [selectedUnitId, setSelectedUnitId] = useState("todos");
    const [isModelSearch, setIsModelSearch] = useState(false);
    const [partResults, setPartResults] = useState<PartSearchResult[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelectItem = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length && items.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(item => item.id));
        }
    };

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

    const MODEL_TRIGGERS = [
        'iphone', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco',
        'motorola', 'moto', 'realme', 'lg', 'asus', 'nokia'
    ];

    function detectSearchType(input: string): 'model' | 'name' {
        const lower = input.toLowerCase();
        return MODEL_TRIGGERS.some(t => lower.includes(t)) ? 'model' : 'name';
    }

    const loadData = async (background = false) => {
        if (!empresaId) return;
        if (!background) setLoading(true);
        setIsModelSearch(false);
        setPartResults([]);

        try {
            const searchType = detectSearchType(debouncedSearch);

            if (searchType === 'model' && (activeTab === 'peca' || activeTab === 'todos') && debouncedSearch.length > 2) {
                setIsModelSearch(true);
                const results = await searchPartsByModel(empresaId, debouncedSearch);
                setPartResults(results);
            }

            const result = await getCatalogItems(empresaId, {
                search: debouncedSearch,
                item_type: activeTab,
                brand_id: brandFilter || undefined,
                category_id: categoryFilter || undefined,
                stock_status: stockFilter !== 'todos' ? stockFilter : undefined,
                page: currentPage,
                pageSize: PAGE_SIZE,
            });
            
            const data = result.items || result;
            setItems(data as any[]);
            setTotalItems(result.total || (data as any[]).length);
        } catch (error) {
            console.error("Error loading catalogue:", error);
            toast.error("Erro ao carregar estoque.");
        } finally {
            if (!background) setLoading(false);
        }
    }

    useEffect(() => {
        // Skip first load if filters are default and page is 1
        if (debouncedSearch === "" && activeTab === "todos" && brandFilter === "" && categoryFilter === "" && stockFilter === "todos" && currentPage === 1) return;
        loadData();
        setSelectedIds([]);
    }, [debouncedSearch, activeTab, brandFilter, categoryFilter, stockFilter, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, activeTab, brandFilter, categoryFilter, stockFilter]);

    const handleDelete = async (id: string) => {
        const ok = await confirm(
            "Excluir item",
            "Esta ação é permanente e não pode ser desfeita.",
            "danger"
        );
        if (!ok) return;
        try {
            await deleteCatalogItem(id);
            toast.success("Item excluído!");
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        const ok = await confirm(
            `Excluir ${selectedIds.length} itens`,
            `Você tem certeza que deseja excluir ${selectedIds.length} itens permanentemente?`,
            "danger"
        );
        if (!ok) return;
        
        setIsDeletingBulk(true);
        try {
            await Promise.all(selectedIds.map(id => deleteCatalogItem(id)));
            toast.success(`${selectedIds.length} itens excluídos com sucesso!`);
            setSelectedIds([]);
            loadData();
        } catch (error: any) {
            toast.error("Erro ao excluir alguns itens.");
            console.error(error);
        } finally {
            setIsDeletingBulk(false);
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

    const totalCostValue = useMemo(() => {
        if (selectedUnitId === 'todos') return items.reduce((acc, it) => acc + ((it.cost_price || 0) * (it.stock_qty || 0)), 0);
        return items.reduce((acc, it) => {
            const us = unitStocks.find(s => s.unit_id === selectedUnitId && s.catalog_item_id === it.id);
            return acc + ((it.cost_price || 0) * (us?.qty || 0));
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
        link.setAttribute("download", `estoque-${empresaId || 'erp'}-${new Date().toISOString().split('T')[0]}.csv`);
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
            <PageHeader
                title="Estoque"
                subtitle="Catálogo unificado de produtos e peças"
                badge={{ label: totalItemsCount.toString() }}
                actions={[
                    ...(selectedIds.length > 0 ? [{
                        label: `Excluir (${selectedIds.length})`,
                        onClick: handleBulkDelete,
                        variant: "danger" as const,
                        icon: <Trash2 size={18} />
                    }] : []),
                    {
                        label: "Exportar",
                        onClick: () => exportToCSV(),
                        variant: "secondary" as const,
                        icon: <Download size={18} />
                    },
                    {
                        label: "Lista de Preços",
                        href: "/marketing/lista-precos",
                        variant: "secondary" as const,
                        icon: <FileText size={18} />
                    },
                    {
                        label: "Nova Peça",
                        href: "/estoque/peca/nova",
                        variant: "secondary" as const,
                        icon: <Wrench size={18} />
                    },
                    {
                        label: "Novo Item",
                        href: "/estoque/novo",
                        icon: <Plus size={18} />
                    }
                ]}
            />

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 w-full">
                <GlassCard className="p-3 sm:p-4 bg-brand-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-brand-600">
                        <Package size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Total Itens</p>
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
                <GlassCard className="p-3 sm:p-4 bg-slate-50/20">
                    <div className="flex items-center gap-1.5 mb-2 text-slate-600">
                        <DollarSign size={14} className="shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">Valor (Custo)</p>
                    </div>
                    <p className="text-lg sm:text-xl font-black text-slate-900 truncate">
                        {loading ? "..." : (totalCostValue / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
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
            <GlassCard className="p-4 flex flex-col gap-4 w-full shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Buscar produto ou modelo (ex: iPhone 13)..."
                        className="flex-1"
                        loading={loading && !!searchTerm}
                    />

                    <div className="w-full md:w-64">
                        <select 
                            value={selectedUnitId} 
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            className="w-full h-[46px] bg-white border border-slate-200 rounded-2xl px-4 text-xs font-black text-slate-700 focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                        >
                            <option value="todos">Todas as Unidades</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full pt-1 border-t border-slate-50">
                    <div className="w-full md:w-auto overflow-x-auto hide-scrollbar">
                        <div className="flex items-center gap-2 min-w-max">
                            {['todos', 'celular', 'acessorio', 'peca'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setActiveTab(t)}
                                    className={cn(
                                        "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        activeTab === t ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}>
                                    {t === 'todos' ? 'Todos' : t === 'celular' ? 'Celulares' : t === 'acessorio' ? 'Acessórios' : 'Peças'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {(activeTab === 'todos' || activeTab === 'celular') && (
                            <select 
                                className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-brand-500/20 outline-none w-1/2 md:w-40" 
                                value={brandFilter} 
                                onChange={e => setBrandFilter(e.target.value)}
                            >
                                <option value="">Todas Marcas</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <div className="w-full md:w-56">
                            <CategorySelector
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                itemType={activeTab !== 'todos' ? activeTab : undefined}
                                placeholder="Todas Categorias"
                            />
                        </div>
                        <select 
                            className="h-[46px] bg-slate-50 border border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-brand-500/20 outline-none flex-1 md:w-44" 
                            value={stockFilter} 
                            onChange={e => setStockFilter(e.target.value)}
                        >
                            <option value="todos">Todo o Estoque</option>
                            <option value="in_stock">Em Estoque</option>
                            <option value="low_stock">Estoque Baixo</option>
                            <option value="out_of_stock">Sem Estoque</option>
                        </select>
                    </div>
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
                        <EmptyState
                            title="Nenhum item encontrado"
                            description="Tente ajustar os filtros ou cadastre um novo produto."
                            action={{ label: "Novo Item", href: "/estoque/novo" }}
                        />
                    ) : (
                        items.map(item => (
                            <Link
                                key={item.id}
                                href={`/estoque/${item.id}`}
                                className={cn(
                                    "bg-white/80 p-4 border rounded-2xl flex items-center justify-between shadow-sm transition-all block",
                                    selectedIds.includes(item.id) ? "border-brand-300 bg-brand-50/30" : "border-slate-100"
                                )}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.includes(item.id)}
                                        onChange={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                                        onClick={(e) => e.preventDefault()}
                                        className="w-5 h-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                        {getTypeIcon(item.item_type)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-slate-800 text-sm truncate">{item.name}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase truncate max-w-[80px]">
                                                {item.item_type === 'peca' ? item.part_type || 'Peça' : item.brand?.name || item.item_type}
                                            </span>
                                            <StockBadge 
                                                qty={selectedUnitId === 'todos' ? (item.stock_qty || 0) : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === item.id)?.qty || 0)}
                                                alertQty={item.stock_alert_qty}
                                            />
                                        </div>
                                        <div className="flex flex-col items-end mt-1">
                                            <span className="text-sm font-bold text-emerald-600">
                                                {item.sale_price > 0 
                                                    ? ((item.sale_price || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                    : <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">Aguardando Precificação</span>
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.preventDefault()}>
                                    <Link href={`/estoque/${item.id}`} onClick={(e) => e.stopPropagation()} className="p-2.5 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-xl transition-all">
                                        <Edit size={16} />
                                    </Link>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id); }} className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </Link>
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
                                    <th className="px-6 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={items.length > 0 && selectedIds.length === items.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4">{(activeTab === 'todos' || activeTab === 'celular') ? 'Produto / Nome' : activeTab === 'peca' ? 'Peça' : 'Produto'}</th>
                                    {(activeTab === 'todos' || activeTab === 'celular' || activeTab === 'peca') && <th className="px-6 py-4">Tipo</th>}
                                    {(activeTab === 'todos' || activeTab === 'celular') && <th className="px-6 py-4">Marca</th>}
                                    {activeTab === 'celular' && <th className="px-6 py-4">Cond / Grade</th>}
                                    {(activeTab === 'acessorio' || activeTab === 'peca') && <th className="px-6 py-4">Compatibilidade</th>}
                                    {activeTab === 'peca' && <th className="px-6 py-4">Qualidade</th>}
                                    <th className="px-6 py-4 text-right">Custo</th>
                                    <th className="px-6 py-4 text-right">Venda</th>
                                    <th className="px-6 py-4 text-right">Atacado (R$)</th>
                                    <th className="px-6 py-4 text-center">Estoque</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">Carregando...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={10}>
                                            <EmptyState
                                                title="Nenhum item encontrado"
                                                description="Tente ajustar os filtros ou cadastre um novo produto."
                                                action={{ label: "Novo Item", href: "/estoque/novo" }}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr
                                            key={item.id}
                                            onClick={() => router.push(`/estoque/${item.id}`)}
                                            className={cn(
                                                "hover:bg-slate-50/50 group transition-colors cursor-pointer",
                                                selectedIds.includes(item.id) && "bg-brand-50/20"
                                            )}
                                        >
                                            <td className="px-6 py-3">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={(e) => { e.stopPropagation(); toggleSelectItem(item.id); }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                            </td>
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
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md uppercase inline-block w-fit">
                                                            {item.item_type === 'peca'
                                                                ? (item.part_type || 'Peça')
                                                                : item.item_type === 'celular' ? 'Celular' : 'Acessório'}
                                                        </span>
                                                        {item.quality && (
                                                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase inline-block w-fit">
                                                                {item.quality}
                                                            </span>
                                                        )}
                                                        {item.subcategory && (
                                                            <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                                                                {item.subcategory}
                                                            </span>
                                                        )}
                                                    </div>
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
                                            <td className="px-6 py-3 text-right whitespace-nowrap">
                                                {((item as any).wholesale_price_brl > 0) ? (
                                                     <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                                        R$ {((item as any).wholesale_price_brl / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                     </span>
                                                ) : (item as any).sale_price_usd > 0 ? (
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
                                                    <StockBadge 
                                                        qty={selectedUnitId === 'todos' ? (item.stock_qty || 0) : (unitStocks.find(us => us.unit_id === selectedUnitId && us.catalog_item_id === item.id)?.qty || 0)}
                                                        alertQty={item.stock_alert_qty}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/estoque/${item.id}`} onClick={(e) => e.stopPropagation()} className="p-2 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg">
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

                {/* Paginação */}
                {totalItems > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-slate-400 font-medium">
                            Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalItems)}–
                            {Math.min(currentPage * PAGE_SIZE, totalItems)} de {totalItems} itens
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                            >
                                ← Anterior
                            </button>
                            <span className="text-xs font-bold text-slate-500 px-2">
                                {currentPage} / {Math.ceil(totalItems / PAGE_SIZE)}
                            </span>
                            <button
                                disabled={currentPage >= Math.ceil(totalItems / PAGE_SIZE)}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                            >
                                Próxima →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Barra Flutuante de Ações em Massa */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 duration-300">
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 border border-slate-700/50 backdrop-blur-md">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecionados</span>
                            <span className="text-sm font-black text-white">{selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'}</span>
                        </div>
                        
                        <div className="h-8 w-px bg-slate-700/50" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all text-white"
                            >
                                <Settings size={16} /> Configurar
                            </button>
                            
                            <button
                                onClick={() => router.push(`/estoque/etiquetas?ids=${selectedIds.join(',')}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold transition-all text-white"
                            >
                                <Printer size={16} /> Etiquetas
                            </button>

                            <button
                                onClick={() => handleBulkDelete()}
                                disabled={isDeletingBulk}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold transition-all disabled:opacity-50 text-white"
                            >
                                {isDeletingBulk ? 'Excluindo...' : (
                                    <>
                                        <Trash2 size={16} /> Excluir
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-4 py-2 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkModal && (
                <BulkUpdateModal
                    selectedIds={selectedIds}
                    brands={brands}
                    pricingSegments={pricingSegments}
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={() => {
                        setShowBulkModal(false);
                        setSelectedIds([]);
                        loadData();
                    }}
                />
            )}

            {Dialog}
        </div>
    );
}

function BulkUpdateModal({ selectedIds, brands, pricingSegments, onClose, onSuccess }: any) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        item_type: "",
        brand_id: "",
        pricing_segment_id: ""
    });

    async function handleUpdate() {
        if (selectedIds.length === 0) return;
        if (!form.item_type && !form.brand_id && !form.pricing_segment_id) {
            toast.error("Selecione pelo menos um campo para atualizar");
            return;
        }

        setLoading(true);
        try {
            const updates: any = {};
            if (form.item_type) updates.item_type = form.item_type;
            if (form.brand_id) updates.brand_id = form.brand_id;
            if (form.pricing_segment_id) updates.pricing_segment_id = form.pricing_segment_id;

            await bulkUpdateCatalogItems(selectedIds, updates);
            toast.success("Atualização em massa concluída!");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Erro na atualização em massa");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Configuração em Massa</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedIds.length} itens selecionados</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Tipo de Produto</label>
                            <select 
                                value={form.item_type}
                                onChange={e => setForm({...form, item_type: e.target.value})}
                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            >
                                <option value="">Não alterar</option>
                                <option value="celular">Celular</option>
                                <option value="acessorio">Acessório</option>
                                <option value="peca">Peça</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Marca</label>
                            <BrandSelector
                                value={form.brand_id}
                                onChange={id => setForm({...form, brand_id: id})}
                                placeholder="Não alterar"
                                allowCreate
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Segmento de Preço</label>
                            <PricingSegmentSelector
                                value={form.pricing_segment_id}
                                onChange={id => setForm({...form, pricing_segment_id: id})}
                                placeholder="Não alterar"
                                allowCreate
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="flex-[2] h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
                        >
                            {loading ? "Salvando..." : "Aplicar Mudanças"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
