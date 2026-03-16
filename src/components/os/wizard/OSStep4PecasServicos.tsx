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

    const formatMoney = (val: string) => {
        return (parseInt(val.replace(/\D/g, "")) / 100).toFixed(2).replace(".", ",");
    };

    const addTagServico = (tag: string) => {
        setMaoObraManual({ ...maoObraManual, descricao: tag });
    };

    return (
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">4</div>
                <h2>Materiais e Mão de Obra</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna 1: Peças */}
                <div>
                    <div className="section-label">PEÇAS DO ESTOQUE (CATÁLOGO)</div>
                    <div className="mb-4">
                        <BuscaPecaEstoque onSelect={addPeca} modeloEquipamento={data.modelo_equipamento} addedParts={data.pecas || []} />
                    </div>

                    <div className="flex flex-col gap-3">
                        {(data.pecas || []).map((p: any) => (
                            <div key={p.id} className="sidebar-card flex-col gap-3" style={{ padding: '16px' }}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <Package size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 leading-tight">{p.nome}</p>
                                            {p.isManual && (
                                                <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest mt-0.5 block">Peça Manual</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removePeca(p.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 pt-3 border-t border-slate-100/50 mt-1">
                                    <div className="flex flex-col gap-1 w-20">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Qtd</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold outline-none transition-all focus:border-indigo-500"
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
                                    <div className="flex flex-col gap-1 w-28">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Preço Un.</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                                            <input
                                                type="text"
                                                className="w-full h-8 pl-6 pr-2 rounded-md border border-slate-200 bg-white text-xs font-bold outline-none transition-all focus:border-indigo-500"
                                                value={(p.preco / 100).toFixed(2).replace(".", ",")}
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
                                    <div className="flex-1 text-right">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Subtotal</p>
                                        <p className="text-sm font-black text-slate-700">R$ {(p.preco * p.qtd / 100).toFixed(2).replace(".", ",")}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!data.pecas || data.pecas.length === 0) && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs font-bold">
                                Nenhuma peça adicionada
                            </div>
                        )}
                    </div>
                </div>

                {/* Coluna 2: Mão de Obra */}
                <div>
                    <div className="section-label">MÃO DE OBRA / SERVIÇOS</div>
                    
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Descrição do serviço..."
                            className="flex-1 h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition-all focus:border-indigo-600"
                            value={maoObraManual.descricao}
                            onChange={e => setMaoObraManual(p => ({ ...p, descricao: e.target.value }))}
                        />
                        <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                            <input
                                type="text"
                                placeholder="0,00"
                                className="w-full h-12 pl-8 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none transition-all focus:border-indigo-600"
                                value={maoObraManual.valor}
                                onChange={e => {
                                    const digits = e.target.value.replace(/\D/g, "");
                                    if(digits === "") return setMaoObraManual(p => ({ ...p, valor: "" }));
                                    setMaoObraManual(p => ({ ...p, valor: formatMoney(digits) }));
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addMaoObra}
                            className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 active:scale-95 transition-transform shrink-0"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {['Limpeza', 'Desoxidação', 'Software', 'Solda', 'Troca de Tela', 'Bateria'].map(s => (
                            <button 
                                key={s} 
                                type="button" 
                                onClick={() => addTagServico(s)}
                                className="px-3 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors uppercase tracking-wider"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        {(data.servicos || []).map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Wrench size={14} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{s.descricao}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm font-black text-slate-700">R$ {(s.valor / 100).toFixed(2).replace(".", ",")}</p>
                                    <button
                                        type="button"
                                        onClick={() => removeServico(i)}
                                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-2">
                            <div className="section-label mb-0">DESCONTO NESTA OS</div>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...data, desconto: 0, descontoTipo: "valor" })}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all",
                                        data.descontoTipo === "valor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    R$
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...data, desconto: 0, descontoTipo: "porcentagem" })}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all",
                                        data.descontoTipo === "porcentagem" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                                    )}
                                >
                                    %
                                </button>
                            </div>
                        </div>
                        <div className="relative wizard-field mb-0">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                {data.descontoTipo === "porcentagem" ? "%" : "R$"}
                            </span>
                            <input
                                type="text"
                                placeholder="0,00"
                                className="w-full h-12 pl-12 pr-4"
                                value={data.descontoTipo === "porcentagem" ? (data.desconto || "") : (data.desconto ? (data.desconto / 100).toFixed(2).replace(".", ",") : "")}
                                onChange={e => {
                                    if (data.descontoTipo === "porcentagem") {
                                        const val = Math.min(100, parseInt(e.target.value.replace(/\D/g, "")) || 0);
                                        onChange({ ...data, desconto: val });
                                    } else {
                                        const digits = e.target.value.replace(/\D/g, "");
                                        const val = Math.round(parseFloat(digits) || 0);
                                        onChange({ ...data, desconto: val });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
