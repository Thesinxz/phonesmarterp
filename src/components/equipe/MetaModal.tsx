"use client";

import { useState, type FormEvent } from "react";
import { X, Target, DollarSign, Calendar, User, PlusCircle, Trash2, Tag } from "lucide-react";
import { type Usuario } from "@/services/equipe";
import { criarMeta } from "@/services/metas";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";

interface MetaModalProps {
    empresaId: string;
    membros: Usuario[];
    onClose: () => void;
    onSaved: () => void;
}

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MetaModal({ empresaId, membros, onClose, onSaved }: MetaModalProps) {
    const now = new Date();
    const [usuarioId, setUsuarioId] = useState(membros[0]?.id || "");
    const [ano, setAno] = useState(now.getFullYear());
    const [mes, setMes] = useState(now.getMonth() + 1);
    const [metaFaturamento, setMetaFaturamento] = useState("");
    const [metaQtd, setMetaQtd] = useState("");
    const [saving, setSaving] = useState(false);

    // Categories
    const [categorias, setCategorias] = useState<{ nome: string; qtd: string; valor: string }[]>([]);

    function addCategoria() {
        setCategorias([...categorias, { nome: "Celulares", qtd: "", valor: "" }]);
    }

    function removeCategoria(index: number) {
        setCategorias(categorias.filter((_, i) => i !== index));
    }

    function updateCategoria(index: number, field: "nome" | "qtd" | "valor", value: string) {
        const newCats = [...categorias];
        newCats[index][field] = value;
        setCategorias(newCats);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!usuarioId || !metaFaturamento) {
            toast.error("Preencha o vendedor e o valor da meta");
            return;
        }

        setSaving(true);
        try {
            const categoriasPayload = categorias
                .filter(c => c.qtd || c.valor)
                .map(c => ({
                    tipo: "categoria" as const,
                    categoria_nome: c.nome,
                    meta_qtd: c.qtd ? parseInt(c.qtd) : 0,
                    meta_valor_centavos: c.valor ? Math.round(parseFloat(c.valor.replace(',', '.')) * 100) : 0,
                }));

            await criarMeta(
                empresaId,
                {
                    usuario_id: usuarioId,
                    tipo_periodo: "mensal",
                    ano,
                    mes,
                    meta_faturamento_centavos: Math.round(parseFloat(metaFaturamento.replace(',', '.')) * 100),
                    meta_qtd_vendas: metaQtd ? parseInt(metaQtd) : 0,
                },
                categoriasPayload
            );
            toast.success("Meta criada com sucesso!");
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error("Erro ao salvar meta: " + (err.message || "Erro desconhecido"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <GlassCard className="w-full max-w-2xl p-6 animate-in zoom-in-95 my-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                            <Target className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Nova Meta</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Vendedor */}
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                            <User className="w-4 h-4" /> Vendedor
                        </label>
                        <select
                            value={usuarioId}
                            onChange={(e) => setUsuarioId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        >
                            {membros.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Período */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" /> Mês
                            </label>
                            <select
                                value={mes}
                                onChange={(e) => setMes(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            >
                                {MESES.map((nome, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1.5">Ano</label>
                            <input
                                type="number"
                                value={ano}
                                onChange={(e) => setAno(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    {/* Meta de Faturamento */}
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Meta de Faturamento (R$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 50000.00"
                            value={metaFaturamento}
                            onChange={(e) => setMetaFaturamento(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            required
                        />
                    </div>

                    {/* Meta de Quantidade */}
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5">Meta de Vendas (quantidade)</label>
                        <input
                            type="number"
                            placeholder="Ex: 100"
                            value={metaQtd}
                            onChange={(e) => setMetaQtd(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>

                    {/* Metas Específicas por Categoria */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Tag className="w-4 h-4 text-brand-500" />
                                Metas Específicas (Opcional)
                            </label>
                            <button
                                type="button"
                                onClick={addCategoria}
                                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1.5 rounded-lg transition-colors"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Adicionar
                            </button>
                        </div>

                        {categorias.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                Adicione metas para categorias específicas (ex: Celulares, Capas, Películas, Acessórios).
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {categorias.map((cat, idx) => (
                                    <div key={idx} className="flex gap-2 items-start bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Categoria (ex: Celulares)"
                                                value={cat.nome}
                                                onChange={e => updateCategoria(idx, "nome", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 mb-2"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Qtd"
                                                    value={cat.qtd}
                                                    onChange={e => updateCategoria(idx, "qtd", e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Valor (R$)"
                                                    value={cat.valor}
                                                    onChange={e => updateCategoria(idx, "valor", e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeCategoria(idx)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-brand-glow transition-all disabled:opacity-50"
                        >
                            {saving ? "Salvando..." : "Criar Meta"}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
