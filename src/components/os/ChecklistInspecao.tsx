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
    { id: "auto_falante", label: "Auto-falante", icon: <Volume2 size={14} />, categoria: "Mídia" },
    { id: "microfone", label: "Microfone", icon: <Mic size={14} />, categoria: "Mídia" },
    { id: "flash", label: "Flash / Lanterna", categoria: "Mídia" },

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
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Check size={12} /> {stats.ok} OK
                    </span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg flex items-center gap-1">
                        <X size={12} /> {stats.defeito} Defeito
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Minus size={12} /> {stats.na} N/A
                    </span>
                </div>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={marcarTodosOK}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw size={12} /> Marcar tudo OK
                    </button>
                )}
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
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleToggle(item.id)}
                                    disabled={readOnly}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                        status === "ok" && "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300",
                                        status === "defeito" && "bg-rose-50/80 border-rose-200 hover:border-rose-300",
                                        status === "na" && "bg-white border-slate-100 hover:border-slate-200",
                                        readOnly && "cursor-default",
                                        divergência && "ring-2 ring-amber-400"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                        status === "ok" && "bg-emerald-500 text-white",
                                        status === "defeito" && "bg-rose-500 text-white",
                                        status === "na" && "bg-slate-100 text-slate-400"
                                    )}>
                                        {status === "ok" && <Check size={14} />}
                                        {status === "defeito" && <X size={14} />}
                                        {status === "na" && <Minus size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className={cn(
                                            "text-sm font-semibold block truncate",
                                            status === "ok" && "text-emerald-800",
                                            status === "defeito" && "text-rose-800",
                                            status === "na" && "text-slate-500"
                                        )}>
                                            {item.label}
                                        </span>
                                        {divergência && (
                                            <span className="text-[10px] text-amber-600 font-bold">
                                                Entrada: {compStatus === "ok" ? "OK" : compStatus === "defeito" ? "Defeito" : "N/A"}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export { CHECKLIST_PADRAO };
