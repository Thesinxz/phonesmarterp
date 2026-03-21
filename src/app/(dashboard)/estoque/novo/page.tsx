"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Package, Smartphone, Headphones, Wrench, DollarSign, Barcode, Eye, FileText, Upload, Tag, Cpu, X, Info, ChevronDown, Layers, BarChart3, RefreshCw, MapPin, ShieldCheck } from "lucide-react";
import { createCatalogItem } from "@/services/catalog";
import { CompatibleModelsSelector } from "@/components/parts/CompatibleModelsSelector";
import { PartStockSidebar } from "@/components/parts/PartStockSidebar";
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
import { PartTypeSelector } from "@/components/parts/PartTypeSelector";
import { QualitySelector } from "@/components/parts/QualitySelector";
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

// New form components
import { ProductGeneralInfo } from "@/components/estoque/form/ProductGeneralInfo";
import { ProductPricingSection } from "@/components/estoque/form/ProductPricingSection";
import { ProductStockSection } from "@/components/estoque/form/ProductStockSection";
import { ProductPartDetails } from "@/components/estoque/form/ProductPartDetails";
import { ProductMediaSection } from "@/components/estoque/form/ProductMediaSection";
import { ProductBarcodeSection } from "@/components/estoque/form/ProductBarcodeSection";

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
        product_type_id: "",
        
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
        
        // Peças
        part_type: "",
        quality: "",
        part_brand: "",
        model: "",
        supplier: "",
        compatible_models_parts: "", // será split(',') depois
        compatible_models: [] as { id: string; brand: string; model: string; isFreeText?: boolean }[],
        supplier_ref: "",
        storage_location: "",
        reorder_point: "3",
        warranty_days_part: "90",
        supplier_lead_days: "3",
        part_status: "ativo"
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

    const handleFieldChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handlePriceManualEdit = (manual: boolean) => {
        setPrecoEditado(manual);
    };

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

        setForm(prev => ({ ...prev, [name]: value }));
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

                sale_price_usd: Math.round(parseFloat(form.sale_price_usd.replace(',', '.')) * 100) || 0,
                sale_price_usd_rate: parseFloat(form.sale_price_usd_rate.replace(',', '.')) || 0,
                wholesale_price_brl: Math.round(parseFloat(form.sale_price_wholesale_brl.replace(',', '.')) * 100) || 0,

                // Peças
                ...(itemType === 'peca' && {
                    part_type: form.part_type,
                    quality: form.quality,
                    part_brand: form.part_brand,
                    supplier: form.supplier,
                    model: form.model,
                    compatible_models: form.compatible_models || [],
                    supplier_ref: form.supplier_ref || null,
                    storage_location: form.storage_location || null,
                    reorder_point: parseInt(form.reorder_point) || 3,
                    warranty_days_part: parseInt(form.warranty_days_part) || 90,
                    supplier_lead_days: parseInt(form.supplier_lead_days) || null,
                    status: form.part_status || 'ativo',
                    vitrine_enabled: form.show_in_storefront,
                    // Fiscal adicional
                    cfop_estadual_saida: form.cfop_estadual_saida || form.cfop || null,
                    cfop_interestadual_saida: form.cfop_interestadual_saida || null,
                    cfop_estadual_entrada: form.cfop_estadual_entrada || null,
                    cfop_interestadual_entrada: form.cfop_interestadual_entrada || null,
                    cst_csosn: form.cst_csosn || null,
                    codigo_beneficio_fiscal: form.codigo_beneficio_fiscal || null,
                    tributacao_id: form.tributacao_id || null,
                }),
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
            <div className="space-y-6 page-enter">
                <PageHeader 
                    title="Novo Item" 
                    subtitle="Selecione o tipo de item que deseja cadastrar"
                    onBack={() => router.push('/estoque')}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pt-8">
                    <button 
                        onClick={() => setItemType('celular')}
                        className="group p-8 bg-white border border-slate-100 rounded-[32px] hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10 transition-all flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                            <Smartphone size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">Celular</h3>
                            <p className="text-sm text-slate-500 font-bold px-4">Aparelhos para revenda. Campos para IMEI, saúde da bateria, grade.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setItemType('acessorio')}
                        className="group p-8 bg-white border border-slate-100 rounded-[32px] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <Headphones size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">Acessório & Película</h3>
                            <p className="text-sm text-slate-500 font-bold px-4">Capas, cabos, películas, fones. Formulário rápido sem dados do aparelho.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setItemType('peca')}
                        className="group p-8 bg-white border border-slate-100 rounded-[32px] hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/10 transition-all flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Wrench size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 mb-1">Peça (Assistência)</h3>
                            <p className="text-sm text-slate-500 font-bold px-4">Telas, baterias, conectores. Compatibilidade, qualidade e fornecedor.</p>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 page-enter pb-24">
            <PageHeader 
                title={itemType === 'celular' ? "Cadastrar Celular" : itemType === 'peca' ? "Cadastrar Peça" : "Cadastrar Acessório"}
                subtitle="Preencha os dados do novo item para o catálogo"
                onBack={() => setItemType(null)}
            />

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {itemType !== 'peca' && (
                    <>
                        <div className="lg:col-span-2 space-y-6">
                            <ProductGeneralInfo
                                name={form.name}
                                categoryId={form.category_id}
                                productTypeId={form.product_type_id}
                                brandId={form.brand_id}
                                description={form.description}
                                showInStorefront={form.show_in_storefront}
                                itemType={itemType}
                                productTypes={productTypes}
                                onChange={handleFieldChange}
                            />

                            <FiscalPanel
                                value={{
                                    ncm: form.ncm,
                                    cfopEstadualSaida: form.cfop_estadual_saida,
                                    cfopInterestadualSaida: form.cfop_interestadual_saida,
                                    cfopEstadualEntrada: form.cfop_estadual_entrada,
                                    cfopInterestadualEntrada: form.cfop_interestadual_entrada,
                                    cstCsosn: form.cst_csosn,
                                    cest: form.cest,
                                    origemProduto: form.origin_code,
                                    codigoBeneficioFiscal: form.codigo_beneficio_fiscal,
                                    tributacaoId: form.tributacao_id,
                                }}
                                onChange={handleFieldChange}
                                regime={regime}
                                tributacoes={tributacoes}
                                onSuggestNCM={() => {
                                    const sug = suggestNCM(form.name);
                                    if (sug) handleFieldChange('ncm', sug);
                                }}
                            />
                        </div>

                        <div className="space-y-6">
                            <ProductPricingSection
                                pricingSegmentId={form.pricing_segment_id}
                                costPrice={form.cost_price}
                                salePrice={form.sale_price}
                                wholesalePrice={form.sale_price_wholesale_brl}
                                salePriceUsd={form.sale_price_usd}
                                salePriceUsdRate={form.sale_price_usd_rate}
                                onPriceManualEdit={handlePriceManualEdit}
                                onChange={handleFieldChange}
                            />

                            <ProductStockSection
                                units={units}
                                totalQty={form.stock_qty}
                                alertQty={form.stock_alert_qty}
                                isEdit={false}
                                onChange={handleFieldChange}
                            />

                            <ProductMediaSection
                                imageUrl={form.image_url}
                                onUpload={(file) => uploadProdutoImage(file, profile?.empresa_id || "")}
                                onChange={(url) => handleFieldChange('image_url', url)}
                            />

                            <ProductBarcodeSection
                                barcode={form.barcode}
                                itemType={itemType}
                                partType={form.part_type}
                                imei={form.imei}
                                productName={form.name}
                                salePriceCentavos={Math.round(parseFloat(form.sale_price.replace(/\./g, '').replace(',', '.')) * 100) || 0}
                                onChange={(val) => handleFieldChange('barcode', val)}
                            />
                        </div>
                    </>
                )}

                {itemType === 'peca' && (
                    <>
                        {/* ══════════════════════════════
                            COLUNA PRINCIPAL (2/3)
                        ══════════════════════════════ */}
                        <div className="lg:col-span-2 space-y-6">

                        {/* 1. Identificação */}
                        <GlassCard title="Identificação da Peça" icon={Wrench}>
                            <div className="space-y-5">

                            {/* Nome */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Nome da Peça *
                                </label>
                                <input
                                value={form.name}
                                name="name"
                                onChange={handleChange}
                                required
                                className="input-glass w-full text-base font-bold"
                                placeholder="Ex: Tela iPhone 15 Pro Max Original"
                                />
                            </div>

                            {/* Tipo de peça */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                                Tipo de Peça *
                                </label>
                                <PartTypeSelector
                                value={form.part_type || ''}
                                onChange={(v) => handleFieldChange('part_type', v)}
                                />
                            </div>

                            {/* Qualidade */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-2 block">
                                Qualidade
                                </label>
                                <QualitySelector
                                value={form.quality || 'oem'}
                                onChange={(v) => handleFieldChange('quality', v)}
                                />
                            </div>

                            {/* Categoria + Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Categoria
                                </label>
                                <CategorySelector
                                    value={form.category_id}
                                    onChange={(v) => handleFieldChange('category_id', v)}
                                    itemType="peca"
                                    allowCreate
                                    onCreateRequest={() => window.open('/configuracoes?tab=categorias', '_blank')}
                                />
                                </div>
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Status
                                </label>
                                <select
                                    value={form.part_status || 'ativo'}
                                    name="part_status"
                                    onChange={handleChange}
                                    className="input-glass w-full"
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="sob_encomenda">Sob Encomenda</option>
                                    <option value="descontinuado">Descontinuado</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Descrição (visível na vitrine)
                                </label>
                                <textarea
                                value={form.description}
                                name="description"
                                onChange={handleChange}
                                rows={2}
                                className="input-glass w-full resize-none"
                                placeholder="Informações visíveis para o cliente..."
                                />
                            </div>

                            {/* Toggle vitrine */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <button
                                type="button"
                                onClick={() => handleFieldChange('show_in_storefront', !form.show_in_storefront)}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-all relative shrink-0",
                                    form.show_in_storefront ? "bg-brand-500" : "bg-slate-200"
                                )}
                                >
                                <div className={cn(
                                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                                    form.show_in_storefront ? "left-6" : "left-1"
                                )} />
                                </button>
                                <div>
                                <p className="text-sm font-bold text-slate-700">Exibir na Vitrine Online</p>
                                <p className="text-[11px] text-slate-400">
                                    Permite que clientes vejam e solicitem esta peça
                                </p>
                                </div>
                            </label>
                            </div>
                        </GlassCard>

                        {/* 2. Compatibilidade */}
                        <GlassCard title="Compatibilidade" icon={Wrench}>
                            <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Marca do Aparelho
                                </label>
                                <input
                                    value={form.part_brand || ''}
                                    onChange={(e) => handleFieldChange('part_brand', e.target.value)}
                                    className="input-glass w-full"
                                    placeholder="Ex: Apple, Samsung"
                                />
                                </div>
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Modelo Principal
                                </label>
                                <input
                                    value={form.model || ''}
                                    onChange={(e) => handleFieldChange('model', e.target.value)}
                                    className="input-glass w-full"
                                    placeholder="Ex: iPhone 15 Pro Max"
                                />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Modelos Compatíveis
                                </label>
                                <CompatibleModelsSelector
                                value={form.compatible_models}
                                onChange={(v) => handleFieldChange('compatible_models', v)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Referência do Fornecedor
                                <span className="text-slate-300 font-normal ml-2">(código usado pelo fornecedor)</span>
                                </label>
                                <input
                                value={form.supplier_ref}
                                name="supplier_ref"
                                onChange={handleChange}
                                className="input-glass w-full font-mono"
                                placeholder="Ex: APL-SCR-15PM-OR"
                                />
                            </div>
                            </div>
                        </GlassCard>

                        {/* 3. Preços */}
                        <GlassCard title="Preços e Atacado" icon={DollarSign}>
                            <PriceGroup
                            costValue={form.cost_price}
                            saleValue={form.sale_price}
                            onCostChange={(v) => {
                                handleFieldChange('cost_price', v);
                                setPrecoEditado(true);
                            }}
                            onSaleChange={(v) => handleFieldChange('sale_price', v)}
                            wholesaleValue={form.sale_price_wholesale_brl}
                            onWholesaleChange={(v) => handleFieldChange('sale_price_wholesale_brl', v)}
                            showMargin
                            />
                        </GlassCard>

                        {/* 4. Estoque e localização */}
                        <GlassCard title="Estoque e Localização" icon={Package}>
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Quantidade Atual *
                                </label>
                                <input
                                type="number"
                                min="0"
                                value={form.stock_qty}
                                name="stock_qty"
                                onChange={handleChange}
                                className="input-glass w-full font-bold text-lg text-center"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Estoque Mínimo
                                <span className="text-slate-300 font-normal ml-1">(alerta)</span>
                                </label>
                                <input
                                type="number"
                                min="0"
                                value={form.stock_alert_qty}
                                name="stock_alert_qty"
                                onChange={handleChange}
                                className="input-glass w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Ponto de Reposição
                                <span className="text-slate-300 font-normal ml-1">(sugerir compra)</span>
                                </label>
                                <input
                                type="number"
                                min="0"
                                value={form.reorder_point}
                                name="reorder_point"
                                onChange={handleChange}
                                className="input-glass w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                <MapPin size={11} className="inline mr-1" />
                                Localização Física
                                </label>
                                <input
                                value={form.storage_location}
                                name="storage_location"
                                onChange={handleChange}
                                className="input-glass w-full font-mono"
                                placeholder="Ex: Gaveta A3, Prateleira 2"
                                />
                            </div>
                            </div>
                        </GlassCard>

                        {/* 5. Garantia e fornecedor */}
                        <GlassCard title="Garantia e Fornecedor" icon={ShieldCheck}>
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Garantia ao Cliente (dias)
                                </label>
                                <input
                                type="number"
                                min="0"
                                value={form.warranty_days_part}
                                name="warranty_days_part"
                                onChange={handleChange}
                                className="input-glass w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                Prazo de Entrega (dias)
                                </label>
                                <input
                                type="number"
                                min="0"
                                value={form.supplier_lead_days}
                                name="supplier_lead_days"
                                onChange={handleChange}
                                className="input-glass w-full"
                                />
                            </div>
                            </div>
                        </GlassCard>

                        {/* 6. Fiscal */}
                        <FiscalPanel
                            value={{
                            ncm: form.ncm,
                            cfopEstadualSaida: form.cfop_estadual_saida || form.cfop || '5102',
                            cfopInterestadualSaida: form.cfop_interestadual_saida || '6102',
                            cfopEstadualEntrada: form.cfop_estadual_entrada || '',
                            cfopInterestadualEntrada: form.cfop_interestadual_entrada || '',
                            cstCsosn: form.cst_csosn || '',
                            cest: form.cest,
                            origemProduto: form.origin_code,
                            codigoBeneficioFiscal: form.codigo_beneficio_fiscal || '',
                            tributacaoId: form.tributacao_id || '',
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
                                handleFieldChange(fieldMap[field] || field, val);
                            }}
                            regime={regime}
                            tributacoes={tributacoes}
                            onSuggestNCM={() => {
                            const suggested = suggestNCM(form.name);
                            if (suggested) handleFieldChange('ncm', suggested);
                            }}
                        />

                        {/* 7. Código de barras */}
                        <GlassCard title="Código de Barras / SKU" icon={Barcode}>
                            {(form.barcode || form.sku) && (
                            <div className="flex justify-center mb-4">
                                <BarcodeDisplay
                                value={form.barcode || form.sku}
                                size="md"
                                showEAN
                                showQR
                                productName={form.name}
                                price={parseInt(form.sale_price.replace(/\D/g,''), 10) || 0}
                                />
                            </div>
                            )}
                            <BarcodeGenerator
                            itemType="peca"
                            partType={form.part_type || undefined}
                            currentBarcode={form.barcode}
                            onGenerated={(barcode, sku) => {
                                handleFieldChange('barcode', barcode);
                                handleFieldChange('sku', sku);
                            }}
                            />
                            <details className="mt-3">
                            <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer hover:text-slate-600">
                                Editar manualmente
                            </summary>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    Código de Barras
                                </label>
                                <input
                                    value={form.barcode}
                                    name="barcode"
                                    onChange={handleChange}
                                    className="input-glass w-full font-mono text-sm"
                                    placeholder="EAN-13 ou código livre"
                                />
                                </div>
                                <div>
                                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                                    SKU Interno
                                </label>
                                <input
                                    value={form.sku}
                                    name="sku"
                                    onChange={handleChange}
                                    className="input-glass w-full font-mono text-sm uppercase"
                                />
                                </div>
                            </div>
                            </details>
                        </GlassCard>
                        </div>

                        {/* ══════════════════════════════
                            SIDEBAR (1/3)
                        ══════════════════════════════ */}
                        <div className="space-y-4">
                        {/* Foto do produto */}
                        <GlassCard title="Foto do Produto" icon={Eye}>
                            <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-brand-300 transition-all group relative overflow-hidden">
                            {form.image_url ? (
                                <>
                                <img src={form.image_url} alt="Foto" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange('image_url', '')}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                    <X size={12} />
                                </button>
                                </>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer absolute inset-0 z-10">
                                    <input type="file" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            uploadProdutoImage(file, profile?.empresa_id || "").then(url => {
                                                if (url) handleFieldChange('image_url', url);
                                            });
                                        }
                                    }} className="hidden" />
                                    <Upload size={28} className="text-slate-300 mb-2 group-hover:text-brand-400 transition-colors" />
                                    <p className="text-xs font-bold text-slate-400">Clique para upload</p>
                                    <p className="text-[10px] text-slate-300 mt-1">JPG, PNG até 5MB</p>
                                </label>
                            )}
                            </div>
                        </GlassCard>

                        {/* Sidebar de estoque e margem */}
                        <PartStockSidebar
                            costPrice={
                            Math.round(parseFloat((form.cost_price || '0').replace(/\./g,'').replace(',','.')) * 100)
                            }
                            salePrice={
                            Math.round(parseFloat((form.sale_price || '0').replace(/\./g,'').replace(',','.')) * 100)
                            }
                            currentQty={parseInt(form.stock_qty) || 0}
                            minQty={parseInt(form.stock_alert_qty) || 0}
                        />
                        </div>
                    </>
                )}

                {itemType !== 'peca' && (
                    <div className="space-y-6 mt-6 col-span-1 lg:col-span-3">
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
                    </div>
                )}

            {/* Footer com Botão Flutuante */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                    type="submit"
                    disabled={loading}
                    className="h-14 px-10 rounded-2xl bg-brand-500 text-white font-black text-lg shadow-[0_20px_50px_rgba(59,130,246,0.3)] hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 disabled:opacity-50 group"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-6 h-6 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Cadastrar Item
                        </>
                    )}
                </button>
            </div>
        </form>
        </div>
    );
}

export default function NovoCatalogItemPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando formulário...</div>}>
            <NovoCatalogContent />
        </Suspense>
    );
}
