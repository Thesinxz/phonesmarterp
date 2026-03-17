"use client";

import { useState, useEffect } from "react";
import { 
    LayoutGrid, 
    Wrench, 
    Package, 
    ShoppingCart, 
    Save, 
    RefreshCw,
    Building2,
    MapPin,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { getUnitsWithCapabilities, updateUnitCapabilities } from "@/app/actions/units";
import { type Database, type Unit } from "@/types/database";

export function UnidadesPanel() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    async function loadUnits() {
        try {
            setLoading(true);
            const data = await getUnitsWithCapabilities();
            setUnits(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar unidades");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUnits();
    }, []);

    async function handleToggleCapability(unit: Unit, capability: 'has_repair_lab' | 'has_parts_stock' | 'has_sales') {
        const newData = {
            has_repair_lab: unit.has_repair_lab,
            has_parts_stock: unit.has_parts_stock,
            has_sales: unit.has_sales,
            [capability]: !unit[capability]
        };

        try {
            setSavingId(unit.id);
            await updateUnitCapabilities(unit.id, newData);
            
            // Update local state
            setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, ...newData } : u));
            toast.success("Capacidades atualizadas");
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar capacidades");
        } finally {
            setSavingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <RefreshCw className="animate-spin text-brand-500" size={32} />
                <p className="text-slate-500 font-medium">Carregando unidades...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {units.map((unit) => (
                    <GlassCard 
                        key={unit.id}
                        title={unit.name}
                        icon={Building2}
                        className={cn(
                            "transition-all border-2",
                            unit.is_active ? "border-transparent" : "opacity-60 border-slate-100"
                        )}
                    >
                        <div className="space-y-6">
                            <div className="flex items-start gap-2 text-slate-500">
                                <MapPin size={16} className="mt-0.5 shrink-0" />
                                <p className="text-xs">{unit.address || "Endereço não informado"}</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Capacidades da Unidade</h4>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => handleToggleCapability(unit, 'has_repair_lab')}
                                        disabled={savingId === unit.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                                            unit.has_repair_lab 
                                                ? "bg-brand-50 border-brand-200 text-brand-700 shadow-sm"
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                unit.has_repair_lab ? "bg-brand-500 text-white shadow-brand-glow" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Wrench size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Laboratório de Reparos</p>
                                                <p className="text-[10px] opacity-70">Unidade executa serviços técnicos</p>
                                            </div>
                                        </div>
                                        {unit.has_repair_lab ? <CheckCircle2 size={18} className="text-brand-500" /> : <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-200" />}
                                    </button>

                                    <button
                                        onClick={() => handleToggleCapability(unit, 'has_parts_stock')}
                                        disabled={savingId === unit.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                                            unit.has_parts_stock 
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                unit.has_parts_stock ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Package size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Estoque de Peças</p>
                                                <p className="text-[10px] opacity-70">Possui almoxarifado técnico</p>
                                            </div>
                                        </div>
                                        {unit.has_parts_stock ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-200" />}
                                    </button>

                                    <button
                                        onClick={() => handleToggleCapability(unit, 'has_sales')}
                                        disabled={savingId === unit.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                                            unit.has_sales 
                                                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                unit.has_sales ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <ShoppingCart size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Ponto de Venda</p>
                                                <p className="text-[10px] opacity-70">Realiza vendas de produtos</p>
                                            </div>
                                        </div>
                                        {unit.has_sales ? <CheckCircle2 size={18} className="text-amber-500" /> : <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-200" />}
                                    </button>
                                </div>
                            </div>

                            {!unit.is_active && (
                                <div className="p-3 bg-red-50 rounded-xl flex items-center gap-3 text-red-700">
                                    <AlertCircle size={18} />
                                    <p className="text-xs font-bold">Esta unidade está desativada no sistema.</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                ))}
            </div>

            <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100 flex items-start gap-4">
                <div className="bg-brand-500 text-white p-2 rounded-lg mt-1 shrink-0">
                    <CheckCircle2 size={18} />
                </div>
                <div>
                    <h5 className="font-bold text-brand-900 leading-tight">Como isso ajuda seu fluxo?</h5>
                    <p className="text-sm text-brand-700 mt-2 leading-relaxed">
                        Ao definir as capacidades, o sistema automatiza processos complexos. Por exemplo:
                        se uma unidade é apenas <strong>Ponto de Venda</strong>, ao abrir uma OS ela solicitará 
                        automaticamente a transferência para a unidade que for <strong>Laboratório de Reparo</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
