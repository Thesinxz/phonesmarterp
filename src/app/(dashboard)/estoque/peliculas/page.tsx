"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Smartphone, Search, Plus, Edit2, Trash2, X, Save,
    Package, Filter, AlertTriangle
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const CATEGORIAS = [
    { value: "peliculas", label: "Película", color: "bg-blue-100 text-blue-700" },
    { value: "capas", label: "Capa", color: "bg-purple-100 text-purple-700" },
    { value: "cabos", label: "Cabo", color: "bg-amber-100 text-amber-700" },
    { value: "acessorios", label: "Acessório", color: "bg-emerald-100 text-emerald-700" },
    { value: "fones", label: "Fone", color: "bg-pink-100 text-pink-700" },
    { value: "carregadores", label: "Carregador", color: "bg-orange-100 text-orange-700" },
];

const CATEGORIAS_VALUES = CATEGORIAS.map(c => c.value);

export default function PeliculasPage() {
    const { profile } = useAuth();
    const supabase = createClient();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);

    // Form
    const [formNome, setFormNome] = useState("");
    const [formCategoria, setFormCategoria] = useState("peliculas");
    const [formPrecoCusto, setFormPrecoCusto] = useState("");
    const [formPrecoVenda, setFormPrecoVenda] = useState("");
    const [formEstoque, setFormEstoque] = useState("");
    const [formModelos, setFormModelos] = useState("");

    useEffect(() => {
        if (profile?.empresa_id) loadData();
    }, [profile?.empresa_id]);

    useEffect(() => {
        const t = setTimeout(() => { if (profile?.empresa_id) loadData(); }, 300);
        return () => clearTimeout(t);
    }, [search, filtroCategoria]);

    async function loadData() {
        setLoading(true);
        try {
            let query = supabase
                .from("produtos")
                .select("*", { count: "exact" })
                .eq("empresa_id", profile!.empresa_id)
                .in("categoria", filtroCategoria ? [filtroCategoria] : CATEGORIAS_VALUES)
                .order("nome");

            if (search) {
                query = query.ilike("nome", `%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setItems(data || []);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setEditing(null);
        setFormNome(""); setFormCategoria("peliculas");
        setFormPrecoCusto(""); setFormPrecoVenda(""); setFormEstoque("");
        setFormModelos("");
        setShowModal(true);
    }

    function openEdit(item: any) {
        setEditing(item);
        setFormNome(item.nome);
        setFormCategoria(item.categoria || "peliculas");
        setFormPrecoCusto((item.preco_custo_centavos / 100).toFixed(2).replace('.', ','));
        setFormPrecoVenda((item.preco_venda_centavos / 100).toFixed(2).replace('.', ','));
        setFormEstoque(String(item.estoque_qtd));
        setFormModelos(item.descricao || "");
        setShowModal(true);
    }

    async function handleSave() {
        if (!formNome.trim()) return toast.error("Nome obrigatório");
        try {
            const payload: any = {
                empresa_id: profile!.empresa_id,
                nome: formNome.trim(),
                categoria: formCategoria,
                preco_custo_centavos: Math.round(parseFloat(formPrecoCusto.replace(",", ".") || "0") * 100),
                preco_venda_centavos: Math.round(parseFloat(formPrecoVenda.replace(",", ".") || "0") * 100),
                estoque_qtd: parseInt(formEstoque || "0"),
                descricao: formModelos || null,
                condicao: "novo_lacrado",
            };

            if (editing) {
                const { error } = await (supabase.from("produtos") as any)
                    .update(payload)
                    .eq("id", editing.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from("produtos") as any)
                    .insert(payload);
                if (error) throw error;
            }

            toast.success(editing ? "Atualizado!" : "Cadastrado!");
            setShowModal(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover este item?")) return;
        try {
            const { error } = await supabase.from("produtos").delete().eq("id", id);
            if (error) throw error;
            toast.success("Removido!");
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const getCatStyle = (cat: string) => CATEGORIAS.find(c => c.value === cat);

    // KPIs
    const totalItens = items.length;
    const estoqueBaixo = items.filter(i => i.estoque_qtd <= 3 && i.estoque_qtd > 0).length;
    const semEstoque = items.filter(i => i.estoque_qtd <= 0).length;
    const valorEstoque = items.reduce((a: number, i: any) => a + (i.preco_custo_centavos * i.estoque_qtd), 0);

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Smartphone className="text-blue-500" /> Películas & Acessórios
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Unificado com o estoque de produtos — importação XML funciona automaticamente</p>
                </div>
                <button onClick={openNew} className="btn-primary h-11 px-6 flex items-center gap-2">
                    <Plus size={18} /> Novo Item
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <GlassCard className="p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Itens</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalItens}</p>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-amber-400">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Estoque Baixo (≤3)</p>
                    <p className="text-2xl font-black text-amber-700 mt-1">{estoqueBaixo}</p>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-red-400">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sem Estoque</p>
                    <p className="text-2xl font-black text-red-700 mt-1">{semEstoque}</p>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-indigo-400">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Valor em Estoque</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">{formatCurrency(valorEstoque)}</p>
                </GlassCard>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou modelo..."
                        className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
                </div>
                <div className="flex gap-1.5 bg-white/60 border border-slate-200/60 rounded-xl px-2 py-1.5 overflow-x-auto">
                    <button onClick={() => setFiltroCategoria("")}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                            !filtroCategoria ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100")}>
                        Todos
                    </button>
                    {CATEGORIAS.map(c => (
                        <button key={c.value} onClick={() => setFiltroCategoria(c.value)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                filtroCategoria === c.value ? c.color : "text-slate-500 hover:bg-slate-100")}>
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabela */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Produto</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Modelos/Descrição</th>
                                <th className="px-6 py-4 text-right">Custo</th>
                                <th className="px-6 py-4 text-right">Venda</th>
                                <th className="px-6 py-4 text-center">Estoque</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={7} className="px-6 py-5 bg-slate-50/30 h-14" /></tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                                        <Package size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-600 mb-1">Nenhum item encontrado</p>
                                        <p className="text-sm">Clique em "Novo Item" para adicionar</p>
                                    </td>
                                </tr>
                            ) : items.map(item => {
                                const cat = getCatStyle(item.categoria);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.nome}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", cat?.color || "bg-slate-100 text-slate-600")}>
                                                {cat?.label || item.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs max-w-48 truncate">{item.descricao || "—"}</td>
                                        <td className="px-6 py-4 text-right text-slate-500 text-xs">{formatCurrency(item.preco_custo_centavos)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(item.preco_venda_centavos)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn("font-black text-sm",
                                                item.estoque_qtd <= 0 ? "text-red-600" : item.estoque_qtd <= 3 ? "text-amber-600" : "text-emerald-600"
                                            )}>{item.estoque_qtd}</span>
                                            {item.estoque_qtd <= 3 && item.estoque_qtd > 0 && <AlertTriangle size={12} className="inline ml-1 text-amber-500" />}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editing ? "Editar" : "Novo Item"}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome</label>
                                <input value={formNome} onChange={e => setFormNome(e.target.value)}
                                    placeholder="Película Premium Galaxy S24 Ultra"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Categoria</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIAS.map(c => (
                                        <button key={c.value} onClick={() => setFormCategoria(c.value)}
                                            className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                                formCategoria === c.value ? c.color + " shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}>{c.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Modelos compatíveis / Descrição</label>
                                <input value={formModelos} onChange={e => setFormModelos(e.target.value)}
                                    placeholder="iPhone 15, Galaxy S24, etc."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Custo (R$)</label>
                                    <input value={formPrecoCusto} onChange={e => setFormPrecoCusto(e.target.value)}
                                        placeholder="5,00" inputMode="decimal"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Venda (R$)</label>
                                    <input value={formPrecoVenda} onChange={e => setFormPrecoVenda(e.target.value)}
                                        placeholder="30,00" inputMode="decimal"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Estoque</label>
                                    <input value={formEstoque} onChange={e => setFormEstoque(e.target.value)}
                                        placeholder="10" type="number"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 border border-slate-200">Cancelar</button>
                            <button onClick={handleSave}
                                className="flex-1 h-12 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
