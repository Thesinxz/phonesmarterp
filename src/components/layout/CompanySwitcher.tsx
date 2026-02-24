"use client";

import { useAuth } from "@/context/AuthContext";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import { NovaEmpresaModal } from "./NovaEmpresaModal";

export function CompanySwitcher() {
    const { empresa, profile, userCompanies, switchCompany, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Permite ver o switcher se tiver mais de uma empresa OU for administrador (para criar novas)
    const canCreate = profile?.papel === 'admin';
    if (userCompanies.length <= 1 && !canCreate) return null;

    return (
        <div className="relative mb-6" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border group",
                    isOpen
                        ? "bg-white border-brand-200 shadow-lg shadow-brand-500/5"
                        : "bg-white/50 border-white/50 hover:bg-white hover:border-brand-100 hover:shadow-sm"
                )}
            >
                <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                    <Building2 size={20} />
                </div>

                <div className="flex-1 text-left overflow-hidden">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">Empresa Ativa</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{empresa?.nome || "Carregando..."}</p>
                </div>

                <ChevronDown
                    size={16}
                    className={cn("text-slate-400 transition-transform duration-300", isOpen && "rotate-180")}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 border-b border-slate-50 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Suas Empresas</p>
                    </div>

                    <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                        {userCompanies.map((link) => {
                            const isSelected = link.empresa_id === empresa?.id;
                            return (
                                <button
                                    key={link.id}
                                    onClick={() => {
                                        if (!isSelected) switchCompany(link.empresa_id);
                                        setIsOpen(false);
                                    }}
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                                        isSelected
                                            ? "bg-brand-50 text-brand-600"
                                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                                        isSelected
                                            ? "bg-white border-brand-200 shadow-sm"
                                            : "bg-slate-100 border-transparent group-hover:bg-white group-hover:border-slate-200"
                                    )}>
                                        <Building2 size={14} className={isSelected ? "text-brand-500" : "text-slate-400"} />
                                    </div>

                                    <span className="flex-1 text-xs font-bold truncate">{link.empresa.nome}</span>

                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center scale-75">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-50">
                        <button
                            onClick={() => {
                                setIsModalOpen(true);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                            <Plus size={14} />
                            Nova Empresa
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <NovaEmpresaModal onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}
