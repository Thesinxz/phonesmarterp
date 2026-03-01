"use client";

import { Smartphone, Tablet, Laptop, Watch, Headphones, MoreHorizontal, Check } from "lucide-react";
import { cn } from "@/utils/cn";

const TIPOS = [
    { id: "celular", label: "Celular", icon: Smartphone },
    { id: "tablet", label: "Tablet", icon: Tablet },
    { id: "notebook", label: "Notebook", icon: Laptop },
    { id: "smartwatch", label: "Relógio", icon: Watch },
    { id: "acessorio", label: "Acessório", icon: Headphones },
    { id: "outro", label: "Outro", icon: MoreHorizontal },
];

interface SeletorTipoEquipamentoProps {
    value: string;
    onChange: (value: string) => void;
}

export function SeletorTipoEquipamento({ value, onChange }: SeletorTipoEquipamentoProps) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {TIPOS.map(tipo => {
                const Icon = tipo.icon;
                const active = value === tipo.id;

                return (
                    <button
                        key={tipo.id}
                        type="button"
                        onClick={() => onChange(tipo.id)}
                        className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                            active
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105"
                                : "bg-white border-slate-100 text-slate-400 hover:border-indigo-100 group"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            active ? "bg-white/20" : "bg-slate-50 group-hover:bg-indigo-50"
                        )}>
                            <Icon size={24} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{tipo.label}</span>
                        {active && (
                            <div className="absolute top-1 right-1">
                                <Check size={12} className="text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
