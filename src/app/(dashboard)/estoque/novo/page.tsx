"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Package, Smartphone, Headphones, Wrench, DollarSign, Barcode, Eye, FileText, Upload, Tag, Cpu, X, Info, ChevronDown, Layers } from "lucide-react";
import { createCatalogItem } from "@/services/catalog";
import { uploadProdutoImage } from "@/services/estoque"; // reaproveitando upload
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { calculateSuggestedPriceBySegment } from "@/utils/product-pricing";
import { GlassCard, PageHeader, PriceGroup } from "@/components/ui";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { suggestNCM } from "@/utils/ncm-lookup";
import { Search } from "lucide-react";
import { Brand, PricingSegment, type CatalogItem } from "@/types/database";
import { getExistingDeviceModels, createCatalogItemWithStock } from "@/app/actions/parts";
import { IMEIScanner } from "@/components/inventory/IMEIScanner";
import { validateIMEILuhn } from "@/utils/tac-lookup";
import { PartTypeSelector } from "@/components/estoque/PartTypeSelector";
import { QualitySelector } from "@/components/estoque/QualitySelector";
import { registerIMEI } from "@/app/actions/imei";
import { BarcodeGenerator } from "@/components/barcode/BarcodeGenerator";
import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { generateEAN13, generateSKU, generatePartSKU } from "@/utils/barcode";
import { DeviceFields } from "@/components/inventory/DeviceFields";
import { FiscalPanel } from "@/components/inventory/FiscalPanel";
import { useEmpresaFiscal } from "@/hooks/useEmpresaFiscal";
import { CategorySelector } from "@/components/catalog/CategorySelector";
import { BrandSelector } from "@/components/catalog/BrandSelector";
import { PricingSegmentSelector } from "@/components/catalog/PricingSegmentSelector";
import { useCatalogCategories } from "@/hooks/useCatalogCategories";
import { useCatalogData } from "@/hooks/useCatalogData";

type ItemType = 'celular' | 'acessorio' | 'peca' | null;

function NovoCatalogContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTipo = searchParams.get('tipo') as ItemType | null;
    const { profile } = useAuth();
    const { config } = useFinanceConfig();
    const { regime, tributacoes } = useEmpresaFiscal();
    const [loading, setLoading] = useState(false);
    
    // Auxiliares
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
        category_id: "",
        
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
        serial_number: "",
        battery_cycle: "",
        dias_garantia: "90",
        observacao: "",
        data_entrada: "",
        // Fiscal avançado
        cst_csosn: "",
        cfop_estadual_saida: "5102",
        cfop_interestadual_saida: "6102",
        cfop_estadual_entrada: "",
        cfop_interestadual_entrada: "",
        codigo_beneficio_fiscal: "",
        tributacao_id: "",
        
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

    const [itemType, setItemType] = useState<ItemType>(initialTipo);
    const { segments, brands, productTypes, loading: catalogLoading } = useCatalogData();
    const { categories } = useCatalogCategories(itemType || undefined);
    
    // Auxiliares
    const [units, setUnits] = useState<any[]>([]);
    const [compatibleModels, setCompatibleModels] = useState<string[]>([]);
    const [modelSearch, setModelSearch] = useState("");
    const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
    const [unitStocks, setUnitStocks] = useState<Record<string, string>>({});

    
    // Fetch Units independently if not in useCatalogData
    useEffect(() => {
        if (!profile?.empresa_id) return;
        const fetchUnits = async () => {
            const supabase = createClient();
            const { data } = await supabase.from('units').select('*').eq('empresa_id', profile.empresa_id).eq('is_active', true).order('name');
            if (data) setUnits(data);
        }
        fetchUnits();
    }, [profile?.empresa_id]);

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
    
    // Auto-select Pricing Segment based on Item Type
    useEffect(() => {
        if (!itemType || !productTypes.length || form.pricing_segment_id) return;
        
        const pt = productTypes.find(t => t.slug === itemType);
        if (pt?.default_pricing_segment_id) {
            setForm(prev => ({ ...prev, pricing_segment_id: pt.default_pricing_segment_id as string }));
        }
    }, [itemType, productTypes, form.pricing_segment_id]);

    // Auto-select Pricing Segment based on Category
    useEffect(() => {
        if (!form.category_id || !categories.length || form.pricing_segment_id) return;
        
        const cat = categories.find(c => c.id === form.category_id);
        if (cat?.default_pricing_segment_id) {
            setForm(prev => ({ ...prev, pricing_segment_id: cat.default_pricing_segment_id as string }));
        }
    }, [form.category_id, categories, form.pricing_segment_id]);

    useEffect(() => {
        if (precoEditado || !config) return;
        
        const custo = parseInt(form.cost_price.replace(/\D/g, ''), 10);
        if (isNaN(custo) || custo <= 0) return;

        let segment = null;
        if (form.pricing_segment_id) {
            segment = segments.find(s => s.id === form.pricing_segment_id);
        }

        if (segment) {
            const sugerido = calculateSuggestedPriceBySegment(custo, segment as any, config.taxa_nota_fiscal_pct);
            setForm(prev => ({ ...prev, sale_price: (sugerido / 100).toFixed(2).replace('.', ',') }));
        }
    }, [form.cost_price, form.pricing_segment_id, config, precoEditado, itemType, segments]);

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
        
        console.log('[Debug] handleSubmit started. itemType:', itemType);
        
        if (!profile?.empresa_id) {
            console.error('[Debug] profile.empresa_id missing:', profile);
            toast.error("Empresa não identificada. Recarregue a página.");
            return;
        }



        setLoading(true);

        try {
            if (!itemType) throw new Error("Selecione o tipo de item");

            // Se for peça e o nome for vazio, tentar gerar um nome básico
            if (itemType === 'peca' && !form.name.trim() && form.part_type) {
                const typeLabel = ['tela', 'bateria', 'conector', 'camera', 'tampa', 'vidro'].includes(form.part_type) 
                    ? form.part_type.charAt(0).toUpperCase() + form.part_type.slice(1) 
                    : 'Componente';
                const qualityLabel = form.quality ? ` - ${form.quality.toUpperCase()}` : '';
                const brandLabel = form.part_brand ? ` p/ ${form.part_brand}` : '';
                const generatedName = `${typeLabel}${brandLabel}${qualityLabel}`;
                setForm(prev => ({ ...prev, name: generatedName }));
                form.name = generatedName; // update local ref for immediate use
            }

            if (!form.name.trim()) throw new Error("Nome do produto é obrigatório");

            const cost_price = parseInt(form.cost_price.replace(/\D/g, ''), 10);
            const sale_price = parseInt(form.sale_price.replace(/\D/g, ''), 10);

            const stock_alert_qty = parseInt(form.stock_alert_qty, 10) || 1;

            const qtyPrincipal = Math.max(0, parseInt(form.stock_qty, 10) || 0);
            const finalUnitStocks: Record<string, number> = {};

            if (units.length > 1) {
                // Múltiplas unidades — usar os inputs individuais de cada unidade
                units.forEach(u => {
                    const qty = Math.max(0, parseInt(unitStocks[u.id] || "0", 10) || 0);
                    finalUnitStocks[u.id] = qty;
                });
            } else if (units.length === 1) {
                // Uma unidade — usar o campo qty principal
                finalUnitStocks[units[0].id] = qtyPrincipal;
            } else if (profile?.unit_id) {
                // Fallback: units ainda não carregou mas perfil tem unit_id
                finalUnitStocks[profile.unit_id] = qtyPrincipal;
            } else {
                // Último fallback: salvar sem unit_stock (só o stock_qty no catalog_item)
                console.warn('[Estoque] Nenhuma unidade disponível, salvando sem unit_stock');
            }

            // stock_qty total = soma de todas as unidades (ou qty principal como fallback)
            const stockQtyTotal = Object.values(finalUnitStocks).reduce((a, b) => a + b, 0) || qtyPrincipal;

            console.log('[Debug] finalUnitStocks:', finalUnitStocks);
            console.log('[Debug] stock_qty total:', stockQtyTotal);

            // Auto-gerar barcode se não tiver
            let finalBarcode = form.barcode;
            let finalSku = form.sku;
            if (!finalBarcode) {
                finalBarcode = itemType === 'peca'
                    ? generatePartSKU(form.part_type)
                    : generateEAN13();
            }
            if (!finalSku) {
                finalSku = generateSKU();
            }

            const itemData = {
                empresa_id: profile.empresa_id,
                item_type: itemType,
                name: form.name,
                cost_price: isNaN(cost_price) ? 0 : cost_price,
                sale_price: isNaN(sale_price) ? 0 : sale_price,
                stock_qty: stockQtyTotal,
                stock_alert_qty: stock_alert_qty,
                show_in_storefront: form.show_in_storefront,
                description: form.description || null,
                sku: finalSku,
                barcode: finalBarcode,
                ncm: form.ncm || null,
                cfop: form.cfop || null,
                origin_code: form.origin_code || null,
                cest: form.cest || null,
                image_url: form.image_url || null,
                
                // Geral
                brand_id: form.brand_id || null,
                pricing_segment_id: form.pricing_segment_id || null,
                subcategory: form.subcategory || null,
                
                // Celular
                condicao: itemType === 'celular' ? form.condicao : null,
                color: form.color || null,
                grade: form.grade || null,
                storage: form.storage || null,
                ram: form.ram || null,
                battery_health: form.battery_health ? parseInt(form.battery_health, 10) : null,
                imei: form.imei || null,
                imei2: form.imei2 || null,
                
                serial_number: form.serial_number || null,
                battery_cycle: form.battery_cycle ? parseInt(form.battery_cycle) : null,
                dias_garantia: parseInt(form.dias_garantia || '90') || 90,
                observacao: form.observacao || null,
                data_entrada: form.data_entrada || null,
                // Fiscal avançado
                cst_csosn: form.cst_csosn || null,
                cfop_estadual_saida: form.cfop_estadual_saida || null,
                cfop_interestadual_saida: form.cfop_interestadual_saida || null,
                cfop_estadual_entrada: form.cfop_estadual_entrada || null,
                cfop_interestadual_entrada: form.cfop_interestadual_entrada || null,
                codigo_beneficio_fiscal: form.codigo_beneficio_fiscal || null,
                tributacao_id: form.tributacao_id || null,

                // Acessórios
                accessory_type: itemType === 'acessorio' ? form.accessory_type : null,
                compatible_models: itemType === 'acessorio' ? form.compatible_models : null,

                // Peças
                part_type: itemType === 'peca' ? form.part_type : null,
                quality: itemType === 'peca' ? form.quality : null,
                part_brand: itemType === 'peca' ? form.part_brand : null,
                supplier: itemType === 'peca' ? form.supplier : null,
                model: itemType === 'peca' ? form.model : null,
                sale_price_usd: Math.round(parseFloat(form.sale_price_usd.replace(',', '.')) * 100) || 0,
                sale_price_usd_rate: parseFloat(form.sale_price_usd_rate.replace(',', '.')) || 0,
                wholesale_price_brl: Math.round(parseFloat(form.sale_price_wholesale_brl.replace(',', '.')) * 100) || 0,
            };

            // Se units não carregou ainda (race condition), buscar unidade inline
            let finalUnitStocksResolved = { ...finalUnitStocks };
            if (Object.keys(finalUnitStocksResolved).length === 0 && profile.empresa_id) {
                try {
                    const supabase = createClient();
                    const { data: unitsData } = await supabase
                        .from('units')
                        .select('id')
                        .eq('empresa_id', profile.empresa_id)
                        .eq('is_active', true)
                        .order('name')
                        .limit(1)
                        .single();
                    if (unitsData) {
                        finalUnitStocksResolved[(unitsData as any).id] = qtyPrincipal;
                    }
                } catch (err) {
                    console.warn('[Estoque] Não foi possível buscar unidade inline:', err);
                }
            }

            const newItem = await createCatalogItemWithStock({
                item: itemData,
                unitStocks: finalUnitStocksResolved,
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
            <PageHeader
                title={
                    itemType === 'celular' ? "Novo Celular" :
                    itemType === 'acessorio' ? "Novo Acessório" : "Nova Peça"
                }
                subtitle="Cadastro Unificado"
                onBack={() => setItemType(null)}
                actions={[
                    {
                        label: loading ? "Salvando..." : "Salvar",
                        onClick: () => {}, // O botão de submit do form cuidará disso, mas o PageHeader renderiza botões. 
                        // Na verdade, para forms, é melhor que o botão seja type="submit".
                        // O PageHeader aceita 'icon' e 'onClick' ou 'href'. 
                        // Vou passar o botão manualmente para manter o type="submit".
                    }
                ]}
            >
                <div className="flex gap-3">
                    <button type="button" onClick={() => router.back()} className="btn-secondary h-11 hidden sm:flex">Cancelar</button>
                    <button type="submit" disabled={loading} className="btn-primary h-11">
                        <Save size={18} /> {loading ? "Salvando..." : "Salvar"}
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal (Esquerda) */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard title="Informações Gerais" icon={Package}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Nome do Produto *</label>
                                <input required name="name" value={form.name} onChange={handleChange} className="input-glass mt-1 w-full text-lg font-bold" placeholder="Ex: iPhone 13 Pro Max 128GB" />
                            </div>

                            {/* Categoria do catálogo */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Categoria
                                </label>
                                <CategorySelector
                                    value={form.category_id || ''}
                                    onChange={(id) => setForm(prev => ({ ...prev, category_id: id }))}
                                    itemType={itemType || undefined}
                                    allowCreate
                                />
                            </div>

                            {itemType === 'celular' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Marca</label>
                                        <BrandSelector
                                            value={form.brand_id}
                                            onChange={(id, brand) => {
                                                setForm(prev => {
                                                    const up = { ...prev, brand_id: id };
                                                    if (brand?.default_pricing_segment_id) {
                                                        up.pricing_segment_id = brand.default_pricing_segment_id;
                                                    }
                                                    return up;
                                                });
                                            }}
                                            allowCreate
                                        />
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
                                        <PartTypeSelector
                                            value={form.part_type}
                                            onChange={(v) => setForm(p => ({ ...p, part_type: v }))}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Qualidade</label>
                                        <QualitySelector
                                            value={form.quality}
                                            onChange={(v) => setForm(p => ({ ...p, quality: v }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Marca (Aparelho)</label>
                                        <BrandSelector
                                            value={form.brand_id}
                                            onChange={(id) => setForm(p => ({ ...p, brand_id: id }))}
                                            allowCreate
                                        />
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

                            {/* Seção de código de barras */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1 mb-4">
                                    <Barcode size={14}/> Código de Barras / SKU
                                </label>
                                
                                <div className="space-y-6">
                                    {/* Preview se já tem código */}
                                    {(form.barcode || form.sku) && (
                                        <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <BarcodeDisplay
                                                value={form.barcode || form.sku}
                                                size="md"
                                                showEAN={true}
                                                showQR={true}
                                                productName={form.name}
                                                price={parseInt(form.sale_price.replace(/\D/g,''), 10) || 0}
                                            />
                                        </div>
                                    )}

                                    {/* Gerador */}
                                    <BarcodeGenerator
                                        itemType={itemType || undefined}
                                        partType={form.part_type}
                                        imei={itemType === 'celular' ? form.imei : undefined}
                                        currentBarcode={form.barcode}
                                        onGenerated={(barcode, sku) => {
                                            setForm(prev => ({ ...prev, barcode, sku }));
                                        }}
                                    />

                                    {/* Campos manuais (avançado) */}
                                    <details className="group">
                                        <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                                            <ChevronDown size={10} className="group-open:rotate-180 transition-transform" /> 
                                            Editar manualmente
                                        </summary>
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div>
                                                <label className="text-xs font-black text-slate-400 uppercase">Cód. Barras/EAN</label>
                                                <input
                                                    name="barcode"
                                                    value={form.barcode}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1 w-full font-mono text-sm"
                                                    placeholder="Ex: 7891234567890"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-slate-400 uppercase">SKU Interno</label>
                                                <input
                                                    name="sku"
                                                    value={form.sku}
                                                    onChange={handleChange}
                                                    className="input-glass mt-1 w-full font-mono text-sm uppercase"
                                                />
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {itemType === 'celular' && (
                        <DeviceFields
                            value={{
                                imei: form.imei,
                                imei2: form.imei2,
                                serialNumber: form.serial_number,
                                color: form.color,
                                storage: form.storage,
                                ram: form.ram,
                                batteryHealth: form.battery_health,
                                batteryCycle: form.battery_cycle,
                                grade: form.grade,
                                condicao: form.condicao,
                                diasGarantia: form.dias_garantia,
                                observacao: form.observacao,
                                dataEntrada: form.data_entrada,
                            }}
                            onChange={(field, val) => {
                                const fieldMap: Record<string, string> = {
                                    imei: 'imei', imei2: 'imei2', serialNumber: 'serial_number',
                                    color: 'color', storage: 'storage', ram: 'ram',
                                    batteryHealth: 'battery_health', batteryCycle: 'battery_cycle',
                                    grade: 'grade', condicao: 'condicao',
                                    diasGarantia: 'dias_garantia', observacao: 'observacao',
                                    dataEntrada: 'data_entrada',
                                };
                                setForm(prev => ({ ...prev, [fieldMap[field] || field]: val }));
                            }}
                            imeiScanner={
                                <IMEIScanner
                                    value={form.imei}
                                    onChange={(val) => setForm(prev => ({ ...prev, imei: val }))}
                                    tenantId={profile?.empresa_id || ""}
                                />
                            }
                        />
                    )}

                    <FiscalPanel
                        value={{
                            ncm: form.ncm,
                            cfopEstadualSaida: form.cfop_estadual_saida || form.cfop,
                            cfopInterestadualSaida: form.cfop_interestadual_saida,
                            cfopEstadualEntrada: form.cfop_estadual_entrada,
                            cfopInterestadualEntrada: form.cfop_interestadual_entrada,
                            cstCsosn: form.cst_csosn,
                            cest: form.cest,
                            origemProduto: form.origin_code,
                            codigoBeneficioFiscal: form.codigo_beneficio_fiscal,
                            tributacaoId: form.tributacao_id,
                        }}
                        onChange={(field, val) => {
                            const fieldMap: Record<string, string> = {
                                ncm: 'ncm',
                                cfopEstadualSaida: 'cfop_estadual_saida',
                                cfopInterestadualSaida: 'cfop_interestadual_saida',
                                cfopEstadualEntrada: 'cfop_estadual_entrada',
                                cfopInterestadualEntrada: 'cfop_interestadual_entrada',
                                cstCsosn: 'cst_csosn',
                                cest: 'cest',
                                origemProduto: 'origin_code',
                                codigoBeneficioFiscal: 'codigo_beneficio_fiscal',
                                tributacaoId: 'tributacao_id',
                            };
                            setForm(prev => ({ ...prev, [fieldMap[field] || field]: val }));
                        }}
                        regime={regime}
                        tributacoes={tributacoes}
                        onSuggestNCM={() => {
                            const s = suggestNCM(form.name);
                            if (s) {
                                setForm(prev => ({ ...prev, ncm: s }));
                                toast.success(`NCM sugerido: ${s}`);
                            } else {
                                toast.info("Não encontramos uma sugestão para este nome.");
                            }
                        }}
                    />
                </div>

                {/* Coluna Lateral (Direita) */}
                <div className="space-y-6">
                    <GlassCard title="Preços e Atacado" icon={DollarSign} className="bg-brand-50/10 border-brand-100">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                    <Layers size={14} className="text-brand-500" />
                                    Perfil de Precificação
                                </label>
                                <PricingSegmentSelector
                                    value={form.pricing_segment_id}
                                    onChange={(id) => setForm(prev => ({ ...prev, pricing_segment_id: id }))}
                                    allowCreate
                                />
                            </div>

                            <PriceGroup
                                costValue={form.cost_price}
                                saleValue={form.sale_price}
                                wholesaleValue={form.sale_price_wholesale_brl}
                                onCostChange={(val) => {
                                    setPrecoEditado(false);
                                    setForm(prev => ({ ...prev, cost_price: val }));
                                }}
                                onSaleChange={(val) => {
                                    setForm(prev => ({ ...prev, sale_price: val }));
                                    setPrecoEditado(true);
                                }}
                                onWholesaleChange={(val) => setForm(prev => ({ ...prev, sale_price_wholesale_brl: val }))}
                            />
                            
                            <div className="pt-2 border-t border-slate-100 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-600 uppercase">Atacado (US$)</label>
                                        <input name="sale_price_usd" value={form.sale_price_usd} onChange={handleChange} className="input-glass mt-1 w-full text-right font-bold text-indigo-600" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Cotação Base USD</label>
                                        <input name="sale_price_usd_rate" value={form.sale_price_usd_rate} onChange={handleChange} className="input-glass mt-1 w-full text-right text-sm text-slate-500" />
                                    </div>
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

export default function NovoCatalogItemPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando formulário...</div>}>
            <NovoCatalogContent />
        </Suspense>
    );
}
