"use client";

import { useState } from "react";
import { SeletorTipoEquipamento } from "./SeletorTipoEquipamento";
import { SeletorMarcaModelo } from "./SeletorMarcaModelo";
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
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">2</div>
                <h2>Qual o equipamento?</h2>
            </div>

            {/* Tipo de Aparelho */}
            <div>
                <div className="section-label">TIPO DE APARELHO</div>
                <SeletorTipoEquipamento
                    value={data.tipoEquipamento}
                    onChange={(v) => onChange({ ...data, tipoEquipamento: v })}
                />
            </div>

            {/* Marca e Modelo Inteligentes */}
            <SeletorMarcaModelo
                marca={data.marca}
                modelo={data.modelo}
                onChange={(m, mod) => onChange({ ...data, marca: m, modelo: mod })}
            />

            {/* Cor do Aparelho */}
            <div>
                <div className="section-label">COR DO APARELHO</div>
                <div className="flex flex-wrap gap-2">
                    {CORES.map(cor => (
                        <div
                            key={cor.label}
                            onClick={() => onChange({ ...data, cor: cor.label })}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all border-2",
                                cor.bg,
                                data.cor === cor.label ? "ring-2 ring-indigo-500 ring-offset-2 border-transparent scale-110" : "border-transparent opacity-80 hover:opacity-100"
                            )}
                            title={cor.label}
                        />
                    ))}
                </div>
            </div>

            {/* Identificação (IMEI/SN) */}
            {/* Identificação (IMEI/SN) e Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="wizard-field">
                    <label>
                        IMEI / SERIAL <span className="badge-lock ml-auto">🔒 não impresso</span>
                    </label>
                    <input
                        type="text"
                        placeholder="IMEI do aparelho (15 dígitos)"
                        value={data.imei}
                        onChange={e => onChange({ ...data, imei: e.target.value })}
                    />
                </div>
                <div className="wizard-field">
                    <label>SÉRIE / PATRIMÔNIO</label>
                    <input
                        type="text"
                        placeholder="Nº de patrimônio ou outra ref..."
                        value={data.serie}
                        onChange={e => onChange({ ...data, serie: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="section-label mb-0 flex items-center gap-2">
                        SENHA / PIN / PADRÃO
                        <span className="badge-lock">🔒 não impresso</span>
                    </div>
                    <div className="flex bg-slate-100 p-0.5 rounded-md">
                        <button
                            type="button"
                            onClick={() => onChange({ ...data, senhaTipo: "texto", senhaDispositivo: "" })}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                                data.senhaTipo === "texto" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            PIN / Texto
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...data, senhaTipo: "padrao", senhaDispositivo: "" })}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                                data.senhaTipo === "padrao" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Desenho
                        </button>
                    </div>
                </div>

                {data.senhaTipo === "padrao" ? (
                    <div className="p-5 rounded-lg border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-6 items-center">
                        <div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Desenhe o padrão de desbloqueio do aparelho.<br />
                                Necessário para realizar testes internos.
                            </p>
                            <p className="text-[10px] text-slate-400 mt-2 italic">
                                Esta informação não é exibida ao cliente.
                            </p>
                        </div>
                        <div className="flex justify-center sm:justify-end">
                            <PatternLock
                                value={data.senhaDispositivo}
                                onChange={(val: string) => onChange({ ...data, senhaDispositivo: val })}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="wizard-field mb-0">
                        <input
                            type="text"
                            placeholder="Ex: 1234, Senha123, PIN 0000..."
                            value={data.senhaDispositivo}
                            onChange={e => onChange({ ...data, senhaDispositivo: e.target.value })}
                        />
                    </div>
                )}
            </div>

            {/* Acessórios Recebidos */}
            <div>
                <div className="section-label">ACESSÓRIOS DEIXADOS COM O APARELHO</div>
                <div className="flex flex-wrap gap-2">
                    {ACESSORIOS_SUGESTOES.map(acc => {
                        const active = data.acessorios?.includes(acc);
                        return (
                            <button
                                key={acc}
                                type="button"
                                onClick={() => toggleAcessorio(acc)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5",
                                    active
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
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
