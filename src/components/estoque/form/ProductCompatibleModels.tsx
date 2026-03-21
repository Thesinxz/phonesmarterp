"use client";

import { Smartphone, X, Plus, Search } from "lucide-react";
import { cn } from "@/utils/cn";

interface CompatibleModel {
    deviceModel: string;
    deviceModelDisplay: string;
}

interface ProductCompatibleModelsProps {
    compatibleModels: CompatibleModel[];
    isEditing: boolean;
    newModelSearch: string;
    modelSuggestions: any[];
    onToggleEdit: () => void;
    onSearchChange: (val: string) => void;
    onAdd: (model: any) => void;
    onRemove: (idx: number) => void;
    onSave?: () => void;
    isEditMode?: boolean;
}

export function ProductCompatibleModels({
    compatibleModels,
    isEditing,
    newModelSearch,
    modelSuggestions,
    onToggleEdit,
    onSearchChange,
    onAdd,
    onRemove,
    onSave,
    isEditMode
}: ProductCompatibleModelsProps) {
    return (
        <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone size={14} className="text-brand-500" />
                    Modelos Compatíveis
                </label>
                {!isEditing ? (
                    <button
                        type="button"
                        onClick={onToggleEdit}
                        className="text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100 transition-all uppercase"
                    >
                        {compatibleModels.length > 0 ? "Editar" : "Adicionar"}
                    </button>
                ) : (
                    <div className="flex gap-2">
                         {isEditMode && onSave && (
                            <button
                                type="button"
                                onClick={onSave}
                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 transition-all uppercase"
                            >
                                Salvar
                            </button>
                         )}
                        <button
                            type="button"
                            onClick={onToggleEdit}
                            className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 transition-all uppercase"
                        >
                            {isEditMode ? "Fechar" : "Pronto"}
                        </button>
                    </div>
                )}
            </div>

            {isEditing && (
                <div className="mb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar modelo (ex: iPhone 13)"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500"
                            value={newModelSearch}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>

                    {modelSuggestions.length > 0 && (
                        <div className="max-h-40 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 space-y-1">
                            {modelSuggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onAdd(s)}
                                    className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={12} className="text-brand-500" />
                                    {s.deviceModelDisplay}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {compatibleModels.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic py-1">Nenhum modelo selecionado.</p>
                ) : (
                    compatibleModels.map((m, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100"
                        >
                            {m.deviceModelDisplay}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(idx)}
                                    className="p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}
