"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    Package,
    Smartphone,
    Building2,
    DollarSign,
    BarChart3,
    Barcode,
    FileText,
    Tag,
    Zap,
    CreditCard,
    Info,
    ImageIcon,
    RefreshCw,
    Eye,
    EyeOff,
    Battery,
    Cpu,
    Layers,
    Trash2,
    Activity,
    Clock,
    Printer,
    Plus,
    Search,
    ChevronDown,
    X
} from "lucide-react";
import { getProdutoById, updateProduto, deleteProduto } from "@/services/estoque";
import { getProdutoHistorico } from "@/services/historico_produto";
import { uploadProdutoImage } from "@/services/estoque";
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { GlassCard } from "@/components/ui/GlassCard";
import { calculateSuggestedPriceBySegment } from "@/utils/product-pricing";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { suggestNCM } from "@/utils/ncm-lookup";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { createClient } from "@/lib/supabase/client";
import { type ProductType, type Brand, type PricingSegment, type PaymentGatewayTable, type CatalogItem } from "@/types/database";
import { getCatalogItem, updateCatalogItem } from "@/services/catalog";
import { getPartCompatibleModels, savePartCompatibleModels, getExistingDeviceModels, getPartMovements } from "@/app/actions/parts";
import { AdjustStockModal } from "@/components/estoque/AdjustStockModal";
import { MovimentacaoModal } from "@/components/estoque/MovimentacaoModal";
import { PartTypeSelector } from "@/components/estoque/PartTypeSelector";
import { QualitySelector } from "@/components/estoque/QualitySelector";
import { StockBadge } from "@/components/estoque/StockBadge";
import { BarcodeGenerator } from "@/components/barcode/BarcodeGenerator";
import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";
import { generateEAN13, generateSKU, generatePartSKU } from "@/utils/barcode";

