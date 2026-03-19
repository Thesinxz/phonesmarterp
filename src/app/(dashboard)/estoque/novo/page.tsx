"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package, Smartphone, Headphones, Wrench, DollarSign, Barcode, Eye, FileText, Upload, Tag, Cpu, X, Info } from "lucide-react";
import { createCatalogItem } from "@/services/catalog";
import { uploadProdutoImage } from "@/services/estoque"; // reaproveitando upload
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { calculateSuggestedPriceBySegment } from "@/utils/product-pricing";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { suggestNCM } from "@/utils/ncm-lookup";
import { Search } from "lucide-react";
import { Brand, PricingSegment, type CatalogItem } from "@/types/database";
import { getExistingDeviceModels, createCatalogItemWithStock } from "@/app/actions/parts";
import { IMEIScanner } from "@/components/inventory/IMEIScanner";
import { registerIMEI } from "@/app/actions/imei";

type ItemType = 'celular' | 'acessorio' | 'peca' | null;

export default function NovoCatalogItemPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const { config } = useFinanceConfig();
    const [loading, setLoading] = useState(false);
    
    // Auxiliares
    const [brands, setBrands] = useState<Brand[]>([]);
    const [pricingSegments, setPricingSegments] = useState<PricingSegment[]>([]);
    
    const [itemType, setItemType] = useState<ItemType>(null);
    const [precoEditado, setPrecoEditado] = useState(false);
    
    // Form State Universal/Específico
    const [form, setForm] = useState({
        // Universais
        name: "",
        cost_price: "0,00",
        sale_price: "0,00",
        stock_qty: "1",
        stock_alert_qty: "1",
        show_in_storefront: true,
        description: "",
        sku: "",
        barcode: "",
        ncm: "85171231",
        cfop: "5102",
        origin_code: "0",
        cest: "",
        image_url: "",
        sale_price_wholesale_brl: "0,00",
        sale_price_usd: "0,00",
        sale_price_usd_rate: "0,00",
        
        // Celulares
        brand_id: "",
        pricing_segment_id: "",
        subcategory: "",
        condicao: "novo_lacrado",
        color: "",
        grade: "",
        storage: "",
        ram: "",
        battery_health: "",
        imei: "",
        imei2: "",
        
        // Acessórios
        accessory_type: "",
        compatible_models: "",
        
        // Peças
        part_type: "",
        quality: "",
        part_brand: "",
        model: "",
        supplier: "",
        compatible_models_parts: "" // será split(',') depois
    });

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const fetchData = async () => {
            const supabase = createClient();
            const [b, s, u] = await Promise.all([
                supabase.from('brands').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('pricing_segments').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('units').select('*').eq('empresa_id', profile.empresa_id).eq('is_active', true).order('name')
            ]);
            if (b.data) setBrands(b.data as any);
            if (s.data) setPricingSegments(s.data as any);
            if (u.data) setUnits(u.data as any);
        }
        fetchData();
    }, [profile?.empresa_id]);

    const [units, setUnits] = useState<any[]>([]);
    const [compatibleModels, setCompatibleModels] = useState<string[]>([]);
    const [modelSearch, setModelSearch] = useState("");
    const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
    const [unitStocks, setUnitStocks] = useState<Record<string, string>>({});

    useEffect(() => {
        if (modelSearch.length < 2 || !profile?.empresa_id) {
            setModelSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            const suggestions = await getExistingDeviceModels(profile.empresa_id, modelSearch);
            setModelSuggestions(suggestions);
        }, 300);
        return () => clearTimeout(timer);
    }, [modelSearch, profile?.empresa_id]);

    const addModelTag = (name: string) => {
        const clean = name.trim();
        if (clean && !compatibleModels.includes(clean)) {
            setCompatibleModels(prev => [...prev, clean]);
        }
        setModelSearch("");
        setModelSuggestions([]);
    };

    const removeModelTag = (name: string) => {
        setCompatibleModels(prev => prev.filter(m => m !== name));
    };

    useEffect(() => {
        if (precoEditado || !config) return;
        
        const custo = parseInt(form.cost_price.replace(/\D/g, ''), 10);
        if (isNaN(custo) || custo <= 0) return;

        let segment = null;
        if (itemType === 'celular' && form.pricing_segment_id) {
            segment = pricingSegments.find(s => s.id === form.pricing_segment_id);
        } else if (itemType === 'acessorio' || itemType === 'peca') {
            // usar margem bruta opcional, mas no sistema legado é só custo se não tiver segmento.
            // Para peças e acessórios, vamos exigir preencher ou aplicar lógica default
            return;
        }

        if (segment) {
            const sugerido = calculateSuggestedPriceBySegment(custo, segment as any, config.taxa_nota_fiscal_pct);
            setForm(prev => ({ ...prev, sale_price: (sugerido / 100).toFixed(2).replace('.', ',') }));
        }
    }, [form.cost_price, form.pricing_segment_id, config, precoEditado, itemType, pricingSegments]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm(prev => ({ ...prev, [name]: checked }));
            return;
        }

        if (name === 'cost_price' || name === 'sale_price') {
            let numStr = value.replace(/\D/g, "");
            if (numStr === "") numStr = "0";
            const num = parseInt(numStr, 10);
            const strValue = (num / 100).toFixed(2).replace('.', ',');
            setForm(prev => ({ ...prev, [name]: strValue }));
            if (name === 'sale_price') setPrecoEditado(true);
            return;
        }

        setForm(prev => {
            const up = { ...prev, [name]: value };
            if (name === 'brand_id' && itemType === 'celular') {
                const b = brands.find(x => x.id === value);
                if (b?.default_pricing_segment_id) {
                    up.pricing_segment_id = b.default_pricing_segment_id;
                }
            }
            return up;
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.empresa_id) return;

        try {
            toast.loading("Enviando imagem...", { id: "upload" });
            const url = await uploadProdutoImage(file, profile.empresa_id);
            setForm(prev => ({ ...prev, image_url: url }));
            toast.success("Imagem enviada!", { id: "upload" });
        } catch (error) {
            toast.error("Erro ao enviar imagem", { id: "upload" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!profile?.empresa_id) throw new Error("Empresa não identificada");
            if (!itemType) throw new Error("Selecione o tipo de item");

            const cost_price = parseInt(form.cost_price.replace(/\D/g, ''), 10);
            const sale_price = parseInt(form.sale_price.replace(/\D/g, ''), 10);

            const stock_alert_qty = parseInt(form.stock_alert_qty, 10) || 1;

            const finalUnitStocks: Record<string, number> = {};
            if (units.length > 0) {
                if (units.length > 1) {
                    units.forEach(u => {
                        finalUnitStocks[u.id] = parseInt(unitStocks[u.id] || "0", 10) || 0;
                    });
                } else {
                    // Se só tem uma unidade, usa ela diretamente com o stock_qty do form
                    finalUnitStocks[units[0].id] = parseInt(form.stock_qty, 10) || 0;
                }
            } else if (profile.unit_id) {
                finalUnitStocks[profile.unit_id] = parseInt(form.stock_qty, 10) || 0;
            }

            const itemData = {
                empresa_id: profile.empresa_id,
                item_type: itemType,
                name: form.name,
                cost_price: isNaN(cost_price) ? 0 : cost_price,
                sale_price: isNaN(sale_price) ? 0 : sale_price,
                stock_qty: Object.values(finalUnitStocks).reduce((a, b) => a + b, 0),
                stock_alert_qty: stock_alert_qty,
                show_in_storefront: form.show_in_storefront,
                description: form.description || null,
                sku: form.sku || null,
                barcode: form.barcode || null,
                ncm: form.ncm || null,
                cfop: form.cfop || null,
                origin_code: form.origin_code || null,
                cest: form.cest || null,
                image_url: form.image_url || null,
                
                // Celular
                brand_id: (itemType === 'celular' && form.brand_id) ? form.brand_id : null,
                pricing_segment_id: (itemType === 'celular' && form.pricing_segment_id) ? form.pricing_segment_id : null,
                subcategory: form.subcategory || null,
                condicao: itemType === 'celular' ? form.condicao : null,
                color: form.color || null,
                grade: form.grade || null,
                storage: form.storage || null,
                ram: form.ram || null,
                battery_health: form.battery_health ? parseInt(form.battery_health, 10) : null,
                imei: form.imei || null,
                imei2: form.imei2 || null,
                
                // Acessórios
                accessory_type: itemType === 'acessorio' ? form.accessory_type : null,
                compatible_models: itemType === 'acessorio' ? form.compatible_models : null,

                part_brand: itemType === 'peca' ? form.part_brand : null,
                supplier: itemType === 'peca' ? form.supplier : null,
                model: itemType === 'peca' ? form.model : null,
                sale_price_usd: Math.round(parseFloat(form.sale_price_usd.replace(',', '.')) * 100) || 0,
                sale_price_usd_rate: parseFloat(form.sale_price_usd_rate.replace(',', '.')) || 0,
                wholesale_price_brl: Math.round(parseFloat(form.sale_price_wholesale_brl.replace(',', '.')) * 100) || 0,
            };

            const newItem = await createCatalogItemWithStock({
                item: itemData,
                unitStocks: finalUnitStocks,
                compatibleModels: itemType === 'peca' ? compatibleModels : []
            });

            // Registrar IMEI no sistema de rastreabilidade se for celular
            if (itemType === 'celular' && form.imei && profile.id) {
                // Determinar unidade para o IMEI (Matriz ou a única selecionada)
                const unitId = profile.unit_id || Object.keys(finalUnitStocks)[0];
                
                await registerIMEI({
                    tenantId: profile.empresa_id,
                    imei: form.imei,
                    catalogItemId: newItem.id,
                    unitId: unitId,
                    registeredBy: profile.id
                });
            }

            toast.success("Item salvo com sucesso!");
            router.push("/estoque");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao salvar o item");
        } finally {
            setLoading(false);
        }
    };

    if (!itemType) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 page-enter pb-20">
                 <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Novo Item</h1>
                        <p className="text-slate-500 text-sm">Selecione o tipo de item que deseja cadastrar</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-8">
                    <button onClick={() => setItemType('celular')} className="group flex flex-col items-center text-center p-6 sm:p-8 bg-white border-2 border-slate-100 hover:border-blue-400 rounded-3xl sm:rounded-[32px] transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 text-blue-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                            <Smartphone size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-2">Celular</h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Aparelhos para revenda. Campos para IMEI, saúde da bateria, grade.</p>
                    </button>

                    <button onClick={() => setItemType('acessorio')} className="group flex flex-col items-center text-center p-6 sm:p-8 bg-white border-2 border-slate-100 hover:border-emerald-400 rounded-3xl sm:rounded-[32px] transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                            <Headphones size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-2">Acessório & Película</h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Capas, cabos, películas, fones. Formulário rápido sem dados do aparelho.</p>
                    </button>

                    <button onClick={() => setItemType('peca')} className="group flex flex-col items-center text-center p-6 sm:p-8 bg-white border-2 border-slate-100 hover:border-amber-400 rounded-3xl sm:rounded-[32px] transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 text-amber-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                            <Wrench size={32} className="sm:w-10 sm:h-10" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-2">Peça (Assistência)</h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">Telas, baterias, conectores. Compatibilidade, qualidade e fornecedor.</p>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 page-enter pb-32">
            <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setItemType(null)} className="p-2 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-sm">
                        <ArrowLeft size={18} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            {itemType === 'celular' ? <><Smartphone className="text-blue-500" size={20}/> Celular</> :
                             itemType === 'acessorio' ? <><Headphones className="text-emerald-500" size={20}/> Acessório</> :
                             <><Wrench className="text-amber-500" size={20}/> Peça</>}
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cadastro Unificado</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => router.back()} className="btn-secondary h-11 hidden sm:flex">Cancelar</button>
                    <button type="submit" disabled={loading} className="btn-primary h-11">
                        <Save size={18} /> {loading ? "Salvando..." : "Salvar"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal (Esquerda) */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard title="Informações Gerais" icon={Package}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Nome do Produto *</label>
                                <input required name="name" value={form.name} onChange={handleChange} className="input-glass mt-1 w-full text-lg font-bold" placeholder="Ex: iPhone 13 Pro Max 128GB" />
                            </div>

                            {itemType === 'celular' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Marca</label>
                                        <select name="brand_id" value={form.brand_id} onChange={handleChange} className="input-glass mt-1 w-full font-bold">
                                            <option value="">Selecione...</option>
                                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Segmento (Precificação)</label>
                                        <select name="pricing_segment_id" value={form.pricing_segment_id} onChange={handleChange} className="input-glass mt-1 w-full font-bold text-indigo-700">
                                            <option value="">Nenhum / Manual</option>
                                            {pricingSegments.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {(s.default_margin/100).toFixed(2)})</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Subcategoria / Modelo</label>
                                            <input name="subcategory" value={form.subcategory} onChange={handleChange} className="input-glass mt-1 w-full" placeholder="Ex: iPhone 13 Pro Max" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Condição</label>
                                            <select name="condicao" value={form.condicao} onChange={handleChange} className="input-glass mt-1 w-full font-bold">
                                                <option value="novo_lacrado">Novo Lacrado</option>
                                                <option value="seminovo">Seminovo</option>
                                                <option value="usado">Usado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {itemType === 'acessorio' && (
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Categoria</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['pelicula', 'capa', 'cabo', 'carregador', 'fone', 'acessorio'].map(t => (
                                                <button key={t} type="button" onClick={() => setForm(p => ({...p, accessory_type: t}))}
                                                    className={cn("px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border-2",
                                                        form.accessory_type === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    )}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                     <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Modelos Compatíveis</label>
                                        <input name="compatible_models" value={form.compatible_models} onChange={handleChange} className="input-glass mt-1 w-full" placeholder="Ex: iPhone 15, Galaxy S24" />
                                    </div>
                                </div>
                            )}

                            {itemType === 'peca' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Tipo de Peça</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[ 
                                                {v:'tela', l:'Tela/Frontal'}, {v:'bateria', l:'Bateria'}, {v:'conector', l:'Conector'}, 
                                                {v:'camera', l:'Câmera'}, {v:'tampa_traseira', l:'Tampa'}, {v:'outro', l:'Outro'} 
                                            ].map(t => (
                                                 <button key={t.v} type="button" onClick={() => setForm(p => ({...p, part_type: t.v}))}
                                                    className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                                                        form.part_type === t.v ? "border-amber-500 bg-amber-50 text-amber-700" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    )}>
                                                    {t.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Qualidade</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['original', 'oem', 'paralela', 'china'].map(t => (
                                                 <button key={t} type="button" onClick={() => setForm(p => ({...p, quality: t}))}
                                                    className={cn("px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border-2",
                                                        form.quality === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    )}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Marca (Aparelho)</label>
                                        <input name="part_brand" value={form.part_brand} onChange={handleChange} className="input-glass mt-1 w-full" placeholder="Ex: Apple" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase">Modelo Específico</label>
                                        <input name="model" value={form.model} onChange={handleChange} className="input-glass mt-1 w-full" placeholder="Ex: iPhone 15 Pro Max" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-1">Modelos Compatíveis</label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-2xl min-h-[50px] focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                                            {compatibleModels.map(tag => (
                                                <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 group">
                                                    {tag}
                                                    <button type="button" onClick={() => removeModelTag(tag)} className="p-0.5 hover:bg-indigo-200 rounded-md transition-colors">
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                            <div className="relative flex-1 min-w-[150px]">
                                                <input
                                                    value={modelSearch}
                                                    onChange={(e) => setModelSearch(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (modelSearch) addModelTag(modelSearch);
                                                        }
                                                    }}
                                                    className="w-full bg-transparent border-none outline-none text-sm font-medium p-0"
                                                    placeholder="Ex: Moto E7, Samsung A15..."
                                                />
                                                {modelSuggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 z-50 overflow-hidden">
                                                        {modelSuggestions.map(s => (
                                                            <button
                                                                key={s.deviceModel}
                                                                type="button"
                                                                onClick={() => addModelTag(s.deviceModelDisplay)}
                                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between group"
                                                            >
                                                                <span className="font-bold text-slate-700">{s.deviceModelDisplay}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{s.usageCount}x usado</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                                            <Info size={12}/> Digite os modelos que esta peça serve. Pressione Enter para adicionar.
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase">Fornecedor</label>
                                        <input name="supplier" value={form.supplier} onChange={handleChange} className="input-glass mt-1 w-full" placeholder="Ex: Distribuidora XYZ" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Descrição Opcional</label>
                                <textarea name="description" value={form.description} onChange={handleChange} className="input-glass mt-1 w-full min-h-[80px]" placeholder="Informações visíveis na vitrine..." />
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer border border-slate-100 hover:border-brand-200 transition-colors">
                                <div className="relative">
                                    <input type="checkbox" name="show_in_storefront" checked={form.show_in_storefront} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Eye size={16}/> Exibir na Vitrine Online</span>
                                    <span className="text-xs text-slate-500">Ative para permitir clientes verem e orçarem este item online.</span>
                                </div>
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1"><Barcode size={14}/> Cód. Barras/EAN</label>
                                    <input name="barcode" value={form.barcode} onChange={handleChange} className="input-glass mt-1 w-full font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1"><Tag size={14}/> SKU</label>
                                    <input name="sku" value={form.sku} onChange={handleChange} className="input-glass mt-1 w-full font-mono text-sm uppercase" />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {itemType === 'celular' && (
                        <GlassCard title="Especificações Técnicas" icon={Cpu}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Cor</label>
                                    <input name="color" value={form.color} onChange={handleChange} className="input-glass mt-1 w-full font-medium" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Armazenamento</label>
                                    <input name="storage" value={form.storage} onChange={handleChange} placeholder="Ex: 128GB" className="input-glass mt-1 w-full font-mono font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Memória RAM</label>
                                    <input name="ram" value={form.ram} onChange={handleChange} placeholder="Ex: 6GB" className="input-glass mt-1 w-full font-mono" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Saúde Bateria %</label>
                                    <input name="battery_health" type="number" min="0" max="100" value={form.battery_health} onChange={handleChange} className="input-glass mt-1 w-full font-mono font-bold text-emerald-600" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Grade</label>
                                    <select name="grade" value={form.grade} onChange={handleChange} className="input-glass mt-1 w-full font-bold">
                                        <option value="">Nenhuma / Novo</option>
                                        <option value="A">A (Impecável)</option>
                                        <option value="B">B (Marcas leves)</option>
                                        <option value="C">C (Marcas visíveis)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="text-xs font-black text-slate-400 uppercase block mb-2 font-bold tracking-tight">IMEI Principal (Escaneie ou digite)</label>
                                <IMEIScanner 
                                    value={form.imei}
                                    onChange={(val) => setForm(prev => ({ ...prev, imei: val }))}
                                    tenantId={profile?.empresa_id || ""}
                                />
                            </div>
                        </GlassCard>
                    )}

                    <GlassCard title="Classificação Fiscal (NFC-e / NF-e)" icon={FileText}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-black text-slate-400 uppercase flex items-center justify-between">
                                    NCM *
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const suggestion = suggestNCM(form.name);
                                            if (suggestion) {
                                                setForm(prev => ({ ...prev, ncm: suggestion }));
                                                toast.success(`NCM sugerido: ${suggestion}`);
                                            } else {
                                                toast.info("Não encontramos uma sugestão para este nome.");
                                            }
                                        }}
                                        className="text-[10px] text-brand-600 hover:underline flex items-center gap-1"
                                    >
                                        <Search size={10} /> Sugerir
                                    </button>
                                </label>
                                <input name="ncm" required value={form.ncm} onChange={handleChange} className="input-glass mt-1 w-full font-mono font-bold" />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">CFOP *</label>
                                <input name="cfop" required value={form.cfop} onChange={handleChange} className="input-glass mt-1 w-full font-mono font-bold" />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Origem *</label>
                                <select name="origin_code" value={form.origin_code} onChange={handleChange} className="input-glass mt-1 w-full font-mono font-bold">
                                    <option value="0">0 - Nacional</option>
                                    <option value="1">1 - Estrangeira Import.</option>
                                    <option value="2">2 - Estrangeira Interna</option>
                                </select>
                            </div>
                            <div className="col-span-4">
                                <label className="text-xs font-black text-slate-400 uppercase">CEST (Opcional)</label>
                                <input name="cest" value={form.cest} onChange={handleChange} className="input-glass mt-1 w-full font-mono" />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Coluna Lateral (Direita) */}
                <div className="space-y-6">
                    <GlassCard title="Preços e Atacado" icon={DollarSign} className="bg-brand-50/10 border-brand-100">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Preço de Custo (R$)</label>
                                <input name="cost_price" value={form.cost_price} onChange={handleChange} className="input-glass mt-1 w-full text-right text-xl font-mono text-slate-500 font-bold" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-emerald-600 uppercase flex justify-between">
                                    <span>Preço Varejo (R$)</span>
                                    {precoEditado && <span className="text-amber-500 lowercase">(manual)</span>}
                                </label>
                                <input name="sale_price" value={form.sale_price} onChange={handleChange} className="input-glass mt-1 w-full text-right text-2xl font-black font-mono text-emerald-600 border-emerald-200 bg-white" />
                            </div>
                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-600 uppercase">Atacado (US$)</label>
                                        <input name="sale_price_usd" value={form.sale_price_usd} onChange={handleChange} className="input-glass mt-1 w-full text-right font-bold text-indigo-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-brand-600 uppercase">Atacado (R$)</label>
                                        <input name="sale_price_wholesale_brl" value={form.sale_price_wholesale_brl} onChange={handleChange} className="input-glass mt-1 w-full text-right font-bold text-brand-600" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Cotação Base USD</label>
                                    <input name="sale_price_usd_rate" value={form.sale_price_usd_rate} onChange={handleChange} className="input-glass mt-1 w-full text-right text-sm text-slate-500" />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Gestão de Estoque" icon={Package}>
                        <div className="space-y-4">
                            {units.length > 1 ? (
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-400 uppercase">Estoque Inicial por Unidade</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {units.map(u => (
                                            <div key={u.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 truncate">{u.name}</label>
                                                <input
                                                    type="number"
                                                    value={unitStocks[u.id] || "0"}
                                                    onChange={(e) => setUnitStocks(prev => ({ ...prev, [u.id]: e.target.value }))}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Quantidade Atual</label>
                                    <input name="stock_qty" type="number" value={form.stock_qty} onChange={handleChange} className="input-glass mt-1 w-full text-xl font-black text-center" />
                                </div>
                            )}
                            
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <label className="text-[10px] font-black text-amber-600 uppercase">Aviso de Estoque Baixo</label>
                                <p className="text-xs text-amber-700/70 mb-2 leading-relaxed">Alertar quando o estoque for igual ou menor a:</p>
                                <input name="stock_alert_qty" type="number" value={form.stock_alert_qty} onChange={handleChange} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-center font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Foto do Produto" icon={Upload}>
                        <div className="space-y-4 text-center">
                            {form.image_url ? (
                                <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-100">
                                    <img src={form.image_url} alt="Imagem" className="w-full h-48 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button type="button" onClick={() => setForm(p => ({...p, image_url: ""}))} className="bg-white text-red-500 px-4 py-2 rounded-xl text-xs font-bold">Remover</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 bg-slate-50 hover:bg-brand-50 rounded-2xl p-6 transition-colors relative cursor-pointer">
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                                    <span className="text-xs font-bold text-slate-500 uppercase">Clique para Upload</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </form>
    );
}
