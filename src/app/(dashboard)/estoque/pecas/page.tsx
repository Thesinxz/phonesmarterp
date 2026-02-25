"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getPecasCatalogo, upsertPeca, deletePeca,
    TIPOS_PECA, QUALIDADES,
    type PecaCatalogo
} from "@/services/pecas";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Wrench, Search, Plus, Edit2, Trash2, X, Save,
    Package, Tag, AlertTriangle, Filter
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

export default function PecasCatalogoPage() {
    const { profile } = useAuth();
    const [items, setItems] = useState<PecaCatalogo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<PecaCatalogo | null>(null);

    // Form
    const [formNome, setFormNome] = useState("");
    const [formTipo, setFormTipo] = useState("frontal");
    const [formModelos, setFormModelos] = useState("");
    const [formQualidade, setFormQualidade] = useState("original");
    const [formPrecoCusto, setFormPrecoCusto] = useState("");
    const [formPrecoVenda, setFormPrecoVenda] = useState("");
    const [formEstoque, setFormEstoque] = useState("");
    const [formFornecedor, setFormFornecedor] = useState("");

    useEffect(() => {
        if (profile?.empresa_id) loadData();
    }, [profile?.empresa_id]);

    useEffect(() => {
        const t = setTimeout(() => { if (profile?.empresa_id) loadData(); }, 300);
        return () => clearTimeout(t);
    }, [search, filtroTipo]);

    async function loadData() {
        setLoading(true);
        try {
            const { data } = await getPecasCatalogo(profile!.empresa_id, {
                search: search || undefined,
                tipo: filtroTipo || undefined,
            });
            setItems(data);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openNew() {
        setEditing(null);
        setFormNome(""); setFormTipo("frontal"); setFormModelos("");
        setFormQualidade("original"); setFormPrecoCusto(""); setFormPrecoVenda("");
        setFormEstoque(""); setFormFornecedor("");
        setShowModal(true);
    }

    function openEdit(item: PecaCatalogo) {
        setEditing(item);
        setFormNome(item.nome);
        setFormTipo(item.tipo_peca);
        setFormModelos((item.modelos_compativeis || []).join(", "));
        setFormQualidade(item.qualidade || "original");
        setFormPrecoCusto((item.preco_custo_centavos / 100).toFixed(2).replace('.', ','));
        setFormPrecoVenda((item.preco_venda_centavos / 100).toFixed(2).replace('.', ','));
        setFormEstoque(String(item.estoque_qtd));
        setFormFornecedor(item.fornecedor || "");
        setShowModal(true);
    }

    async function handleSave() {
        if (!formNome.trim()) return toast.error("Nome obrigatório");
        try {
            await upsertPeca({
                ...(editing ? { id: editing.id } : {}),
                empresa_id: profile!.empresa_id,
                nome: formNome.trim(),
                tipo_peca: formTipo,
                modelos_compativeis: formModelos.split(",").map(m => m.trim()).filter(Boolean),
                qualidade: formQualidade,
                preco_custo_centavos: Math.round(parseFloat(formPrecoCusto.replace(",", ".") || "0") * 100),
                preco_venda_centavos: Math.round(parseFloat(formPrecoVenda.replace(",", ".") || "0") * 100),
                estoque_qtd: parseInt(formEstoque || "0"),
                fornecedor: formFornecedor || null,
            });
            toast.success(editing ? "Peça atualizada!" : "Peça cadastrada!");
            setShowModal(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover esta peça do catálogo?")) return;
        try {
            await deletePeca(id);
            toast.success("Removida!");
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    const getTipoLabel = (tipo: string) => TIPOS_PECA.find(t => t.value === tipo);
    const getQualLabel = (qual: string) => QUALIDADES.find(q => q.value === qual);

    // KPIs
    const totalPecas = items.length;
    const estoqueBaixo = items.filter(i => i.estoque_qtd <= 2 && i.estoque_qtd > 0).length;
    const semEstoque = items.filter(i => i.estoque_qtd <= 0).length;
    const valorEstoque = items.reduce((a, i) => a + (i.preco_custo_centavos * i.estoque_qtd), 0);

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Wrench className="text-brand-500" /> Catálogo de Peças
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Peças para assistência técnica — vinculadas a modelos de aparelho</p>
                </div>
                <button onClick={openNew} className="btn-primary h-11 px-6 flex items-center gap-2">
                    <Plus size={18} /> Nova Peça
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <GlassCard className="p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Peças</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalPecas}</p>
                </GlassCard>
                <GlassCard className="p-4 border-l-4 border-l-amber-400">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Estoque Baixo (≤2)</p>
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

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou modelo (ex: iPhone 15, Galaxy S24)..."
                        className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white/60 border border-slate-200/60 rounded-xl px-3 py-2 shrink-0">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none"
                    >
                        <option value="">Todos os tipos</option>
                        {TIPOS_PECA.map(t => (
                            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabela */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Peça</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Qualidade</th>
                                <th className="px-6 py-4">Modelos Compatíveis</th>
                                <th className="px-6 py-4 text-right">Custo</th>
                                <th className="px-6 py-4 text-right">Venda</th>
                                <th className="px-6 py-4 text-center">Estoque</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-6 py-5 bg-slate-50/30 h-14" />
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                                        <Wrench size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-600 mb-1">Nenhuma peça cadastrada</p>
                                        <p className="text-sm">Clique em "Nova Peça" para adicionar ao catálogo</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => {
                                    const tipo = getTipoLabel(item.tipo_peca);
                                    const qual = getQualLabel(item.qualidade);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{tipo?.emoji || "📦"}</span>
                                                    <span className="font-bold text-slate-800">{item.nome}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{tipo?.label || item.tipo_peca}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", qual?.color || "bg-slate-100 text-slate-600")}>
                                                    {qual?.label || item.qualidade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(item.modelos_compativeis || []).slice(0, 3).map((m, i) => (
                                                        <span key={i} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                                            {m}
                                                        </span>
                                                    ))}
                                                    {(item.modelos_compativeis || []).length > 3 && (
                                                        <span className="text-[10px] text-slate-400 font-bold">+{item.modelos_compativeis.length - 3}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 text-xs">
                                                {formatCurrency(item.preco_custo_centavos)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                {formatCurrency(item.preco_venda_centavos)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "font-black text-sm",
                                                    item.estoque_qtd <= 0 ? "text-red-600" :
                                                        item.estoque_qtd <= 2 ? "text-amber-600" : "text-emerald-600"
                                                )}>
                                                    {item.estoque_qtd}
                                                </span>
                                                {item.estoque_qtd <= 2 && item.estoque_qtd > 0 && (
                                                    <AlertTriangle size={12} className="inline ml-1 text-amber-500" />
                                                )}
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editing ? "Editar Peça" : "Nova Peça"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nome da Peça</label>
                                <input value={formNome} onChange={e => setFormNome(e.target.value)}
                                    placeholder="Frontal Original iPhone 15 Pro Max"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tipo de Peça</label>
                                    <select value={formTipo} onChange={e => setFormTipo(e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                                        {TIPOS_PECA.map(t => (
                                            <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Qualidade</label>
                                    <div className="flex gap-2">
                                        {QUALIDADES.map(q => (
                                            <button key={q.value} onClick={() => setFormQualidade(q.value)}
                                                className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                                    formQualidade === q.value ? q.color + " shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                )}>
                                                {q.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Modelos Compatíveis <span className="text-slate-300">(separar por vírgula)</span>
                                </label>
                                <input value={formModelos} onChange={e => setFormModelos(e.target.value)}
                                    placeholder="iPhone 15, iPhone 15 Pro, iPhone 15 Pro Max"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Preço Custo (R$)</label>
                                    <input value={formPrecoCusto} onChange={e => setFormPrecoCusto(e.target.value)}
                                        placeholder="150,00" inputMode="decimal"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Preço Venda (R$)</label>
                                    <input value={formPrecoVenda} onChange={e => setFormPrecoVenda(e.target.value)}
                                        placeholder="380,00" inputMode="decimal"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Estoque</label>
                                    <input value={formEstoque} onChange={e => setFormEstoque(e.target.value)}
                                        placeholder="5" type="number"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Fornecedor (opcional)</label>
                                <input value={formFornecedor} onChange={e => setFormFornecedor(e.target.value)}
                                    placeholder="Fornecedor XYZ"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
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
