"use client";

import { BarChart3, Plus, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { StockBadge } from "@/components/estoque/StockBadge";
import { cn } from "@/utils/cn";

interface Unit {
    id: string;
    name: string;
}

interface UnitStock {
    unit_id: string;
    qty: number;
}

interface ProductStockSectionProps {
    units: Unit[];
    unitStocks?: UnitStock[];
    totalQty: string;
    alertQty: string;
    isEdit?: boolean;
    onAdjust?: () => void;
    onHistory?: () => void;
    onChange: (field: string, value: any) => void;
}

export function ProductStockSection({
    units,
    unitStocks = [],
    totalQty,
    alertQty,
    isEdit,
    onAdjust,
    onHistory,
    onChange
}: ProductStockSectionProps) {
    const alertQtyInt = parseInt(alertQty) || 1;

    return (
        <GlassCard title="Estoque por Unidade" icon={BarChart3}>
            <div className="space-y-4">
                {!isEdit ? (
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Qtd. Inicial em Estoque (Geral)</label>
                        <input
                            type="number"
                            value={totalQty}
                            onChange={(e) => onChange('estoqueQtd', e.target.value)}
                            min="0"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-center font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none text-xl"
                        />
                        <p className="text-[10px] text-slate-400 mt-2 italic">* O estoque será adicionado à unidade padrão do sistema.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {units.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 text-xs italic">Nenhuma unidade carregada.</div>
                        ) : (
                            units.map(unit => {
                                const stock = unitStocks.find(us => us.unit_id === unit.id);
                                const qty = stock?.qty || 0;
                                return (
                                    <div key={unit.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-700">{unit.name}</span>
                                        </div>
                                        <StockBadge qty={qty} alertQty={alertQtyInt} />
                                    </div>
                                );
                            })
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={onAdjust}
                                className="py-2.5 bg-brand-50 border border-brand-100 text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Ajustar
                            </button>
                            <button
                                type="button"
                                onClick={onHistory}
                                className="py-2.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Activity size={14} />
                                Histórico
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">
                        Alerta de Estoque Baixo
                    </label>
                    <p className="text-[10px] text-slate-400 mb-3">
                        O sistema notificará quando o estoque for igual ou menor a:
                    </p>
                    <div className="relative">
                        <input
                            type="number"
                            value={alertQty}
                            onChange={(e) => onChange('estoqueMinimo', e.target.value)}
                            min="0"
                            className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-center font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                        />
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
