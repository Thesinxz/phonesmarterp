"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPeliculas, upsertPelicula, deletePelicula, type PeliculaAcessorio } from "@/services/peliculas";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Smartphone, Search, Plus, Edit2, Trash2, X, Save,
    Package, Tag, Layers
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const TIPOS = [
    { value: "pelicula", label: "Película", color: "bg-blue-100 text-blue-700" },
    { value: "capa", label: "Capa", color: "bg-purple-100 text-purple-700" },
    { value: "cabo", label: "Cabo", color: "bg-amber-100 text-amber-700" },
    { value: "acessorio", label: "Acessório", color: "bg-emerald-100 text-emerald-700" },
];

export default function PeliculasPage() {
    const { profile } = useAuth();
    const [items, setItems] = useState<PeliculaAcessorio[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<PeliculaAcessorio | null>(null);

    // Form state
    const [formNome, setFormNome] = useState("");
    const [formTipo, setFormTipo] = useState<string>("pelicula");
    const [formModelos, setFormModelos] = useState("");
    const [formPreco, setFormPreco] = useState("");
    const [formEstoque, setFormEstoque] = useState("");

    useEffect(() => {
        if (profile?.empresa_id) loadData();
    }, [profile?.empresa_id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (profile?.empresa_id) loadData();
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadData() {
        setLoading(true);
        try {
            const { data } = await getPeliculas(profile!.empresa_id, search || undefined);
            setItems(data);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setEditing(null);
        setFormNome("");
        setFormTipo("pelicula");
        setFormModelos("");
        setFormPreco("");
        setFormEstoque("");
        setShowModal(true);
    }

    function openEdit(item: PeliculaAcessorio) {
        setEditing(item);
        setFormNome(item.nome);
        setFormTipo(item.tipo);
        setFormModelos((item.modelos_compativeis || []).join(", "));
        setFormPreco((item.preco_centavos / 100).toFixed(2).replace('.', ','));
        setFormEstoque(String(item.estoque));
        setShowModal(true);
    }

    async function handleSave() {
        if (!formNome.trim()) return toast.error("Nome obrigatório");
        try {
            await upsertPelicula({
                ...(editing ? { id: editing.id } : {}),
                empresa_id: profile!.empresa_id,
                nome: formNome.trim(),
                tipo: formTipo as any,
                modelos_compativeis: formModelos.split(",").map(m => m.trim()).filter(Boolean),
                preco_centavos: Math.round(parseFloat(formPreco.replace(",", ".") || "0") * 100),
                estoque: parseInt(formEstoque || "0"),
            });
            toast.success(editing ? "Atualizado!" : "Adicionado!");
            setShowModal(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Deseja remover este item?")) return;
        try {
            await deletePelicula(id);
            toast.success("Removido!");
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const getTipoStyle = (tipo: string) =>
        TIPOS.find(t => t.value === tipo)?.color || "bg-slate-100 text-slate-600";

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Smartphone className="text-brand-500" /> Películas & Acessórios
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Catálogo de películas, capas e acessórios por modelo de aparelho</p>
                </div>
                <button onClick={openNew} className="btn-primary h-11 px-6 flex items-center gap-2">
                    <Plus size={18} /> Adicionar
                </button>
            </div>

            {/* Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, modelo (ex: iPhone 15, Samsung S24)..."
                    className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TIPOS.map(t => {
                    const count = items.filter(i => i.tipo === t.value).length;
                    return (
                        <GlassCard key={t.value} className="p-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.label}</p>
                            <p className="text-2xl font-black text-slate-800 mt-1">{count}</p>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Tabela */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Modelos Compatíveis</th>
                                <th className="px-6 py-4 text-right">Preço</th>
                                <th className="px-6 py-4 text-center">Estoque</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5 bg-slate-50/30 h-14" />
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                                        <Smartphone size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-600 mb-1">Nenhum item cadastrado</p>
                                        <p className="text-sm">Clique em "Adicionar" para cadastrar películas e acessórios</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.nome}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", getTipoStyle(item.tipo))}>
                                                {item.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(item.modelos_compativeis || []).map((m, i) => (
                                                    <span key={i} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                                            {formatCurrency(item.preco_centavos)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "font-bold text-sm",
                                                item.estoque <= 0 ? "text-red-600" :
                                                    item.estoque <= 5 ? "text-amber-600" : "text-emerald-600"
                                            )}>
                                                {item.estoque}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg" title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remover">
                                                    <Trash2 size={14} />
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

            {/* Modal Adicionar/Editar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editing ? "Editar Item" : "Novo Item"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome</label>
                                <input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Película Hydrogel Privacy"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo</label>
                                <div className="flex gap-2">
                                    {TIPOS.map(t => (
                                        <button key={t.value} onClick={() => setFormTipo(t.value)}
                                            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                                formTipo === t.value ? t.color + " shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                            )}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Modelos Compatíveis <span className="text-slate-300">(separar por vírgula)</span>
                                </label>
                                <input value={formModelos} onChange={e => setFormModelos(e.target.value)} placeholder="iPhone 15, iPhone 15 Pro, iPhone 15 Pro Max"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Preço (R$)</label>
                                    <input value={formPreco} onChange={e => setFormPreco(e.target.value)} placeholder="29,90" inputMode="decimal"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Estoque</label>
                                    <input value={formEstoque} onChange={e => setFormEstoque(e.target.value)} placeholder="10" type="number"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 border border-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave}
                                className="flex-1 h-12 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