export default function DetalheProdutoPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { profile } = useAuth();
    const { config, defaultGateway } = useFinanceConfig();
    const [loading, setLoading] = useState(false);
    const [precoEditadoManualmente, setPrecoEditadoManualmente] = useState(false);
    const [historico, setHistorico] = useState<any[]>([]);
    const [itemType, setItemType] = useState<string | null>(null);
    const [compatibleModels, setCompatibleModels] = useState<any[]>([]);
    const [isEditingModels, setIsEditingModels] = useState(false);
    const [newModelSearch, setNewModelSearch] = useState("");
    const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
    const [unitStocks, setUnitStocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const isSubmittingRef = useRef(false);

    // Histórico de movimentações
    const [movements, setMovements] = useState<any[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);
    const [movementsPage, setMovementsPage] = useState(1);
    const [movementsTotalPages, setMovementsTotalPages] = useState(1);
    const [movementsFilters, setMovementsFilters] = useState({ unitId: "", type: "" });

    // Camadas de categorização
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [pricingSegments, setPricingSegments] = useState<PricingSegment[]>([]);
    const [gatewaysData, setGatewaysData] = useState<PaymentGatewayTable[]>([]);

    const [form, setForm] = useState({
        nome: "",
        imei: "",
        grade: "" as any,
        cor: "",
        capacidade: "", // Armazenamento
        memoriaRam: "",
        saudeBateria: "",
        condicao: "novo_lacrado",
        exibirVitrine: true,
        imagemUrl: "",
        precoCusto: "0,00",
        precoVenda: "0,00",
        estoqueQtd: "1",
        estoqueMinimo: "1",
        codigoBarras: "", // Usado como EAN/SKU
        descricao: "",
        // Relacionais
        product_type_id: "",
        brand_id: "",
        pricing_segment_id: "",
        // Fiscal
        ncm: "85171231",
        cfop: "5102",
        origem: "0",
        cest: "",
        // Peças
        part_type: "",
        quality: "",
        part_brand: "",
        model: "",
        supplier: "",
        // Legado (backup)
        categoria: "",
        sale_price_usd: "0,00",
        sale_price_usd_rate: "0,00",
        precoAtacadoBRL: "0,00",
    });

    const loadMovements = async (itemId: string, page: number, filters: any) => {
        setMovementsLoading(true);
        try {
            const { data, totalPages } = await getPartMovements(itemId, page, 20, filters);
            setMovements(data || []);
            setMovementsTotalPages(totalPages || 1);
        } catch (err) {
            console.error("Erro ao carregar movimentações:", err);
        } finally {
            setMovementsLoading(false);
        }
    };

    useEffect(() => {
        if (!params.id) return;
        loadMovements(params.id, movementsPage, movementsFilters);
    }, [movementsPage, movementsFilters, params.id]);

    const handleMovementFilterChange = (name: string, value: string) => {
        setMovementsFilters(prev => ({ ...prev, [name]: value }));
        setMovementsPage(1);
    };

    // Carregar produto
    const loadData = async () => {
        if (!params.id) return;
        console.log("[Debug] Loading product data for ID:", params.id);
        setLoading(true);
        try {
            // Tenta buscar no catálogo primeiro (novo padrão)
            const catItem = await getCatalogItem(params.id) as any;
            if (catItem) {
                setItemType(catItem.item_type);
                setForm(prev => ({
                    ...prev,
                    nome: catItem.name,
                    imei: catItem.imei || "",
                    grade: catItem.grade || "",
                    cor: catItem.color || "",
                    capacidade: catItem.storage || "",
                    memoriaRam: catItem.ram || "",
                    saudeBateria: catItem.battery_health ? String(catItem.battery_health) : "",
                    condicao: catItem.condicao || "novo_lacrado",
                    exibirVitrine: catItem.show_in_storefront ?? true,
                    imagemUrl: catItem.image_url || "",
                    precoCusto: (catItem.cost_price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    precoVenda: (catItem.sale_price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    estoqueQtd: String(catItem.stock_qty),
                    estoqueMinimo: String(catItem.stock_alert_qty ?? 0),
                    codigoBarras: catItem.barcode || catItem.sku || "",
                    descricao: catItem.description || "",
                    ncm: catItem.ncm || "85171231",
                    cfop: catItem.cfop || "5102",
                    origem: catItem.origin_code || "0",
                    cest: catItem.cest || "",
                    brand_id: catItem.brand_id || "",
                    pricing_segment_id: catItem.pricing_segment_id || "",
                    sale_price_usd: (catItem.sale_price_usd / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    sale_price_usd_rate: (catItem.sale_price_usd_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    precoAtacadoBRL: ((catItem.wholesale_price_brl || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    // Peças
                    part_type: catItem.part_type || "",
                    quality: catItem.quality || "",
                    part_brand: catItem.part_brand || "",
                    model: catItem.model || "",
                    supplier: catItem.supplier || "",
                }));

                if (catItem.item_type === 'peca') {
                    const models = await getPartCompatibleModels(catItem.empresa_id, catItem.id);
                    setCompatibleModels(models);
                }

                // Buscar estoques por unidade
                const supabase = createClient();
                const { data: stocks } = await supabase.from('unit_stock').select('*').eq('catalog_item_id', catItem.id);
                if (stocks) setUnitStocks(stocks);
                
                // Carregar histórico inicial
                loadMovements(catItem.id, 1, { unitId: "", type: "" });

                console.log("[Debug] Loaded catalog item:", catItem.id, catItem.name);
                setPrecoEditadoManualmente(true);
                return;
            }

            const data = await getProdutoById(params.id);
            if (data) {
                setForm(prev => {
                    return {
                        ...prev,
                        nome: data.nome,
                        imei: data.imei || "",
                        grade: (data as any).grade || "",
                        cor: data.cor || "",
                        capacidade: data.capacidade || "",
                        memoriaRam: (data as any).memoria_ram || "",
                        saudeBateria: (data as any).saude_bateria ? String((data as any).saude_bateria) : "",
                        condicao: (data as any).condicao || "novo_lacrado",
                        exibirVitrine: (data as any).exibir_vitrine ?? true,
                        imagemUrl: (data as any).imagem_url || "",
                        precoCusto: (data.preco_custo_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        precoVenda: (data.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        estoqueQtd: String(data.estoque_qtd),
                        estoqueMinimo: String(data.estoque_minimo || 1),
                        codigoBarras: data.codigo_barras || (data as any).sku || "",
                        descricao: data.descricao || "",
                        ncm: data.ncm || "85171231",
                        cfop: data.cfop || "5102",
                        origem: data.origem || "0",
                        cest: data.cest || "",
                        categoria: data.categoria || "",
                        subcategoria: data.subcategoria || "",
                        product_type_id: (data as any).product_type_id || "",
                        brand_id: (data as any).brand_id || "",
                        pricing_segment_id: (data as any).pricing_segment_id || "",
                        sale_price_usd: ((data as any).sale_price_usd / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        sale_price_usd_rate: ((data as any).sale_price_usd_rate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        precoAtacadoBRL: (((data as any).wholesale_price_brl || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    };
                });

                if (data.imei) {
                    const hist = await getProdutoHistorico(params.id);
                    setHistorico(hist);
                }
                setPrecoEditadoManualmente(true);
            }
        } catch (err) {
            console.error("Erro ao carregar produto:", err);
        } finally {
            setLoading(false);
        }
    };

    useRealtimeSubscription({
        table: 'catalog_items',
        filter: `id=eq.${params.id}`,
        callback: () => {
            if (!isSubmittingRef.current) loadData();
        }
    });

    useEffect(() => {
        loadData();
    }, [params.id]);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const fetchRelationalData = async () => {
            const supabase = createClient();
            const [types, segments, brandsList, gateways, unitsList] = await Promise.all([
                supabase.from('product_types').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('pricing_segments').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('brands').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('payment_gateways').select('*').eq('empresa_id', profile.empresa_id).order('nome'),
                supabase.from('units').select('*').eq('empresa_id', profile.empresa_id).eq('is_active', true).order('name')
            ]);

            if (types.data) setProductTypes(types.data as any);
            if (segments.data) setPricingSegments(segments.data as any);
            if (brandsList.data) setBrands(brandsList.data as any);
            if (gateways.data) setGatewaysData(gateways.data as any);
            if (unitsList.data) setUnits(unitsList.data as any);
        };
        fetchRelationalData();
    }, [profile?.empresa_id]);

    useEffect(() => {
        if (!isEditingModels || newModelSearch.length < 2 || !profile?.empresa_id) {
            setModelSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            const suggestions = await getExistingDeviceModels(profile.empresa_id, newModelSearch);
            setModelSuggestions(suggestions);
        }, 300);
        return () => clearTimeout(timer);
    }, [newModelSearch, isEditingModels, profile?.empresa_id]);

    const handleSaveModels = async () => {
        if (!profile || !params.id) return;
        try {
            await savePartCompatibleModels(
                profile.empresa_id,
                params.id,
                compatibleModels.map(m => ({ deviceModel: m.deviceModel, deviceModelDisplay: m.deviceModelDisplay }))
            );
            toast.success("Modelos atualizados!");
            setIsEditingModels(false);
        } catch (err) {
            toast.error("Erro ao salvar modelos");
        }
    }

    // Auto-calcular preço quando custo ou segmento mudam
    useEffect(() => {
        if (precoEditadoManualmente || !config) return;
        const custoCentavos = Math.round(parseFloat(form.precoCusto.replace(/\./g, '').replace(',', '.')) * 100) || 0;
        if (custoCentavos <= 0) return;

        const segment = pricingSegments.find(s => s.id === form.pricing_segment_id);
        if (!segment) return;

        const sugerido = calculateSuggestedPriceBySegment(custoCentavos, segment, config.taxa_nota_fiscal_pct);
        const precoFormatado = (sugerido / 100).toFixed(2).replace('.', ',');
        setForm(prev => ({ ...prev, precoVenda: precoFormatado }));
    }, [form.precoCusto, form.pricing_segment_id, config, precoEditadoManualmente]);

    const selectedType = productTypes.find(t => t.id === form.product_type_id);
    const showDeviceSpecs = selectedType?.show_device_specs ?? false;
    const isSmartphone = selectedType?.name.toLowerCase().includes('celular') || selectedType?.name.toLowerCase().includes('smartphone');

    // Helper variables for UI
    const isDevice = showDeviceSpecs;
    const showColorAndGrade = true; // Sempre relevante


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm(prev => ({ ...prev, [name]: checked }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        console.log("[Client] handleSubmit started");

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        if (!profile) {
            toast.error("Sua sessão pode ter expirado. Tente atualizar a página.");
            isSubmittingRef.current = false;
            return;
        }

        setLoading(true);
        try {
            console.log("[Client] Preparing data...");
            // Remove points (thousands separator) and replace comma with dot for proper float parsing
            const cleanCusto = form.precoCusto.replace(/\./g, '').replace(',', '.').trim();
            const cleanVenda = form.precoVenda.replace(/\./g, '').replace(',', '.').trim();

            const custoVal = parseFloat(cleanCusto);
            const vendaVal = parseFloat(cleanVenda);

            if (isNaN(custoVal) || isNaN(vendaVal)) {
                toast.error("Preço inválido. Use o formato 0,00");
                isSubmittingRef.current = false;
                setLoading(false);
                return;
            }

            const custoCentavos = Math.round(custoVal * 100);
            const vendaCentavos = Math.round(vendaVal * 100);

            const cleanUsd = form.sale_price_usd.replace(/\./g, '').replace(',', '.').trim();
            const cleanRate = form.sale_price_usd_rate.replace(/\./g, '').replace(',', '.').trim();
            const usdVal = parseFloat(cleanUsd);
            const rateVal = parseFloat(cleanRate);
            const usdCentavos = isNaN(usdVal) ? 0 : Math.round(usdVal * 100);
            const rateFinal = isNaN(rateVal) ? 0 : rateVal;
            const cleanAtacadoBrl = form.precoAtacadoBRL.replace(/\./g, '').replace(',', '.').trim();
            const atacadoBrlVal = parseFloat(cleanAtacadoBrl);
            const atacadoBrlCentavos = isNaN(atacadoBrlVal) ? 0 : Math.round(atacadoBrlVal * 100);

            // Validar IMEI se preenchido (deve ter 15 dígitos)
            if (form.imei && !/^\d{15}$/.test(form.imei)) {
                toast.error("O IMEI deve conter exatamente 15 números.");
                isSubmittingRef.current = false;
                setLoading(false);
                return;
            }

            console.log("[Client] Saving item:", { id: params.id, itemType });

            if (itemType) {
                console.log("[Client] Calling updateCatalogItem server action...");
                // Novo padrão: catalog_items
                await updateCatalogItem(params.id, {
                    name: form.nome,
                    imei: form.imei || null,
                    grade: (form.grade as any) || null,
                    color: form.cor || null,
                    storage: form.capacidade || null,
                    cost_price: custoCentavos,
                    sale_price: vendaCentavos,
                    stock_qty: parseInt(form.estoqueQtd) || 0,
                    stock_alert_qty: parseInt(form.estoqueMinimo) || 0,
                    barcode: form.codigoBarras || null,
                    sku: form.codigoBarras || null,
                    description: form.descricao || null,
                    condicao: form.condicao as any,
                    battery_health: form.saudeBateria ? parseInt(form.saudeBateria) : null,
                    ram: form.memoriaRam || null,
                    show_in_storefront: form.exibirVitrine,
                    image_url: form.imagemUrl || null,
                    ncm: form.ncm,
                    cfop: form.cfop,
                    origin_code: form.origem,
                    cest: form.cest || null,
                    brand_id: form.brand_id || null,
                    pricing_segment_id: form.pricing_segment_id || null,
                    subcategory: form.categoria || null,
                    sale_price_usd: usdCentavos,
                    sale_price_usd_rate: rateFinal,
                    wholesale_price_brl: atacadoBrlCentavos,
                    // Peças
                    part_type: form.part_type || null,
                    quality: form.quality || null,
                    part_brand: form.part_brand || null,
                    model: form.model || null,
                    supplier: form.supplier || null,
                });
                console.log("[Client] updateCatalogItem completed");
            } else {
                console.log("[Client] Calling updateProduto server action...");
                // Legado: produtos
                await updateProduto(params.id, {
                    nome: form.nome,
                    imei: form.imei || null,
                    grade: (form.grade as any) || null,
                    cor: form.cor || null,
                    capacidade: form.capacidade || null,
                    preco_custo_centavos: custoCentavos,
                    preco_venda_centavos: vendaCentavos,
                    estoque_qtd: parseInt(form.estoqueQtd) || 0,
                    estoque_minimo: parseInt(form.estoqueMinimo) || 0,
                    codigo_barras: form.codigoBarras || null,
                    sku: form.codigoBarras || null,
                    descricao: form.descricao || null,
                    condicao: form.condicao as any,
                    saude_bateria: form.saudeBateria ? parseInt(form.saudeBateria) : null,
                    memoria_ram: form.memoriaRam || null,
                    exibir_vitrine: form.exibirVitrine,
                    imagem_url: form.imagemUrl || null,
                    ncm: form.ncm,
                    cfop: form.cfop,
                    origem: form.origem,
                    cest: form.cest || null,
                    categoria: selectedType?.name || form.categoria,
                    product_type_id: form.product_type_id || null,
                    brand_id: form.brand_id || null,
                    pricing_segment_id: form.pricing_segment_id || null,
                    sale_price_usd: usdCentavos,
                    sale_price_usd_rate: rateFinal,
                    wholesale_price_brl: atacadoBrlCentavos,
                } as any);
                console.log("[Client] updateProduto completed");
            }

            console.log("[Client] Success! Showing toast...");
            toast.success("Produto salvo com sucesso!");
            router.refresh();
            router.push("/estoque");
        } catch (error: any) {
            console.error("[Client] Error in handleSubmit:", error);
            const msg = error.message || "Erro desconhecido";
            toast.error(`Falha ao salvar: ${msg}`);
            isSubmittingRef.current = false;
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja excluir este produto permanentemente?")) return;

        setLoading(true);
        try {
            await deleteProduto(params.id);
            toast.success("Produto excluído com sucesso!");
            router.push("/estoque");
            router.refresh();
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            toast.error("Erro ao excluir produto.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/estoque" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">Editar Produto</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Atualize as informações do item no estoque</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => window.open(`/print/etiqueta/${params.id}`, '_blank')}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                        <Printer size={16} />
                        Imprimir Etiqueta
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="h-10 px-4 rounded-xl border border-red-200 text-red-500 flex items-center gap-2 text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        Excluir
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
                {/* Coluna Esquerda: Cadastro + Fiscal */}
                <div className="col-span-2 space-y-6">
                    <GlassCard title="Informações Gerais" icon={Package}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-semibold text-slate-600 block mb-1.5">Nome do Produto *</label>
                                    <input
                                        type="text"
                                        name="nome"
                                        value={form.nome}
                                        onChange={handleChange}
                                        className="input-glass"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                        <Tag size={14} className="text-brand-500" />
                                        Tipo de Produto
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="product_type_id"
                                            value={form.product_type_id}
                                            onChange={handleChange}
                                            className="input-glass appearance-none bg-transparent relative z-10"
                                            required={productTypes.length > 0 && !itemType}
                                        >
                                            <option value="">Selecione o tipo</option>
                                            {productTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Smartphone size={14} className="text-brand-500" />
                                            Marca
                                        </span>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const nome = window.prompt("Nome da nova marca:");
                                                if (!nome?.trim() || !profile?.empresa_id) return;
                                                const supabase = createClient();
                                                const { data, error } = await (supabase as any)
                                                    .from('brands')
                                                    .insert({ name: nome.trim(), empresa_id: profile.empresa_id })
                                                    .select()
                                                    .single();
                                                if (error) {
                                                    toast.error("Erro ao criar marca");
                                                    return;
                                                }
                                                setBrands(prev => [...prev, data as any]);
                                                setForm(prev => ({ ...prev, brand_id: data.id }));
                                                toast.success(`Marca "${nome.trim()}" criada!`);
                                            }}
                                            className="text-[10px] text-brand-500 hover:underline font-bold"
                                        >
                                            + Nova marca
                                        </button>
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="brand_id"
                                            value={form.brand_id}
                                            onChange={handleChange}
                                            className="input-glass appearance-none bg-transparent relative z-10"
                                        >
                                            <option value="">Selecione a marca</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-0" />
                                    </div>
                                </div>
                            </div>

                            {/* Campos específicos de peça */}
                            {itemType === 'peca' && (
                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                                            Tipo de Peça
                                        </label>
                                        <PartTypeSelector
                                            value={form.part_type}
                                            onChange={(v) => setForm(prev => ({ ...prev, part_type: v }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">
                                            Qualidade
                                        </label>
                                        <QualitySelector
                                            value={form.quality}
                                            onChange={(v) => setForm(prev => ({ ...prev, quality: v }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Marca (Aparelho)</label>
                                            <input
                                                name="part_brand"
                                                value={form.part_brand}
                                                onChange={handleChange}
                                                className="input-glass mt-1 w-full"
                                                placeholder="Ex: Apple"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Modelo Específico</label>
                                            <input
                                                name="model"
                                                value={form.model}
                                                onChange={handleChange}
                                                className="input-glass mt-1 w-full"
                                                placeholder="Ex: iPhone 15 Pro Max"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-black text-slate-400 uppercase">Fornecedor</label>
                                            <input
                                                name="supplier"
                                                value={form.supplier || ''}
                                                onChange={handleChange}
                                                className="input-glass mt-1 w-full"
                                                placeholder="Ex: Distribuidora XYZ"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Seção de código de barras */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1 mb-4">
                                    <Barcode size={14}/> Código de Barras / SKU
                                </label>
                                
                                <div className="space-y-6">
                                    {/* Preview se já tem código */}
                                    {form.codigoBarras && (
                                        <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <BarcodeDisplay
                                                value={form.codigoBarras}
                                                size="md"
                                                showEAN={true}
                                                showQR={true}
                                                productName={form.nome}
                                                price={parseInt(form.precoVenda.replace(/\D/g,''), 10) || 0}
                                            />
                                        </div>
                                    )}

                                    {/* Gerador */}
                                    <BarcodeGenerator
                                        itemType={itemType as any || undefined}
                                        partType={form.part_type}
                                        imei={form.imei}
                                        currentBarcode={form.codigoBarras}
                                        onGenerated={(barcode) => {
                                            setForm(prev => ({ ...prev, codigoBarras: barcode }));
                                        }}
                                    />

                                    {/* Campos manuais (avançado) */}
                                    <details className="group">
                                        <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                                            <ChevronDown size={10} className="group-open:rotate-180 transition-transform" /> 
                                            Editar manualmente
                                        </summary>
                                        <div className="mt-3">
                                            <label className="text-xs font-black text-slate-400 uppercase">Cód. Barras/EAN ou SKU</label>
                                            <input
                                                name="codigoBarras"
                                                value={form.codigoBarras}
                                                onChange={handleChange}
                                                className="input-glass mt-1 w-full font-mono text-sm"
                                                placeholder="Ex: 7891234567890 ou SMT-123456"
                                            />
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                    
                    <GlassCard title="Informações Fiscais" icon={FileText}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                    NCM *
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const suggested = suggestNCM(form.nome);
                                            if (suggested) setForm(f => ({ ...f, ncm: suggested }));
                                        }}
                                        className="text-[10px] text-brand-500 hover:underline"
                                    >
                                        Sugerir
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    name="ncm"
                                    value={form.ncm}
                                    onChange={handleChange}
                                    className="input-glass"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5">CFOP *</label>
                                <input
                                    type="text"
                                    name="cfop"
                                    value={form.cfop}
                                    onChange={handleChange}
                                    className="input-glass"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5">Origem *</label>
                                <input
                                    type="text"
                                    name="origem"
                                    value={form.origem}
                                    onChange={handleChange}
                                    className="input-glass"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5">CEST</label>
                                <input
                                    type="text"
                                    name="cest"
                                    value={form.cest}
                                    onChange={handleChange}
                                    className="input-glass"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Coluna Direita: Preços + Outros */}
                <div className="col-span-1 space-y-6">
                    <GlassCard title="Precificação" icon={DollarSign}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                    <Layers size={14} className="text-brand-500" />
                                    Segmento de Preço *
                                </label>
                                <div className="relative">
                                    <select
                                        name="pricing_segment_id"
                                        value={form.pricing_segment_id}
                                        onChange={handleChange}
                                        className="input-glass appearance-none bg-transparent relative z-10"
                                        required={pricingSegments.length > 0 && !itemType}
                                    >
                                        <option value="">Selecione o segmento</option>
                                        {pricingSegments.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-0" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-600 block mb-1.5">Preço de Custo</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input
                                            type="text"
                                            name="precoCusto"
                                            value={form.precoCusto}
                                            onChange={(e) => {
                                                setPrecoEditadoManualmente(false);
                                                handleChange(e);
                                            }}
                                            className="input-glass pl-9"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-600 block mb-1.5">Preço de Venda</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input
                                            type="text"
                                            name="precoVenda"
                                            value={form.precoVenda}
                                            onChange={(e) => {
                                                setPrecoEditadoManualmente(true);
                                                handleChange(e);
                                            }}
                                            className="input-glass pl-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <label className="text-sm font-semibold text-indigo-600 block mb-1.5">Atacado (US$)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                        <input
                                            type="text"
                                            name="sale_price_usd"
                                            value={form.sale_price_usd}
                                            onChange={handleChange}
                                            className="input-glass pl-7 text-xs"
                                            placeholder="USD"
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">Rate</span>
                                        <input
                                            type="text"
                                            name="sale_price_usd_rate"
                                            value={form.sale_price_usd_rate}
                                            onChange={handleChange}
                                            className="input-glass pl-10 text-xs"
                                            placeholder="5.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-sm font-semibold text-emerald-600 block mb-1.5">Atacado (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                    <input
                                        type="text"
                                        name="precoAtacadoBRL"
                                        value={form.precoAtacadoBRL}
                                        onChange={handleChange}
                                        className="input-glass pl-9"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Estoque por Unidade" icon={BarChart3}>
                        <div className="space-y-3">
                            {units.map(unit => {
                                const stock = unitStocks.find(us => us.unit_id === unit.id);
                                const qty = stock?.qty || 0;
                                return (
                                    <div key={unit.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <span className="text-xs font-bold text-slate-600">{unit.name}</span>
                                        <StockBadge qty={qty} alertQty={parseInt(form.estoqueMinimo) || 1} />
                                    </div>
                                );
                            })}
                            
                            <button
                                type="button"
                                onClick={() => setShowAdjustModal(true)}
                                className="w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                <Plus size={14} />
                                Ajustar Estoque
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowMovementModal(true)}
                                className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                                <Activity size={14} />
                                Ver Histórico
                            </button>

                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">
                                    Alerta de Estoque Baixo
                                </label>
                                <p className="text-[10px] text-slate-400 mb-2">
                                    Alertar quando estoque for igual ou menor a:
                                </p>
                                <input
                                    type="number"
                                    name="estoqueMinimo"
                                    value={form.estoqueMinimo}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Terceira Seção: Especificações — ocultar para peças */}
                {itemType !== 'peca' && (
                    <div className="col-span-1 space-y-6">
                        <GlassCard title="Especificações" icon={Info}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                            Condição
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="condicao"
                                                value={form.condicao}
                                                onChange={handleChange}
                                                className="input-glass appearance-none bg-transparent relative z-10"
                                            >
                                                <option value="novo">Novo</option>
                                                <option value="vitrine">Vitrine</option>
                                                <option value="usado">Usado</option>
                                                <option value="recondicionado">Recondicionado</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-0" />
                                        </div>
                                    </div>
                                    {isSmartphone && (
                                        <div>
                                            <label className="text-sm font-semibold text-slate-600 block mb-1.5 flex items-center gap-1.5">
                                                Saúde da Bateria
                                            </label>
                                            <div className="relative">
                                                <Battery size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="saudeBateria"
                                                    value={form.saudeBateria}
                                                    onChange={handleChange}
                                                    className="input-glass pl-9"
                                                    placeholder="ex: 100"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* Footer com Botão Flutuante ou Fixo */}
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
                            Salvar Produto
                        </>
                    )}
                </button>
            </div>
            </form>
            {/* Histórico de Movimentações */}
            <GlassCard title="Histórico de Movimentações" icon={Activity}>
                <div className="space-y-3">
                    {/* Filtros */}
                    <div className="flex gap-3">
                        <select
                            value={movementsFilters.type}
                            onChange={(e) => handleMovementFilterChange('type', e.target.value)}
                            className="h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold text-slate-600 outline-none"
                        >
                            <option value="">Todos os tipos</option>
                            <option value="entrada">Entrada</option>
                            <option value="saida">Saída</option>
                            <option value="ajuste">Ajuste</option>
                            <option value="venda">Venda</option>
                            <option value="compra">Compra</option>
                        </select>
                        <select
                            value={movementsFilters.unitId}
                            onChange={(e) => handleMovementFilterChange('unitId', e.target.value)}
                            className="h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold text-slate-600 outline-none"
                        >
                            <option value="">Todas as unidades</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>

                    {/* Lista de movimentações */}
                    {movementsLoading ? (
                        <div className="py-8 text-center text-slate-400 text-sm">Carregando...</div>
                    ) : movements.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm italic">
                            Nenhuma movimentação registrada.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {movements.map((mov: any) => (
                                <div key={mov.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                                        mov.type === 'entrada' || mov.type === 'compra' ? "bg-emerald-50 text-emerald-600" :
                                        mov.type === 'saida' || mov.type === 'venda' ? "bg-red-50 text-red-600" :
                                        "bg-indigo-50 text-indigo-600"
                                    )}>
                                        {mov.type === 'entrada' || mov.type === 'compra' ? '+' :
                                         mov.type === 'saida' || mov.type === 'venda' ? '-' : '='}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">
                                            {mov.reason || mov.type}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {mov.unit?.name || 'Unidade'} · {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-black shrink-0",
                                        mov.qty_change > 0 ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {mov.qty_change > 0 ? '+' : ''}{mov.qty_change}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Paginação do histórico */}
                    {movementsTotalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <button
                                disabled={movementsPage === 1}
                                onClick={() => setMovementsPage(p => p - 1)}
                                className="text-xs font-bold text-slate-500 disabled:opacity-30 hover:text-brand-500 transition-colors"
                            >
                                ← Anterior
                            </button>
                            <span className="text-xs text-slate-400">
                                Página {movementsPage} de {movementsTotalPages}
                            </span>
                            <button
                                disabled={movementsPage === movementsTotalPages}
                                onClick={() => setMovementsPage(p => p + 1)}
                                className="text-xs font-bold text-slate-500 disabled:opacity-30 hover:text-brand-500 transition-colors"
                            >
                                Próxima →
                            </button>
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Histórico IMEI (legado) */}
            {form.imei && historico.length > 0 && (
                <GlassCard title="Histórico do IMEI" icon={Activity}>
                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {historico.map((evento) => (
                            <div key={evento.id} className="relative flex items-start gap-6 group">
                                <div className="absolute left-0 mt-1.5 w-10 h-10 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-sm z-10 group-hover:scale-110 transition-transform">
                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                                </div>
                                <div className="flex-1 pt-1 ml-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            {evento.usuario_nome && (
                                                <>
                                                    👤 {evento.usuario_nome}
                                                    <span className="text-slate-200">•</span>
                                                </>
                                            )}
                                            <Clock size={12} />
                                            {new Date(evento.created_at).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-700 leading-snug">
                                        {evento.descricao}
                                    </h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Modals */}
            {showAdjustModal && (
                <AdjustStockModal 
                    itemId={params.id} 
                    units={units}
                    onClose={() => setShowAdjustModal(false)}
                    onSuccess={() => loadData()}
                />
            )}

            {showMovementModal && (
                <MovimentacaoModal 
                    produtoId={params.id} 
                    onClose={() => setShowMovementModal(false)} 
                />
            )}
        </div>
    );
}
