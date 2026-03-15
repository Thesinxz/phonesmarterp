"use client";

import { useAuth } from "@/context/AuthContext";
import { Building2, ChevronDown, Check, Plus, Settings, Building } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import { NovaEmpresaModal } from "./NovaEmpresaModal";

export function CompanySwitcher() {
    const { empresa, profile, userCompanies, switchCompany, isLoading, isTrialExpired } = useAuth();
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
    
    // Se não tiver empresa e não puder criar, não mostra nada
    if (!empresa && userCompanies.length === 0 && !canCreate) return null;

    return (
        <div className="relative mb-6" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border group",
                    isOpen
                        ? "bg-white border-brand-200 shadow-xl shadow-brand-500/10"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                )}
            >
                <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0 group-hover:scale-105 transition-transform">
                    <Building2 size={20} />
                </div>

                <div className="flex-1 text-left overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 leading-tight">Empresa Ativa</p>
                    <p className="text-sm font-black text-white truncate drop-shadow-sm">{empresa?.nome || "Carregando..."}</p>
                </div>

                <ChevronDown
                    size={16}
                    className={cn("text-white/30 transition-all duration-300 group-hover:text-white", isOpen && "rotate-180")}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
                    <div className="px-3 py-2 border-b border-slate-50 mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alternar Negócio</p>
                    </div>

                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {userCompanies.map((link) => {
                            const isSelected = link.empresa_id === empresa?.id;
                            return (
                                <button
                                    key={link.id}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!isSelected && !isLoading) {
                                            setIsOpen(false);
                                            await switchCompany(link.empresa_id);
                                        } else {
                                            setIsOpen(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group",
                                        isSelected
                                            ? "bg-brand-50 text-brand-600 shadow-sm"
                                            : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                                        isSelected
                                            ? "bg-white border-brand-200 shadow-sm"
                                            : "bg-slate-50 border-transparent group-hover:bg-white group-hover:border-slate-200"
                                    )}>
                                        <Building size={16} className={isSelected ? "text-brand-500" : "text-slate-400"} />
                                    </div>

                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-black truncate">{link.empresa?.nome || "Empresa sem nome"}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{link.papel === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                                    </div>

                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center scale-90 shadow-lg shadow-brand-500/30">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
                        <Link
                            href="/configuracoes/empresas"
                            onClick={() => setIsOpen(false)}
                            className="w-full h-11 flex items-center gap-3 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest"
                        >
                            <Settings size={14} />
                            Gestão de Empresas
                        </Link>
                        
                        {(canCreate || !isTrialExpired) && (
                            <button
                                onClick={() => {
                                    setIsModalOpen(true);
                                    setIsOpen(false);
                                }}
                                className="w-full h-11 flex items-center gap-3 px-4 rounded-xl text-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <Plus size={14} strokeWidth={3} />
                                Nova Empresa
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isModalOpen && (
                <NovaEmpresaModal onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}
