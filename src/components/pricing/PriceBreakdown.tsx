"use client";

import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";

interface PriceBreakdownProps {
    custo: number;
    precoVenda: number;
    impostoPct: number;
    gatewayPct: number;
    gatewayNome: string;
    className?: string;
}

export function PriceBreakdown({ custo, precoVenda, impostoPct, gatewayPct, gatewayNome, className }: PriceBreakdownProps) {
    const valorImposto = precoVenda * (impostoPct / 100);
    const valorGateway = precoVenda * (gatewayPct / 100);
    const lucro = precoVenda - custo - valorImposto - valorGateway;

    // Evitar divisão por zero e NaNs
    const safePreco = precoVenda || 1;
    const pctCusto = Math.min(100, Math.max(0, (custo / safePreco) * 100));
    const pctImposto = Math.min(100, Math.max(0, (valorImposto / safePreco) * 100));
    const pctGateway = Math.min(100, Math.max(0, (valorGateway / safePreco) * 100));
    // Lucro é o que sobra, para fechar 100% visualmente
    const pctLucro = Math.max(0, 100 - pctCusto - pctImposto - pctGateway);

    return (
        <div className={cn("w-64 bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl z-50", className)}>
            <p className="text-[9px] uppercase font-black text-slate-400 mb-3 tracking-widest flex justify-between">
                <span>Composição do Preço</span>
                <span className="text-white">{formatCurrency(precoVenda)}</span>
            </p>

            {/* Barra Gráfica */}
            <div className="h-1.5 w-full flex rounded-full overflow-hidden mb-4 bg-slate-800">
                <div style={{ width: `${pctCusto}%` }} className="bg-slate-500 transition-all duration-500" />
                <div style={{ width: `${pctImposto}%` }} className="bg-amber-500 transition-all duration-500" />
                <div style={{ width: `${pctGateway}%` }} className="bg-blue-500 transition-all duration-500" />
                <div style={{ width: `${pctLucro}%` }} className="bg-emerald-500 transition-all duration-500" />
            </div>

            <div className="space-y-2.5">
                <Row label="Custo Produto" color="bg-slate-500" value={custo} pct={pctCusto} />
                <Row label="Impostos / NF" color="bg-amber-500" value={valorImposto} pct={pctImposto} />
                <Row label={gatewayNome} color="bg-blue-500" value={valorGateway} pct={pctGateway} />
                <div className="h-px bg-white/10 my-1" />
                <Row label="Lucro Real" color="bg-emerald-500" value={lucro} pct={pctLucro} bold textColor="text-emerald-400" />
            </div>
        </div>
    );
}

function Row({ label, color, value, pct, bold, textColor = "text-slate-300" }: any) {
    return (
        <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                <span className={bold ? "font-bold text-slate-200" : "font-medium text-slate-400"}>{label}</span>
            </div>
            <div className="text-right flex items-center gap-2">
                <span className={cn(bold ? "font-black" : "font-medium", textColor)}>{formatCurrency(value)}</span>
                <span className="text-[9px] text-slate-500 w-8 text-right font-mono opacity-50">{pct.toFixed(0)}%</span>
            </div>
        </div>
    );
}
