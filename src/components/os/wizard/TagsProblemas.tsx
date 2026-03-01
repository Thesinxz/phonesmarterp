"use client";

import { Wrench, Tag, AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";

const TAGS_SUGESTOES = [
    "Tela Quebrada", "Não Liga", "Não Carrega", "Bateria Viciada", "Touch Falhando",
    "Som Baixo", "Câmera Oscilando", "Placa", "Software / Loop", "Limpeza",
    "Contato com Água", "Microfone Ruim", "Botões Travados", "Sem Sinal"
];

interface TagsProblemasProps {
    selected: string[];
    onChange: (tags: string[]) => void;
}

export function TagsProblemas({ selected, onChange }: TagsProblemasProps) {
    const toggleTag = (tag: string) => {
        const next = selected.includes(tag)
            ? selected.filter(t => t !== tag)
            : [...selected, tag];
        onChange(next);
    };

    return (
        <div className="flex flex-wrap gap-2">
            {TAGS_SUGESTOES.map(tag => {
                const active = selected.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5",
                            active
                                ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm"
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                    >
                        {active && <Tag size={10} />}
                        {tag}
                    </button>
                );
            })}
        </div>
    );
}
