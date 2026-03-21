"use client";

import { Barcode, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { BarcodeGenerator } from "@/components/barcode/BarcodeGenerator";
import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";

interface ProductBarcodeSectionProps {
    barcode: string;
    itemType: 'celular' | 'acessorio' | 'peca' | string | null;
    partType?: string;
    imei?: string;
    productName: string;
    salePriceCentavos: number;
    onChange: (barcode: string) => void;
}

export function ProductBarcodeSection({
    barcode,
    itemType,
    partType,
    imei,
    productName,
    salePriceCentavos,
    onChange
}: ProductBarcodeSectionProps) {
    return (
        <GlassCard title="Código de Barras & SKU" icon={Barcode}>
            <div className="space-y-6">
                {/* Preview se já tem código */}
                {barcode && (
                    <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <BarcodeDisplay
                            value={barcode}
                            size="md"
                            showEAN={true}
                            showQR={true}
                            productName={productName}
                            price={salePriceCentavos}
                        />
                    </div>
                )}

                {/* Gerador */}
                <BarcodeGenerator
                    itemType={itemType as any || undefined}
                    partType={partType}
                    imei={imei}
                    currentBarcode={barcode}
                    onGenerated={onChange}
                />

                {/* Campos manuais (avançado) */}
                <details className="group">
                    <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                        <ChevronDown size={10} className="group-open:rotate-180 transition-transform" /> 
                        Editar manualmente
                    </summary>
                    <div className="mt-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cód. Barras/EAN ou SKU</label>
                        <input
                            value={barcode}
                            onChange={(e) => onChange(e.target.value)}
                            className="input-glass mt-1 w-full font-mono text-xs"
                            placeholder="Ex: 7891234567890 ou SMT-123456"
                        />
                    </div>
                </details>
            </div>
        </GlassCard>
    );
}
