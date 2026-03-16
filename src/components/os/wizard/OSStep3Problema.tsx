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
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">3</div>
                <h2>O que está acontecendo?</h2>
            </div>

            {/* Relato do Problema */}
            <div>
                <div className="section-label">RELATO DO PROBLEMA E DEFEITOS *</div>
                <div className="mb-4">
                    <TagsProblemas
                        selected={data.tags || []}
                        onChange={(tags) => onChange({ ...data, tags })}
                    />
                </div>
                <textarea
                    placeholder="Descreva detalhadamente o que está acontecendo com o aparelho..."
                    className="wizard-field w-full h-32 p-4 mb-0 resize-none text-sm"
                    value={data.problema}
                    onChange={e => onChange({ ...data, problema: e.target.value })}
                />
            </div>

            {/* Checklist de Entrada */}
            <div className="mt-8">
                <div className="section-label">CHECKLIST DE ENTRADA (INSPEÇÃO VISUAL)</div>
                <div className="bg-white rounded-xl border border-slate-200">
                    <ChecklistInspecao
                        tipo="entrada"
                        value={data.checklist}
                        onChange={(val) => onChange({ ...data, checklist: val })}
                    />
                </div>
            </div>

            {/* Observações Internas */}
            <div className="wizard-field mt-8 mb-0">
                <label>OBSERVAÇÕES INTERNAS (SÓ PARA A EQUIPE)</label>
                <textarea
                    placeholder="Anotações sobre senhas, histórico de reparos anteriores, detalhes técnicos..."
                    className="w-full h-24 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 focus:border-indigo-300 outline-none text-slate-600 resize-none text-sm italic transition-all"
                    value={data.obsInternas}
                    onChange={e => onChange({ ...data, obsInternas: e.target.value })}
                />
            </div>
        </div>
    );
}
