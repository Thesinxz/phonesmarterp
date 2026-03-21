"use client";

import { Package, Layers, Tag, Smartphone, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { CategorySelector } from "@/components/catalog/CategorySelector";
import { BrandSelector } from "@/components/catalog/BrandSelector";
import { cn } from "@/utils/cn";

interface ProductGeneralInfoProps {
    name: string;
    categoryId: string;
    productTypeId: string;
    brandId: string;
    description: string;
    showInStorefront: boolean;
    itemType: 'celular' | 'acessorio' | 'peca' | string | null;
    productTypes: any[];
    onChange: (field: string, value: any) => void;
}

export function ProductGeneralInfo({
    name,
    categoryId,
    productTypeId,
    brandId,
    description,
    showInStorefront,
    itemType,
    productTypes,
    onChange
}: ProductGeneralInfoProps) {
    return (
        <GlassCard title="Informações Gerais" icon={Package}>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1.5">Nome do Produto *</label>
                    <input
                        required
                        value={name}
                        onChange={(e) => onChange('name', e.target.value)}
                        className="input-glass"
                        placeholder="Ex: iPhone 13 Pro Max 128GB"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categoria do catálogo */}
                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                            <Layers size={14} className="text-brand-500" />
                            Categoria
                        </label>
                        <CategorySelector
                            value={categoryId}
                            onChange={(id) => onChange('category_id', id)}
                            itemType={itemType || undefined}
                            allowCreate
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                            <Tag size={14} className="text-brand-500" />
                            Tipo de Produto
                        </label>
                        <select
                            value={productTypeId}
                            onChange={(e) => onChange('product_type_id', e.target.value)}
                            className="input-glass"
                        >
                            <option value="">Selecione o tipo</option>
                            {productTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                            <Smartphone size={14} className="text-brand-500" />
                            Marca
                        </label>
                        <BrandSelector
                            value={brandId}
                            onChange={(id) => onChange('brand_id', id)}
                            allowCreate
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1.5">Descrição Opcional</label>
                    <textarea
                        value={description}
                        onChange={(e) => onChange('description', e.target.value)}
                        className="input-glass min-h-[80px]"
                        placeholder="Informações visíveis na vitrine..."
                    />
                </div>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-brand-200 transition-colors">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={showInStorefront}
                            onChange={(e) => onChange('show_in_storefront', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            {showInStorefront ? <Eye size={16} /> : <EyeOff size={16} />}
                            Exibir na Vitrine Online
                        </span>
                        <span className="text-xs text-slate-500">Ative para permitir clientes verem e orçarem este item online.</span>
                    </div>
                </label>
            </div>
        </GlassCard>
    );
}
