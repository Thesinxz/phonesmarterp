"use client";

import { Wrench, AlertTriangle, ClipboardCheck, Info } from "lucide-react";
import { TagsProblemas } from "./TagsProblemas";
import { ChecklistInspecao, type ChecklistData } from "@/components/os/ChecklistInspecao";
import { GlassCard } from "@/components/ui/GlassCard";

interface OSStep3ProblemaProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep3Problema({ data, onChange }: OSStep3ProblemaProps) {
    return (
        <div className="space-y-8">
            {/* Relato do Problema */}
            <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={16} /> Relato do Problema e Defeitos *
                </label>

                <TagsProblemas
                    selected={data.tags || []}
                    onChange={(tags) => onChange({ ...data, tags })}
                />

                <textarea
                    placeholder="Descreva detalhadamente o que está acontecendo com o aparelho..."
                    className="w-full h-32 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 resize-none"
                    value={data.problema}
                    onChange={e => onChange({ ...data, problema: e.target.value })}
                />
            </div>

            {/* Checklist de Entrada */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardCheck size={16} /> Checklist de Entrada (Inspeção Visual)
                    </label>
                </div>

                <GlassCard className="bg-slate-50/50 border-slate-100">
                    <ChecklistInspecao
                        tipo="entrada"
                        value={data.checklist}
                        onChange={(val) => onChange({ ...data, checklist: val })}
                    />
                </GlassCard>
            </div>

            {/* Observações Internas */}
            <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Info size={16} /> Observações Internas (Só para a Equipe)
                </label>
                <textarea
                    placeholder="Anotações sobre senhas, histórico de reparos anteriores, detalhes técnicos..."
                    className="w-full h-24 p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-2 focus:ring-slate-300 outline-none text-slate-600 resize-none text-sm italic"
                    value={data.obsInternas}
                    onChange={e => onChange({ ...data, obsInternas: e.target.value })}
                />
            </div>
        </div>
    );
}
