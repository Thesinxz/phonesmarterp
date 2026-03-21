"use client";

import { Wrench, Info, Smartphone, Building2 } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { PartTypeSelector } from "@/components/estoque/PartTypeSelector";
import { QualitySelector } from "@/components/estoque/QualitySelector";
import { BrandSelector } from "@/components/catalog/BrandSelector";
import { ProductCompatibleModels } from "./ProductCompatibleModels";

interface ProductPartDetailsProps {
    partType: string;
    quality: string;
    brandId: string;
    model: string;
    supplier: string;
    compatibleModels: any[];
    isEditingModels: boolean;
    newModelSearch: string;
    modelSuggestions: any[];
    onChange: (field: string, value: any) => void;
    onModelSearchChange: (val: string) => void;
    onAddCompatibleModel: (model: any) => void;
    onRemoveCompatibleModel: (idx: number) => void;
    onToggleEditModels: () => void;
    onSaveModels?: () => void;
    isEditMode?: boolean;
}

export function ProductPartDetails({
    partType,
    quality,
    brandId,
    model,
    supplier,
    compatibleModels,
    isEditingModels,
    newModelSearch,
    modelSuggestions,
    onChange,
    onModelSearchChange,
    onAddCompatibleModel,
    onRemoveCompatibleModel,
    onToggleEditModels,
    onSaveModels,
    isEditMode
}: ProductPartDetailsProps) {
    return (
        <GlassCard title="Detalhes da Peça" icon={Wrench}>
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                        Tipo de Peça
                    </label>
                    <PartTypeSelector
                        value={partType}
                        onChange={(v) => onChange('part_type', v)}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                        Qualidade
                    </label>
                    <QualitySelector
                        value={quality}
                        onChange={(v) => onChange('quality', v)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Smartphone size={12} className="text-brand-500" />
                            Marca (Aparelho)
                        </label>
                        <BrandSelector
                            value={brandId}
                            onChange={(id) => onChange('brand_id', id)}
                            allowCreate
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Info size={12} className="text-brand-500" />
                            Modelo Específico
                        </label>
                        <input
                            value={model}
                            onChange={(e) => onChange('model', e.target.value)}
                            className="input-glass text-xs font-bold"
                            placeholder="Ex: iPhone 15 Pro Max"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Building2 size={12} className="text-brand-500" />
                            Fornecedor
                        </label>
                        <input
                            value={supplier}
                            onChange={(e) => onChange('supplier', e.target.value)}
                            className="input-glass text-xs font-bold"
                            placeholder="Ex: Distribuidora XYZ"
                        />
                    </div>
                </div>

                <ProductCompatibleModels
                    compatibleModels={compatibleModels}
                    isEditing={isEditingModels}
                    newModelSearch={newModelSearch}
                    modelSuggestions={modelSuggestions}
                    onToggleEdit={onToggleEditModels}
                    onSearchChange={onModelSearchChange}
                    onAdd={onAddCompatibleModel}
                    onRemove={onRemoveCompatibleModel}
                    onSave={onSaveModels}
                    isEditMode={isEditMode}
                />
            </div>
        </GlassCard>
    );
}
