"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Filter,
    Package,
    AlertTriangle,
    BarChart3,
    Edit,
    Trash2,
    Barcode,
    Hash,
    Tag,
    EyeOff,
    Printer,
    Target,
    CheckSquare,
    Square
} from "lucide-react";
import { getProdutos, type ProdutoFilters } from "@/services/estoque";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { type Produto } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

export default function EstoquePage() {
    const { profile } = useAuth();
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<ProdutoFilters>({});
    const [categoriaFilter, setCategoriaFilter] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadProdutos();
        }
    }, [filters, currentPage, profile?.empresa_id]);

    useEffect(() => {
        if (!profile?.empresa_id) return;

        const supabase = createClient();
        const channelId = `stock-realtime-${profile.empresa_id}`;

        const channel = supabase
            .channel(channelId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "produtos",
                    filter: `empresa_id=eq.${profile.empresa_id}`
                },
                (payload) => {
                    console.log("Realtime Estoque:", payload.eventType, payload);

                    if (payload.eventType === 'UPDATE') {
                        setProdutos(current => current.map(p =>
                            p.id === payload.new.id ? { ...p, ...payload.new } : p
                        ));
                    } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                        loadProdutos();
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Realtime Stock Status [${channelId}]:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.empresa_id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: searchTerm }));
            setCurrentPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    async function loadProdutos() {
        setLoading(true);
        try {
            const response = await getProdutos(currentPage, 50, filters);
            setProdutos(response.data);
            setTotalPages(response.totalPages);
            setTotalItems(response.count);
        } catch (error) {
            console.error("Erro ao carregar estoque:", error);
        } finally {
            setLoading(false);
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (produtos.length === 0) return;
        if (selectedIds.length === produtos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(produtos.map(p => p.id));
        }
    };

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Gerenciamento de produtos e peças</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/estoque/etiquetas" className="bg-white/60 p-2.5 rounded-xl border border-white/60 text-slate-500 hover:text-brand-600 hover:bg-white transition-all shadow-sm" title="Central de Etiquetas">
                        <Printer size={18} />
                    </Link>
                    <Link href="/estoque/balanco" className="bg-white/60 px-4 py-2.5 rounded-xl border border-white/60 text-slate-700 flex items-center gap-2 text-sm font-bold hover:bg-white transition-all shadow-sm">
                        <Target size={18} className="text-indigo-500" />
                        Balanço / Scanner
                    </Link>
                    <Link href="/estoque/novo" className="btn-primary">
                        <Plus size={18} />
                        Novo Produto
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-5 gap-4">
                <GlassCard className="p-4 bg-brand-50/20 border-brand-100/50">
                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">Itens Totais</p>
                    <p className="text-2xl font-bold text-brand-900">{totalItems}</p>
                </GlassCard>
                <GlassCard className="p-4 bg-emerald-50/20 border-emerald-100/50">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Valor Venda (Página)</p>
                    <p className="text-xl font-bold text-emerald-900">
                        {loading ? "..." : (produtos.reduce((acc, p) => acc + (p.preco_venda_centavos * p.estoque_qtd), 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 bg-amber-50/20 border-amber-100/50">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-amber-900">
                        {loading ? "..." : produtos.filter(p => p.estoque_qtd <= (p.estoque_minimo || 0)).length}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 bg-purple-50/20 border-purple-100/50">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Peças / Insumos</p>
                    <p className="text-2xl font-bold text-purple-900">
                        {loading ? "..." : produtos.filter(p => ["Peça", "Insumo"].includes(p.categoria ?? "")).length}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 bg-slate-50/20 border-slate-100/50">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Aparelhos</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {loading ? "..." : produtos.filter(p => p.categoria === "Smartphone").length}
                    </p>
                </GlassCard>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        className="input-glass pl-10"
                        placeholder="Buscar por nome, IMEI ou código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="input-glass w-32 appearance-none"
                        onChange={e => setFilters(p => ({ ...p, grade: e.target.value as any || undefined }))}
                    >
                        <option value="">Todas Grades</option>
                        <option value="A">Grade A</option>
                        <option value="B">Grade B</option>
                        <option value="C">Grade C</option>
                    </select>
                    <select
                        className="input-glass w-40 appearance-none"
                        value={categoriaFilter}
                        onChange={e => setCategoriaFilter(e.target.value)}
                    >
                        <option value="">Todas Categorias</option>
                        {Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean))).map(cat => (
                            <option key={cat} value={cat!}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Table */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50">
                            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4 w-10">
                                    <button onClick={toggleSelectAll} className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 hover:border-indigo-400 transition-colors">
                                        {selectedIds.length === produtos.length && produtos.length > 0 ? (
                                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                                        ) : (
                                            <Square className="w-4 h-4 text-slate-300" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 w-10">Status</th>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Identificação</th>
                                <th className="px-6 py-4 text-center">Qtd</th>
                                <th className="px-6 py-4">Preço (Venda)</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4 h-16 bg-slate-50/30" />
                                    </tr>
                                ))
                            ) : produtos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                        Nenhum produto em estoque.
                                    </td>
                                </tr>
                            ) : (
                                produtos
                                    .filter(p => !categoriaFilter || p.categoria === categoriaFilter)
                                    .map((p) => {
                                        const isLowStock = p.estoque_qtd <= p.estoque_minimo;
                                        const isSelected = selectedIds.includes(p.id);
                                        return (
                                            <tr key={p.id} className={cn(
                                                "hover:bg-slate-50/50 transition-colors group",
                                                isSelected && "bg-indigo-50/40"
                                            )}>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => toggleSelect(p.id)} className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 hover:border-indigo-400 transition-colors bg-white">
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-200" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        p.estoque_qtd === 0 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                            isLowStock ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                                                "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                                    )} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
                                                            {p.imagem_url ? (
                                                                <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={20} />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                                {p.nome}
                                                                {p.exibir_vitrine === false && (
                                                                    <span title="Oculto da vitrine" className="text-slate-300">
                                                                        <EyeOff size={12} />
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                {p.categoria && (
                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                                                                        <Tag size={8} />
                                                                        {p.categoria}
                                                                    </span>
                                                                )}
                                                                {p.grade && (
                                                                    <span className="badge badge-purple px-1.5 py-0">Grade {p.grade}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {p.imei && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Hash size={12} className="text-slate-300" />
                                                                {p.imei}
                                                            </div>
                                                        )}
                                                        {p.codigo_barras && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Barcode size={12} className="text-slate-300" />
                                                                {p.codigo_barras}
                                                            </div>
                                                        )}
                                                        {!p.imei && !p.codigo_barras && (
                                                            <span className="text-xs text-slate-300 italic">Nenhum</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "font-bold px-2 py-1 rounded-lg text-sm",
                                                        isLowStock ? "text-amber-600 bg-amber-50" : "text-brand-600 bg-brand-50"
                                                    )}>
                                                        {p.estoque_qtd}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800">
                                                        R$ {(p.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => window.open(`/print/etiqueta/${p.id}`, '_blank')}
                                                            title="Imprimir Etiqueta"
                                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <Link href={`/estoque/${p.id}`} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-500">
                                                            <Edit size={16} />
                                                        </Link>
                                                        <button className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                                                            <Trash2 size={16} />
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

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white/50">
                        <span className="text-sm text-slate-500">
                            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* Selected Items Floating Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-4 bg-slate-900/90 backdrop-blur text-white rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-4 z-50">
                    <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-sm">
                            {selectedIds.length}
                        </div>
                        <p className="font-medium text-sm">itens selecionados</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-white/60 hover:text-white text-xs font-bold transition-colors"
                        >
                            Limpar seleção
                        </button>
                        <Link
                            href={`/estoque/etiquetas?ids=${selectedIds.join(',')}`}
                            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-500/20"
                        >
                            <Printer size={16} />
                            Imprimir Etiquetas
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
