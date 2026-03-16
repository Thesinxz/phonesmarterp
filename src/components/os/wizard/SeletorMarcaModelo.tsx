"use client";

import { useState, useEffect, useRef } from "react";
import { getSugestoesEquipamento, type EquipamentoSugestao } from "@/services/catalog_intelligence";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { Check, ChevronDown } from "lucide-react";

interface SeletorMarcaModeloProps {
    marca: string;
    modelo: string;
    onChange: (marca: string, modelo: string) => void;
}

export function SeletorMarcaModelo({ marca, modelo, onChange }: SeletorMarcaModeloProps) {
    const { profile } = useAuth();
    const [sugestoes, setSugestoes] = useState<EquipamentoSugestao[]>([]);
    const [showMarcas, setShowMarcas] = useState(false);
    const [showModelos, setShowModelos] = useState(false);
    
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (profile?.empresa_id) {
            getSugestoesEquipamento(profile.empresa_id).then(setSugestoes);
        }
    }, [profile?.empresa_id]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowMarcas(false);
                setShowModelos(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const marcasUnicas = Array.from(new Set(sugestoes.map(s => s.marca_label))).sort();
    
    const modelosFiltrados = sugestoes
        .filter(s => s.marca_label.toUpperCase() === marca.toUpperCase())
        .sort((a, b) => b.total - a.total);

    return (
        <div ref={wrapperRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo Marca */}
            <div className="wizard-field mb-0 relative">
                <label>MARCA *</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ex: Apple, Samsung..."
                        className="w-full"
                        value={marca}
                        onFocus={() => setShowMarcas(true)}
                        onChange={e => {
                            onChange(e.target.value, modelo);
                            setShowMarcas(true);
                        }}
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {showMarcas && marcasUnicas.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto py-1">
                        {marcasUnicas.map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => {
                                    onChange(m, "");
                                    setShowMarcas(false);
                                    setShowModelos(true);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between group"
                            >
                                <span className="font-medium text-slate-700">{m}</span>
                                {marca.toUpperCase() === m.toUpperCase() && <Check size={14} className="text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Campo Modelo */}
            <div className="wizard-field mb-0 relative">
                <label>MODELO *</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Ex: iPhone 14 Pro Max..."
                        className="w-full"
                        value={modelo}
                        onFocus={() => setShowModelos(true)}
                        onChange={e => {
                            onChange(marca, e.target.value);
                            setShowModelos(true);
                        }}
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {showModelos && modelosFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto py-1">
                        {modelosFiltrados.map(m => (
                            <button
                                key={m.modelo_label}
                                type="button"
                                onClick={() => {
                                    onChange(marca, m.modelo_label);
                                    setShowModelos(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between group"
                            >
                                <div>
                                    <span className="font-medium text-slate-700">{m.modelo_label}</span>
                                    {m.is_global ? (
                                        <span className="ml-2 text-[10px] text-indigo-400 uppercase font-black tracking-tighter bg-indigo-50 px-1 rounded">Comunidade</span>
                                    ) : (
                                        <span className="ml-2 text-[10px] text-emerald-400 uppercase font-black tracking-tighter bg-emerald-50 px-1 rounded">Sua Loja</span>
                                    )}
                                </div>
                                {modelo === m.modelo_label && <Check size={14} className="text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
