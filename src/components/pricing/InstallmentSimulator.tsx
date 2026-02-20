"use client";

import { useState, useEffect } from "react";
import { PaymentGateway } from "@/types/configuracoes";
import { formatCurrency } from "@/utils/formatCurrency";
import { RotateCw, CreditCard } from "lucide-react";
import { cn } from "@/utils/cn";
import { calculateReverseMarkup } from "@/utils/pricing";

interface InstallmentSimulatorProps {
    cost: number;
    margin: number;
    marginType: 'porcentagem' | 'fixo';
    impostoPct: number;
    gateway: PaymentGateway | null;
    productName?: string;
    productCategory?: string;
    className?: string;
}

export function InstallmentSimulator({ cost, margin, marginType, impostoPct, gateway, productName, productCategory, className }: InstallmentSimulatorProps) {
    const [selectedInstallment, setSelectedInstallment] = useState(12); // Padrão 12x

    if (!gateway) return (
        <div className={cn("bg-slate-900 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]", className)}>
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <CreditCard className="text-slate-500" size={24} />
            </div>
            <p className="text-xs text-slate-400 font-medium">Selecione um Gateway para simular parcelas.</p>
        </div>
    );

    // Calcular todas as parcelas usando o motor centralizado
    const installments = Array.from({ length: 21 }, (_, i) => i + 1).map(parcela => {
        let taxa = 0;
        // Tenta pegar a taxa específica da parcela. Array index 0 = 1x
        if (gateway.taxas_credito && gateway.taxas_credito.length >= parcela) {
            taxa = gateway.taxas_credito[parcela - 1]?.taxa || 0;
        }

        // Usa a fórmula centralizada de precificação (Profit Max Engine)
        // Isso garante que a margem de lucro seja respeitada em cada parcela
        const total = calculateReverseMarkup(cost, margin, marginType, impostoPct, taxa);

        const valorParcela = total / parcela;

        return {
            parcela,
            taxa,
            total,
            valorParcela
        };
    });

    const current = installments.find(i => i.parcela === selectedInstallment) || installments[0];

    return (
        <div className={cn("bg-slate-900 rounded-[32px] p-6 border border-white/10 shadow-2xl relative overflow-hidden group", className)}>
            {/* Decorative Background */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/10 rounded-full blur-[80px] group-hover:bg-brand-500/20 transition-colors duration-700" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={14} className="text-brand-400" />
                        Simulador de Parcelas
                    </h3>
                    <p className="text-slate-500 text-[10px] font-bold mt-1 max-w-[180px] truncate">
                        {productName || "Produto Selecionado"}
                    </p>
                </div>
                <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase">{gateway.nome}</p>
                </div>
            </div>

            {/* Visualizador Principal */}
            <div className="flex flex-col items-center justify-center p-8 bg-black/20 rounded-2xl mb-6 relative overflow-hidden border border-white/5 group-hover:border-brand-500/30 transition-colors duration-500">
                <div className="text-center z-10">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 font-black">
                        {selectedInstallment}x de
                    </p>
                    <p className="text-4xl font-black text-white tracking-tighter shadow-brand-glow">
                        {formatCurrency(current.valorParcela)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <p className="text-emerald-400 text-[10px] font-black bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            Total: {formatCurrency(current.total)}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold bg-white/5 px-2 py-1 rounded-lg">
                            Taxa: {current.taxa.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Slider / Selector */}
            <div className="space-y-6 relative z-10">
                <div className="relative h-6 flex items-center">
                    <input
                        type="range"
                        min="1"
                        max="21"
                        step="1"
                        value={selectedInstallment}
                        onChange={(e) => setSelectedInstallment(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all z-20 relative"
                    />
                    <div className="absolute left-0 right-0 flex justify-between pointer-events-none px-1">
                        {/* Marcadores visuais para 1, 6, 12, 18, 21 */}
                        {[1, 6, 12, 18, 21].map(n => (
                            <div key={n} className="w-0.5 h-2 bg-slate-600 rounded-full mt-4" />
                        ))}
                    </div>
                </div>

                {/* Mini Tabela Resumo (Destaques) */}
                <div className="grid grid-cols-3 gap-2">
                    {[1, 10, 12, 18, 21].map(p => {
                        const i = installments.find(inst => inst.parcela === p);
                        if (!i) return null;
                        const isSelected = selectedInstallment === p;
                        return (
                            <button
                                key={p}
                                onClick={() => setSelectedInstallment(p)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all border",
                                    isSelected
                                        ? "bg-brand-600 text-white border-brand-400 shadow-lg shadow-brand-500/20 scale-105"
                                        : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200"
                                )}
                            >
                                <span className="text-[10px] font-black uppercase mb-0.5">{p}x</span>
                                <span className={cn("text-[10px] font-bold", isSelected ? "text-white" : "text-slate-500")}>
                                    {formatCurrency(i.valorParcela)}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
