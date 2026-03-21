"use client";

import { DollarSign, Layers } from "lucide-react";
import { GlassCard, PriceGroup } from "@/components/ui";
import { PricingSegmentSelector } from "@/components/catalog/PricingSegmentSelector";

interface ProductPricingSectionProps {
    pricingSegmentId: string;
    costPrice: string;
    salePrice: string;
    wholesalePrice: string;
    salePriceUsd: string;
    salePriceUsdRate: string;
    onPriceManualEdit: (manual: boolean) => void;
    onChange: (field: string, value: any) => void;
}

export function ProductPricingSection({
    pricingSegmentId,
    costPrice,
    salePrice,
    wholesalePrice,
    salePriceUsd,
    salePriceUsdRate,
    onPriceManualEdit,
    onChange
}: ProductPricingSectionProps) {
    return (
        <GlassCard title="Precificação" icon={DollarSign}>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                        <Layers size={14} className="text-brand-500" />
                        Perfil de Precificação
                    </label>
                    <PricingSegmentSelector
                        value={pricingSegmentId}
                        onChange={(id) => onChange('pricing_segment_id', id)}
                        allowCreate
                    />
                </div>
                
                <PriceGroup
                    costValue={costPrice}
                    saleValue={salePrice}
                    wholesaleValue={wholesalePrice}
                    onCostChange={(val) => {
                        onPriceManualEdit(false);
                        onChange('precoCusto', val);
                    }}
                    onSaleChange={(val) => {
                        onPriceManualEdit(true);
                        onChange('precoVenda', val);
                    }}
                    onWholesaleChange={(val) => onChange('precoAtacadoBRL', val)}
                />

                <div className="pt-2 border-t border-slate-100">
                    <label className="text-sm font-semibold text-indigo-600 block mb-1.5 uppercase tracking-wider text-[10px]">Atacado (US$)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                                type="text"
                                value={salePriceUsd}
                                onChange={(e) => onChange('sale_price_usd', e.target.value)}
                                className="input-glass pl-7 text-xs font-mono"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px] uppercase">Rate</span>
                            <input
                                type="text"
                                value={salePriceUsdRate}
                                onChange={(e) => onChange('sale_price_usd_rate', e.target.value)}
                                className="input-glass pl-10 text-xs font-mono"
                                placeholder="5.50"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
