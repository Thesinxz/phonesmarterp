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

    const canCreate = profile?.papel === 'admin';
    
    if (!empresa && userCompanies.length === 0 && !canCreate) return null;

    return (
        <div className="relative mb-1" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all group",
                    "bg-slate-50 hover:bg-slate-100 border",
                    isOpen
                        ? "border-blue-200 shadow-sm"
                        : "border-slate-100 hover:border-slate-200"
                )}
                style={{ borderWidth: '0.5px' }}
            >
                <div className="w-8 h-8 rounded-lg bg-[#1E40AF] text-white flex items-center justify-center shrink-0 text-xs font-medium">
                    {empresa?.nome?.charAt(0)?.toUpperCase() || "E"}
                </div>

                <div className="flex-1 text-left overflow-hidden">
                    <p className="text-[9px] font-medium uppercase tracking-[0.05em] text-slate-400 leading-tight">Empresa Ativa</p>
                    <p className="text-[12px] font-medium text-slate-800 truncate">{empresa?.nome || "Carregando..."}</p>
                </div>

                <ChevronDown
                    size={14}
                    className={cn("text-slate-400 transition-all duration-200", isOpen && "rotate-180")}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200" style={{ borderWidth: '0.5px' }}>
                    <div className="px-2.5 py-1.5 border-b border-slate-50 mb-1">
                        <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Alternar Negócio</p>
                    </div>

                    <div className="space-y-0.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-0.5">
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
                                        "w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left",
                                        isSelected
                                            ? "bg-blue-50 text-[#1E40AF]"
                                            : "hover:bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 border",
                                        isSelected
                                            ? "bg-white border-blue-200"
                                            : "bg-slate-50 border-transparent"
                                    )} style={{ borderWidth: '0.5px' }}>
                                        <Building size={12} className={isSelected ? "text-[#1E40AF]" : "text-slate-400"} />
                                    </div>

                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[11px] font-medium truncate">{link.empresa?.nome || "Empresa sem nome"}</p>
                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{link.papel === 'admin' ? 'Admin' : 'Colaborador'}</p>
                                    </div>

                                    {isSelected && (
                                        <div className="w-4 h-4 rounded-full bg-[#1E40AF] text-white flex items-center justify-center">
                                            <Check size={10} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-1 pt-1 border-t border-slate-50 space-y-0.5">
                        <Link
                            href="/configuracoes/empresas"
                            onClick={() => setIsOpen(false)}
                            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-[10px] font-medium"
                        >
                            <Settings size={12} />
                            Gestão de Empresas
                        </Link>
                        
                        {(canCreate || !isTrialExpired) && (
                            <button
                                onClick={() => {
                                    setIsModalOpen(true);
                                    setIsOpen(false);
                                }}
                                className="w-full h-9 flex items-center gap-2.5 px-3 rounded-lg text-[#1E40AF] hover:bg-blue-50 transition-all text-[10px] font-medium"
                            >
                                <Plus size={12} strokeWidth={2.5} />
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
