"use client";

import { useState } from "react";
import { SeletorTipoEquipamento } from "./SeletorTipoEquipamento";
import { GlassCard } from "@/components/ui/GlassCard";
import { Smartphone, Tag, Palette, Hash, Box, ClipboardList, PenTool, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { PatternLock } from "./PatternLock";
import { cn } from "@/utils/cn";

const ACESSORIOS_SUGESTOES = ["Carregador", "Cabo USB", "Capinha", "Fone de Ouvido", "Caixa Original", "Película", "Chip / SIM Card", "Cartão de Memória"];

const CORES = [
    { label: "Preto", bg: "bg-slate-900" },
    { label: "Branco", bg: "bg-white border-slate-200" },
    { label: "Prata", bg: "bg-slate-300" },
    { label: "Cinza", bg: "bg-slate-500" },
    { label: "Dourado", bg: "bg-amber-300" },
    { label: "Azul", bg: "bg-blue-500" },
    { label: "Vermelho", bg: "bg-red-500" },
    { label: "Outra", bg: "bg-gradient-to-tr from-indigo-500 to-purple-500" },
];

interface OSStep2EquipamentoProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep2Equipamento({ data, onChange }: OSStep2EquipamentoProps) {
    const toggleAcessorio = (acc: string) => {
        const current = data.acessorios || [];
        const next = current.includes(acc)
            ? current.filter((i: string) => i !== acc)
            : [...current, acc];
        onChange({ ...data, acessorios: next });
    };

    return (
        <div className="space-y-8">
            {/* Tipo de Aparelho */}
            <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone size={16} /> Tipo de Aparelho
                </label>
                <SeletorTipoEquipamento
                    value={data.tipoEquipamento}
                    onChange={(v) => onChange({ ...data, tipoEquipamento: v })}
                />
            </div>

            {/* Marca e Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Tag size={12} /> Marca *
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: Apple, Samsung, Motorola..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={data.marca}
                        onChange={e => onChange({ ...data, marca: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Smartphone size={12} /> Modelo *
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: iPhone 14 Pro Max, S23 Ultra..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={data.modelo}
                        onChange={e => onChange({ ...data, modelo: e.target.value })}
                    />
                </div>
            </div>

            {/* Cor do Aparelho */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Palette size={12} /> Cor do Aparelho
                </label>
                <div className="flex flex-wrap gap-3">
                    {CORES.map(cor => (
                        <button
                            key={cor.label}
                            type="button"
                            onClick={() => onChange({ ...data, cor: cor.label })}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                                data.cor === cor.label ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                        >
                            <div className={cn("w-4 h-4 rounded-full", cor.bg)} />
                            <span className="text-sm font-medium text-slate-700">{cor.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Identificação (IMEI/SN) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Hash size={12} /> IMEI / Serial (obrigatório para celulares)
                    </label>
                    <input
                        type="text"
                        placeholder="IMEI do aparelho"
                        className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={data.imei}
                        onChange={e => onChange({ ...data, imei: e.target.value })}
                    />
                </div>
                <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Hash size={12} /> Senha / PIN / Padrão (necessário para testes)
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => onChange({ ...data, senhaTipo: "texto", senhaDispositivo: "" })}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                                    data.senhaTipo === "texto" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                PIN / Texto
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange({ ...data, senhaTipo: "padrao", senhaDispositivo: "" })}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                                    data.senhaTipo === "padrao" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Desenho Android
                            </button>
                        </div>
                    </div>

                    {data.senhaTipo === "padrao" ? (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
                                <PatternLock
                                    value={data.senhaDispositivo}
                                    onChange={(val: string) => onChange({ ...data, senhaDispositivo: val })}
                                />
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sequência do Padrão</p>
                                    <p className="text-lg font-black text-indigo-600 font-mono tracking-tighter">{data.senhaDispositivo || "Desenhe no quadro acima"}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                            <input
                                type="text"
                                placeholder="Ex: 1234, Senha123, PIN 0000..."
                                className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={data.senhaDispositivo}
                                onChange={e => onChange({ ...data, senhaDispositivo: e.target.value })}
                            />
                            {/* Botão para forçar modo padrão se estiver vazio */}
                            {data.senhaDispositivo === "" && (
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...data, senhaTipo: "padrao", senhaDispositivo: "" })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    Usar Desenho
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Box size={12} /> Outras Identificações
                    </label>
                    <input
                        type="text"
                        placeholder="Nº de Série, Patrimônio..."
                        className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={data.serie}
                        onChange={e => onChange({ ...data, serie: e.target.value })}
                    />
                </div>
            </div>

            {/* Acessórios Recebidos */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Box size={12} /> Acessórios Deixados com o Aparelho
                </label>
                <div className="flex flex-wrap gap-2">
                    {ACESSORIOS_SUGESTOES.map(acc => {
                        const active = data.acessorios?.includes(acc);
                        return (
                            <button
                                key={acc}
                                type="button"
                                onClick={() => toggleAcessorio(acc)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2",
                                    active
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                )}
                            >
                                {active && <Check size={12} />}
                                {acc}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
