"use client";

import { useState } from "react";
import { Package, Wrench, Plus, Trash2, ShoppingBag, DollarSign, Tag as TagIcon } from "lucide-react";
import { BuscaPecaEstoque } from "./BuscaPecaEstoque";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

interface OSStep4PecasServicosProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep4PecasServicos({ data, onChange }: OSStep4PecasServicosProps) {
    const [maoObraManual, setMaoObraManual] = useState({ descricao: "", valor: "" });

    const addPeca = (peca: any) => {
        console.log("DEBUG: Tentando adicionar peça:", peca);
        if (!peca.id) {
            import("sonner").then(({ toast }) => toast.error("Erro interno: Peça sem ID. Verifique o console."));
            console.error("DEBUG: Erro - Peça sem ID:", peca);
            return;
        }
        const current = data.pecas || [];
        // Se ja existe, aumenta a qtd
        const exists = current.find((p: any) => p.id === peca.id);
        if (exists) {
            import("sonner").then(({ toast }) => toast.success(`Quantidade de ${peca.nome} aumentada!`));
            onChange({
                ...data,
                pecas: current.map((p: any) => p.id === peca.id ? { ...p, qtd: p.qtd + 1 } : p)
            });
        } else {
            import("sonner").then(({ toast }) => toast.success(`${peca.nome} adicionado!`));
            onChange({ ...data, pecas: [...current, peca] });
        }
    };

    const removePeca = (id: string) => {
        onChange({ ...data, pecas: data.pecas.filter((p: any) => p.id !== id) });
    };

    const addMaoObra = () => {
        console.log("DEBUG: Tentando adicionar mão de obra:", maoObraManual);
        if (!maoObraManual.descricao || !maoObraManual.valor) {
            import("sonner").then(({ toast }) => toast.error("Preencha descrição e valor da mão de obra"));
            return;
        }
        const valorCentavos = Math.round(parseFloat(maoObraManual.valor.replace(",", ".")) * 100);
        if (isNaN(valorCentavos)) {
            import("sonner").then(({ toast }) => toast.error("Valor inválido"));
            return;
        }
        onChange({
            ...data,
            servicos: [...(data.servicos || []), { ...maoObraManual, valor: valorCentavos }]
        });
        import("sonner").then(({ toast }) => toast.success("Serviço adicionado!"));
        setMaoObraManual({ descricao: "", valor: "" });
    };

    const removeServico = (index: number) => {
        onChange({ ...data, servicos: data.servicos.filter((_: any, i: number) => i !== index) });
    };

    const totalPecas = (data.pecas || []).reduce((acc: number, p: any) => acc + (p.preco * p.qtd), 0);
    const totalServicos = (data.servicos || []).reduce((acc: number, s: any) => acc + s.valor, 0);
    const totalGeral = totalPecas + totalServicos - (data.desconto || 0);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna 1: Peças */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Package size={16} /> Peças do Estoque
                    </label>

                    <BuscaPecaEstoque onSelect={addPeca} />

                    <div className="space-y-3">
                        {(data.pecas || []).map((p: any) => (
                            <div key={p.id} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{p.nome}</p>
                                            {p.isManual && (
                                                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Peça Manual</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removePeca(p.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Qtd</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 h-9 rounded-lg border border-slate-100 bg-slate-50 px-2 text-sm font-bold focus:bg-white outline-none"
                                                value={p.qtd}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    onChange({
                                                        ...data,
                                                        pecas: data.pecas.map((item: any) => item.id === p.id ? { ...item, qtd: val } : item)
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Preço Un.</label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                                                <input
                                                    type="text"
                                                    className="w-24 h-9 pl-7 pr-2 rounded-lg border border-slate-100 bg-slate-50 text-sm font-bold focus:bg-white outline-none"
                                                    value={(p.preco / 100).toFixed(2)}
                                                    onChange={(e) => {
                                                        const val = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                                                        onChange({
                                                            ...data,
                                                            pecas: data.pecas.map((item: any) => item.id === p.id ? { ...item, preco: val } : item)
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal</p>
                                        <p className="text-base font-black text-slate-700">R$ {(p.preco * p.qtd / 100).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!data.pecas || data.pecas.length === 0) && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-xs uppercase font-bold tracking-widest">
                                Nenhuma peça adicionada
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna 2: Mão de Obra */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Wrench size={16} /> Mão de Obra / Serviços
                    </label>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Descrição do serviço..."
                            className="flex-1 h-12 px-4 rounded-xl border border-slate-100 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={maoObraManual.descricao}
                            onChange={e => setMaoObraManual(p => ({ ...p, descricao: e.target.value }))}
                        />
                        <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                            <input
                                type="text"
                                placeholder="0,00"
                                className="w-full h-12 pl-8 pr-4 rounded-xl border border-slate-100 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                value={maoObraManual.valor}
                                onChange={e => setMaoObraManual(p => ({ ...p, valor: e.target.value }))}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addMaoObra}
                            className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {(data.servicos || []).map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                        <ShoppingBag size={14} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{s.descricao}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm font-black text-slate-700">R$ {(s.valor / 100).toFixed(2)}</p>
                                    <button
                                        type="button"
                                        onClick={() => removeServico(i)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Resumo Financeiro da Etapa */}
            <GlassCard className="bg-indigo-900 border-indigo-800 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center">
                    <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Total Peças</p>
                        <p className="text-xl font-bold">R$ {(totalPecas / 100).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Total Serviços</p>
                        <p className="text-xl font-bold">R$ {(totalServicos / 100).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Desconto</p>
                        <input
                            type="text"
                            placeholder="0,00"
                            className="bg-indigo-800/50 border border-indigo-700 rounded-lg px-3 py-1 text-sm font-bold w-24 outline-none focus:ring-1 focus:ring-white"
                            value={(data.desconto / 100).toFixed(2)}
                            onChange={e => {
                                const val = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                                onChange({ ...data, desconto: val });
                            }}
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">VALOR TOTAL ESTIMADO</p>
                        <p className="text-3xl font-black text-white">R$ {(totalGeral / 100).toFixed(2)}</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
