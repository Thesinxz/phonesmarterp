"use client";

import { useState } from "react";
import { Check, X, Minus, Camera, Smartphone, Wifi, Signal, Battery, Volume2, Mic, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ChecklistItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    categoria: string;
}

export type ChecklistStatus = "ok" | "defeito" | "na";

export type ChecklistData = Record<string, ChecklistStatus>;

const CHECKLIST_PADRAO: ChecklistItem[] = [
    // Hardware
    { id: "liga", label: "Liga / Funciona", icon: <Battery size={14} />, categoria: "Hardware" },
    { id: "tela_display", label: "Tela / Display", icon: <Smartphone size={14} />, categoria: "Hardware" },
    { id: "touch", label: "Touch / Digitalização", icon: <Smartphone size={14} />, categoria: "Hardware" },
    { id: "botoes", label: "Botões Físicos", categoria: "Hardware" },
    { id: "biometria", label: "Biometria / Face ID", categoria: "Hardware" },
    { id: "bateria", label: "Saúde da Bateria", icon: <Battery size={14} />, categoria: "Hardware" },

    // Conectividade
    { id: "wifi", label: "Wi-Fi", icon: <Wifi size={14} />, categoria: "Conectividade" },
    { id: "bluetooth", label: "Bluetooth", categoria: "Conectividade" },
    { id: "sinal_rede", label: "Sinal / Rede Móvel", icon: <Signal size={14} />, categoria: "Conectividade" },
    { id: "chip_sim", label: "Chip / SIM", categoria: "Conectividade" },
    { id: "carregamento", label: "Porta de Carregamento", categoria: "Conectividade" },

    // Mídia
    { id: "camera_traseira", label: "Câmera Traseira", icon: <Camera size={14} />, categoria: "Mídia" },
    { id: "camera_frontal", label: "Câmera Frontal", icon: <Camera size={14} />, categoria: "Mídia" },
    { id: "auto_falante", label: "Auto-falante Inferior", icon: <Volume2 size={14} />, categoria: "Mídia" },
    { id: "som_auricular", label: "Auto-falante Auricular", icon: <Volume2 size={14} />, categoria: "Mídia" },
    { id: "microfone", label: "Microfone", icon: <Mic size={14} />, categoria: "Mídia" },
    { id: "flash", label: "Flash / Lanterna", categoria: "Mídia" },

    // Sensores & Motores
    { id: "vibracao", label: "Vibração", categoria: "Avançado" },

    // Visual
    { id: "carcaca", label: "Carcaça / Tampa", categoria: "Aparência" },
    { id: "riscos", label: "Riscos / Marcas", categoria: "Aparência" },
    { id: "pelicula", label: "Película Tela", categoria: "Aparência" },
];

interface ChecklistInspecaoProps {
    tipo: "entrada" | "saida";
    value: ChecklistData;
    onChange: (data: ChecklistData) => void;
    readOnly?: boolean;
    compararCom?: ChecklistData;
}

export function ChecklistInspecao({ tipo, value, onChange, readOnly = false, compararCom }: ChecklistInspecaoProps) {
    const categorias = Array.from(new Set(CHECKLIST_PADRAO.map(i => i.categoria)));

    const handleToggle = (id: string) => {
        if (readOnly) return;
        const current = value[id] || "na";
        const next: ChecklistStatus = current === "na" ? "ok" : current === "ok" ? "defeito" : "na";
        onChange({ ...value, [id]: next });
    };

    const marcarTodosOK = () => {
        if (readOnly) return;
        const newData: ChecklistData = {};
        CHECKLIST_PADRAO.forEach(item => { newData[item.id] = "ok"; });
        onChange(newData);
    };

    const stats = {
        ok: Object.values(value).filter(v => v === "ok").length,
        defeito: Object.values(value).filter(v => v === "defeito").length,
        na: CHECKLIST_PADRAO.length - Object.values(value).filter(v => v === "ok" || v === "defeito").length,
    };

    return (
        <div className="space-y-4">
            {/* Header com stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-100">
                        <Check size={12} /> {stats.ok} OK
                    </span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-rose-100">
                        <X size={12} /> {stats.defeito} Defeito
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-200">
                        <Minus size={12} /> {stats.na} N/A
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                        {stats.ok + stats.defeito} / {CHECKLIST_PADRAO.length} avaliados
                    </span>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={marcarTodosOK}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg"
                        >
                            <RotateCcw size={14} /> Marcar tudo OK
                        </button>
                    )}
                </div>
            </div>

            {/* Checklist por categoria */}
            {categorias.map(cat => (
                <div key={cat}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{cat}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CHECKLIST_PADRAO.filter(i => i.categoria === cat).map(item => {
                            const status = value[item.id] || "na";
                            const compStatus = compararCom?.[item.id];
                            const divergência = compararCom && compStatus && status !== compStatus;

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all bg-white",
                                        divergência ? "ring-2 ring-amber-400" : "border-slate-100"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {item.icon && <span className="text-slate-400">{item.icon}</span>}
                                            <span className="text-sm font-semibold text-slate-700 block truncate">
                                                {item.label}
                                            </span>
                                        </div>
                                        {divergência && (
                                            <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                                                Entrada: {compStatus === "ok" ? "OK" : compStatus === "defeito" ? "Defeito" : "N/A"}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => !readOnly && onChange({ ...value, [item.id]: "ok" })}
                                            disabled={readOnly}
                                            className={cn(
                                                "w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all border outline-none",
                                                status === "ok" 
                                                    ? "bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm" 
                                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !readOnly && onChange({ ...value, [item.id]: "defeito" })}
                                            disabled={readOnly}
                                            className={cn(
                                                "w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all border outline-none",
                                                status === "defeito" 
                                                    ? "bg-rose-100 text-rose-700 border-rose-300 ring-2 ring-rose-500/20 shadow-sm" 
                                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <X size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !readOnly && onChange({ ...value, [item.id]: "na" })}
                                            disabled={readOnly}
                                            className={cn(
                                                "w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all border outline-none",
                                                status === "na" 
                                                    ? "bg-slate-200 text-slate-600 border-slate-300 ring-2 ring-slate-500/20 shadow-sm" 
                                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <Minus size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export { CHECKLIST_PADRAO };
