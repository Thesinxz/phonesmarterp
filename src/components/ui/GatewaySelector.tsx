import React from "react";
import { CreditCard, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { type PaymentGateway } from "@/types/configuracoes";

interface GatewaySelectorProps {
    gateways: PaymentGateway[];
    selectedId: string | null;
    onSelect: (gateway: PaymentGateway) => void;
    className?: string;
}

export function GatewaySelector({
    gateways,
    selectedId,
    onSelect,
    className
}: GatewaySelectorProps) {
    const selected = gateways.find(g => g.id === selectedId) || gateways.find(g => g.is_default) || gateways[0];

    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                Gateway de Pagamento
            </label>

            <div className="relative group">
                <select
                    className="input-glass h-12 w-full appearance-none pr-10 font-bold text-sm cursor-pointer"
                    value={selectedId || ""}
                    onChange={(e) => {
                        const gw = gateways.find(g => g.id === e.target.value);
                        if (gw) onSelect(gw);
                    }}
                >
                    {gateways.map(gw => (
                        <option key={gw.id} value={gw.id}>
                            {gw.nome} {gw.is_default ? "(Padrão)" : ""}
                        </option>
                    ))}
                </select>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-brand-500 transition-colors">
                    <ChevronDown size={18} />
                </div>
            </div>

            {selected && (
                <div className="flex items-center gap-3 px-3 py-2 bg-brand-50/50 rounded-xl border border-brand-100/50 animate-in fade-in slide-in-from-top-1">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shrink-0">
                        <CreditCard size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-black text-brand-700 uppercase leading-none">
                                {selected.nome} Ativo
                            </p>
                            {selected.is_default && (
                                <span className="bg-brand-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Padrão</span>
                            )}
                        </div>
                        <p className="text-[9px] text-brand-600/70 font-bold mt-1 uppercase tracking-tighter">
                            Pix: {selected.taxa_pix_pct}% | Débito: {selected.taxa_debito_pct}%
                        </p>
                    </div>
                    <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                </div>
            )}
        </div>
    );
}
