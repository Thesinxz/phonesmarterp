"use client";

import { useState, useEffect } from "react";
import {
    Smartphone,
    ArrowLeft,
    TrendingUp,
    CheckCircle2,
    Scan,
    Plus,
    Loader2,
    Copy,
    Trash2,
    Settings,
    List,
    DollarSign,
    ChevronRight,
    ChevronLeft,
    FileSearch,
    Building2,
    Layers,
    Tag
} from "lucide-react";
import Link from "next/link";
import Tesseract from 'tesseract.js';
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { useAuth } from "@/context/AuthContext";
import { GatewaySelector } from "@/components/ui/GatewaySelector";
import { type PaymentGateway } from "@/types/configuracoes";
import { createProdutos } from "@/services/estoque";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { type ProductType, type Brand, type PricingSegment, type PaymentGatewayTable } from "@/types/database";

export default function ImportacaoPage() {
    const { config, defaultGateway, loading: configLoading } = useFinanceConfig();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    const { profile } = useAuth();
    const router = useRouter();
    const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayTable | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    
    // Novas entidades
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [pricingSegments, setPricingSegments] = useState<PricingSegment[]>([]);
    const [gatewaysData, setGatewaysData] = useState<PaymentGatewayTable[]>([]);

    // GLOBAL PARAMS
    const [params, setParams] = useState({
        dolarCompra: 5.15,
        taxaImportacaoPct: 7.5,
        taxaUsdtUsdPct: 0.05,
        dolarTaxaImportacao: 5.25,
        freteEuaUsd: 15,
        freteBrasilBrl: 150,
        margemPadrao: 25,
        margemTipo: 'percentual' as 'percentual' | 'fixa',
        taxaFixa: 0,
        invoiceExtrasUsd: 0 
    });

    // OCR States
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [items, setItems] = useState<{ 
        id: string, 
        label: string, 
        custoUsd: number, 
        categoria: string, 
        subcategoria: string, 
        condicao: string, 
        quantidade: number, 
        margemCustom?: number, 
        margemTipoCustom?: 'percentual' | 'fixa',
        precoCustomPix?: number,
        precoVendaUsdCustom?: number,
        imei?: string,
        saudeBateria?: number,
        // Novos campos
        product_type_id: string,
        brand_id: string,
        pricing_segment_id: string
    }[]>([]);
    const [ocrStatus, setOcrStatus] = useState("");
    const [viewCurrency, setViewCurrency] = useState<'BRL' | 'USD'>('BRL');

    const brlToUsd = (brlCents: number, rate: number): number => {
        if (!rate || rate <= 0) return 0;
        return Math.round((brlCents / 100) / rate * 100);
    };

    const formatUsd = (usdCents: number): string => {
        return `$ ${(usdCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getProductUsdValues = (itemCustoUsd: number, impostoBrl: number, freteEuaBrl: number, freteBrasilBrl: number, totalBrl: number, dolarCompra: number, precoSugeridoUsd?: number) => {
        const taxaImpUsd = brlToUsd(impostoBrl * 100, dolarCompra);
        const freteEuaUsd = brlToUsd(freteEuaBrl * 100, dolarCompra);
        const freteBrUsd = brlToUsd(freteBrasilBrl * 100, dolarCompra);
        const totalUsd = brlToUsd(totalBrl * 100, dolarCompra);
        const vendaUsd = precoSugeridoUsd !== undefined ? Math.round(precoSugeridoUsd * 100) : 0;
        const margemUsd = (vendaUsd > 0 && totalUsd > 0) ? vendaUsd - totalUsd : null;

        return {
            custoUsd: Math.round(itemCustoUsd * 100),
            taxaImpUsd,
            freteEuaUsd,
            freteBrUsd,
            totalUsd,
            vendaUsd,
            margemUsd
        };
    };

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const fetchRelationalData = async () => {
            const supabase = createClient();
            const [types, segments, brandsList, gateways] = await Promise.all([
                supabase.from('product_types').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('pricing_segments').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('brands').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('payment_gateways').select('*').eq('empresa_id', profile.empresa_id).order('nome'),
            ]);

            if (types.data) setProductTypes(types.data as any);
            if (segments.data) setPricingSegments(segments.data as any);
            if (brandsList.data) setBrands(brandsList.data as any);
            if (gateways.data) {
                setGatewaysData(gateways.data as any);
                if (!selectedGateway && gateways.data.length > 0) {
                    setSelectedGateway(gateways.data[0] as any);
                }
            }
        };
        fetchRelationalData();
    }, [profile?.empresa_id]);

    useEffect(() => {
        if (config) {
            setParams(prev => ({
                ...prev,
                dolarCompra: config.cotacao_dolar_paraguai || 5.15,
                dolarTaxaImportacao: Number(((config.cotacao_dolar_paraguai || 5.15) + 0.10).toFixed(2))
            }));
        }
    }, [config]);

    // Sem retorno precoce para evitar erros de Hook order
    const isLoading = !mounted || configLoading;

    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = (err) => reject(err);
            document.head.appendChild(script);
        });
    };

    async function processOCR(file: File) {
        setOcrLoading(true);
        setOcrProgress(0);
        setOcrStatus("Iniciando...");

        try {
            let imagesToProcess: string[] = [];

            if (file.type === "application/pdf") {
                setOcrStatus("Carregando motor de PDF...");
                await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");

                // @ts-ignore
                const pdfjsLib = window['pdfjsLib'];
                if (!pdfjsLib) throw new Error("O motor de PDF não respondeu.");

                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

                setOcrStatus("Lendo arquivo PDF...");
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                    setOcrStatus(`Convertendo página ${i}...`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d', { willReadFrequently: true });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport }).promise;
                        imagesToProcess.push(canvas.toDataURL('image/png'));
                    }
                }
            } else {
                setOcrStatus("Preparando imagem...");
                imagesToProcess.push(URL.createObjectURL(file));
            }

            const newItems: any[] = [];
            setOcrStatus("OCR em andamento...");
            for (let idx = 0; idx < imagesToProcess.length; idx++) {
                const imgSource = imagesToProcess[idx];
                const result = await Tesseract.recognize(imgSource, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
                    }
                });

                const lines = result.data.text.split('\n');
                let lastIncompleteItem: any = null;

                lines.forEach((line) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;

                    const recirqPattern = /(\d{4,5})\s+(Apple\s+.+?)\s+(\d+)\s+-\s+(\d+)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})/;
                    const match = cleanLine.match(recirqPattern);

                    if (match) {
                        const [full, id, desc, ordQty, shipQty, price, extPrice] = match;
                        const unitPrice = parseFloat(price.replace(',', ''));
                        const quantity = parseInt(shipQty);

                        const lower = desc.toLowerCase();
                        let categoriaGuess = "iPhone Lacrado";
                        if (lower.includes('grade') || lower.includes('used') || lower.includes('semi')) {
                            categoriaGuess = "iPhone Semi Novo";
                        }

                        // Tenta encontrar a categoria real no config para pegar a margem
                        const realCat = config?.categorias?.find(c => 
                            c.nome.toLowerCase() === categoriaGuess.toLowerCase() ||
                            lower.includes(c.nome.toLowerCase())
                        );

                        const newItem = {
                            id: `item-${Date.now()}-${Math.random()}`,
                            label: desc.trim(),
                            custoUsd: unitPrice,
                            quantidade: quantity,
                            categoria: realCat?.nome || categoriaGuess,
                            subcategoria: "iPhone",
                            condicao: (lower.includes('grade') || lower.includes('used') || lower.includes('semi')) ? "seminovo" : "novo_lacrado",
                            margemCustom: realCat?.margem_padrao || undefined
                        };

                        newItems.push(newItem);
                        lastIncompleteItem = newItem;
                    } else if (lastIncompleteItem && cleanLine.length > 3 && !cleanLine.includes('$')) {
                        lastIncompleteItem.label += " " + cleanLine;
                    }
                });
            }

            setOcrStatus("Concluído.");
            if (newItems.length === 0) {
                toast.error("Nenhum item identificado pelo padrão (Regex).");
            } else {
                setItems(prev => [...prev, ...newItems]);
                toast.success(`${newItems.length} itens identificados!`);
                setCurrentStep(2); // Auto advance
            }
        } catch (error: any) {
            toast.error(`Erro: ${error?.message || "Desconhecido"}`);
        } finally {
            setOcrLoading(false);
        }
    }

    const calculateItem = (
        itemCustoUsd: number, 
        pricingSegmentId?: string, 
        margemCustom?: number, 
        margemTipoCustom?: 'percentual' | 'fixa',
        precoCustomPix?: number
    ) => {
        const totalItems = items.reduce((acc, it) => acc + (it.quantidade || 0), 0) || 1;
        const valorTaxaUsdtUsd = itemCustoUsd * (params.taxaUsdtUsdPct / 100);
        const custoComUsdtUsd = itemCustoUsd + valorTaxaUsdtUsd;
        
        // Rateio de taxas extras e frete da invoice para base de cálculo (CIF)
        const extrasPorItemUsd = (params.invoiceExtrasUsd || 0) / totalItems;
        const freteEuaPorItemUsd = (params.freteEuaUsd || 0) / totalItems;
        const baseCalculoImpostoUsd = itemCustoUsd + extrasPorItemUsd + freteEuaPorItemUsd;

        // Imposto BRL (Calculado sobre Produto + Extras + Frete EUA)
        const impostoBrl = (baseCalculoImpostoUsd * (params.taxaImportacaoPct / 100)) * params.dolarTaxaImportacao;
        
        // Custo Mercadoria BRL (Incluindo a taxa de conversão USDT)
        const custoMoedaBrl = custoComUsdtUsd * params.dolarCompra;
        
        // Fretes e Extras diluídos
        const freteEuaBrl = (params.freteEuaUsd * params.dolarCompra) / totalItems;
        const extrasInvoiceBrl = (extrasPorItemUsd * params.dolarCompra);
        const freteBrasilBrl = params.freteBrasilBrl / totalItems;
        const taxaFixaDiluida = params.taxaFixa / totalItems;

        const custoFinalBrl = custoMoedaBrl + impostoBrl + freteEuaBrl + freteBrasilBrl + taxaFixaDiluida + extrasInvoiceBrl;

        const segment = pricingSegments.find(s => s.id === pricingSegmentId);
        const exigeNF = true; // Por padrão agora
        const taxaNF = (config?.taxa_nota_fiscal_pct || 0) / 100;
        const taxaPix = (selectedGateway?.taxa_pix_pct || 0) / 100;
        const gateTaxas = (selectedGateway as any)?.taxas_credito || (selectedGateway as any)?.taxas_credito_json || [];
        const taxaCredito1x = (gateTaxas?.[0]?.taxa || 0) / 100;
        const taxaCredito12x = (gateTaxas?.[11]?.taxa || 0) / 100;

        const tipoMargem = margemTipoCustom || params.margemTipo;
        const valorMargem = margemCustom !== undefined ? margemCustom : params.margemPadrao;

        let precoSugeridoPix = 0;
        let precoSugerido1x = 0;
        let precoSugerido12x = 0;

        if (precoCustomPix && precoCustomPix > 0) {
            precoSugeridoPix = precoCustomPix;
            const lucroEfetivoBrl = (precoSugeridoPix * (1 - taxaNF - taxaPix)) - custoFinalBrl;
            precoSugerido1x = (custoFinalBrl + lucroEfetivoBrl) / (1 - taxaNF - taxaCredito1x);
            precoSugerido12x = (custoFinalBrl + lucroEfetivoBrl) / (1 - taxaNF - taxaCredito12x);
        } else {
            // Lógica baseada em Segmento ou Margem customizada
            const marginBrl = margemCustom !== undefined ? (margemCustom * 100) : (segment?.default_margin || 0);
            
            // Preço Base = (Custo + Margem Fixa) / (1 - Impostos)
            const divisor = 1 - taxaNF;
            precoSugeridoPix = Math.ceil((custoFinalBrl + marginBrl) / (divisor - taxaPix));
            precoSugerido1x = Math.ceil((custoFinalBrl + marginBrl) / (divisor - taxaCredito1x));
            precoSugerido12x = Math.ceil((custoFinalBrl + marginBrl) / (divisor - taxaCredito12x));
        }

        return {
            custoMoedaBrl,
            impostoBrl,
            freteEuaBrl,
            freteBrasilBrl,
            custoFinalBrl,
            precoSugeridoPix,
            precoSugerido1x,
            precoSugerido12x,
            taxaNF,
            taxaPix
        };
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado!");
    };

    const applyGlobalMargin = (val: number) => {
        setParams({ ...params, margemPadrao: val });
        setItems(prev => prev.map(it => ({ 
            ...it, 
            margemCustom: val, 
            margemTipoCustom: params.margemTipo,
            precoCustomPix: undefined // Limpa preços manuais ao aplicar margem global
        })));
        toast.success(`Lucro de ${params.margemTipo === 'percentual' ? val + '%' : formatCurrency(val)} aplicado a todos!`);
    };

    const splitItem = (index: number) => {
        const item = items[index];
        if (item.quantidade <= 1) return;
        
        const newItems = [...items];
        newItems.splice(index, 1); // remove original
        
        for (let j = 0; j < item.quantidade; j++) {
            newItems.splice(index + j, 0, {
                ...item,
                id: `item-${Date.now()}-${Math.random()}-${j}`,
                quantidade: 1
            });
        }
        setItems(newItems);
        toast.success(`${item.quantidade} unidades desmembradas!`);
    };

    const handleFinalImport = async () => {
        console.log("[ImportDebug] Iniciando handleFinalImport...");
        if (!profile) {
            console.error("[ImportDebug] Profile não encontrado.");
            return toast.error("Usuário não autenticado");
        }
        if (items.length === 0) {
            console.error("[ImportDebug] Lista de itens vazia.");
            return toast.error("Nenhum produto para importar");
        }

        const promise = new Promise(async (resolve, reject) => {
            try {
                const itemsToProcess = [...items];
                const finalItemsList: any[] = [];

                itemsToProcess.forEach(item => {
                    const ehAparelho = item.categoria?.toLowerCase().includes('phone') || 
                                     item.categoria?.toLowerCase().includes('smartphone') ||
                                     item.categoria?.toLowerCase().includes('celular');
                    
                    if (ehAparelho && item.quantidade > 1) {
                        console.log(`[ImportDebug] Desmembrando automaticamente ${item.quantidade}x ${item.label}`);
                        for(let i=0; i < item.quantidade; i++) {
                            finalItemsList.push({
                                ...item,
                                id: `auto-split-${Date.now()}-${i}-${Math.random()}`,
                                quantidade: 1,
                                imei: null // Resetar para garantir preenchimento individual
                            });
                        }
                    } else {
                        finalItemsList.push(item);
                    }
                });

                console.log("[ImportDebug] Mapeando itens para inserção. Total após desmembramento:", finalItemsList.length);
                
                const produtosParaInserir: any[] = [];
                
                finalItemsList.forEach(item => {
                    const calc = calculateItem(
                        item.custoUsd, 
                        item.pricing_segment_id, 
                        item.margemCustom, 
                        item.margemTipoCustom, 
                        item.precoCustomPix
                    );
                    
                    const { custoFinalBrl, precoSugeridoPix } = calc;
                    const type = productTypes.find(t => t.id === item.product_type_id);
                    
                    produtosParaInserir.push({
                        empresa_id: profile.empresa_id,
                        nome: item.label,
                        product_type_id: item.product_type_id || null,
                        brand_id: item.brand_id || null,
                        pricing_segment_id: item.pricing_segment_id || null,
                        categoria: type?.name || item.categoria,
                        subcategoria: item.subcategoria || null,
                        preco_custo_centavos: Math.round(custoFinalBrl),
                        preco_venda_centavos: Math.round(precoSugeridoPix),
                        estoque_qtd: 1, 
                        estoque_minimo: 1,
                        condicao: item.condicao || 'novo_lacrado',
                        saude_bateria: item.saudeBateria || null,
                        imei: item.imei || null,
                        ncm: "85171231",
                        cfop: "5102",
                        origem: "1",
                        descricao: "Importado via Calculadora Pro",
                        exibir_vitrine: true
                    });
                });
                
                console.log("[ImportDebug] Total final de registros para inserção:", produtosParaInserir.length);
                
                console.log("[ImportDebug] Chamando createProdutos no DB...");
                const result = await createProdutos(produtosParaInserir as any);
                console.log("[ImportDebug] createProdutos concluído com sucesso:", result);
                resolve(true);
            } catch (e) { 
                console.error("[ImportDebug] ERRO CRÍTICO NO PROCESSO:", e);
                reject(e); 
            }
        });

        toast.promise(promise, {
            loading: 'Importando para o estoque...',
            success: () => { 
                console.log("[ImportDebug] Sucesso no Toast. Redirecionando...");
                setItems([]); 
                router.push('/estoque'); // Redireciona para o estoque geral
                return 'Importação concluída com sucesso!'; 
            },
            error: (err) => {
                console.error("[ImportDebug] Toast Error:", err);
                return 'Erro na importação. Verifique o console.';
            }
        });
    };

    if (!mounted) return null;

    const isLoadingConfig = configLoading && !config;

    return (
        <div className="space-y-6 page-enter pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/ferramentas" className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Importação Pro</h1>
                    <p className="text-slate-500 text-sm">Assistente de importação em 3 passos</p>
                </div>
            </div>

            {/* Stepper Nav */}
            <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 hide-scrollbar">
                {[
                    { step: 1, label: "Configuração e Upload", icon: Settings },
                    { step: 2, label: "Produtos Detalhados", icon: List },
                    { step: 3, label: "Precificação e Estoque", icon: DollarSign }
                ].map((s, idx) => (
                    <div key={s.step} className="flex flex-col items-center flex-1 relative min-w-[150px]">
                        <button
                            onClick={() => {
                                if (s.step === 2 && items.length === 0) return toast.info("Faça o upload primeiro.");
                                if (s.step === 3 && items.length === 0) return toast.info("Nenhum produto lido.");
                                setCurrentStep(s.step);
                            }}
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center font-black transition-all mb-2 z-10 relative",
                                currentStep === s.step ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110" :
                                currentStep > s.step ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                            {currentStep > s.step ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                        </button>
                        <span className={cn(
                            "text-xs font-bold uppercase tracking-widest text-center",
                            currentStep === s.step ? "text-brand-600" : "text-slate-400"
                        )}>{s.label}</span>
                        {idx !== 2 && (
                            <div className={cn(
                                "absolute top-6 left-1/2 w-full h-[2px] -z-0",
                                currentStep > s.step ? "bg-emerald-500" : "bg-slate-100"
                            )} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Config & Upload */}
            {currentStep === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-8">
                    <GlassCard title="1. Configuração de Taxas" icon={TrendingUp}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Dólar Compra (Produto)</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.dolarCompra} onChange={e => setParams({ ...params, dolarCompra: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Dólar (Taxa Importação)</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg text-amber-600 w-full"
                                    value={params.dolarTaxaImportacao} onChange={e => setParams({ ...params, dolarTaxaImportacao: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa Importação (%)</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.taxaImportacaoPct} onChange={e => setParams({ ...params, taxaImportacaoPct: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa USDT (%)</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.taxaUsdtUsdPct} onChange={e => setParams({ ...params, taxaUsdtUsdPct: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Extras Invoice ($) - Total</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg text-amber-600 w-full"
                                    value={params.invoiceExtrasUsd} onChange={e => setParams({ ...params, invoiceExtrasUsd: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa Fixa (R$) - Lote</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg text-emerald-600 w-full"
                                    value={params.taxaFixa} onChange={e => setParams({ ...params, taxaFixa: Number(e.target.value) })} />
                            </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete EUA ($)</label>
                                    <input type="number" step="0.01" className="input-glass h-12 font-bold w-full"
                                        value={params.freteEuaUsd} onChange={e => setParams({ ...params, freteEuaUsd: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete BR (R$)</label>
                                    <input type="number" step="0.01" className="input-glass h-12 font-bold w-full"
                                        value={params.freteBrasilBrl} onChange={e => setParams({ ...params, freteBrasilBrl: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="2. Enviar Invoice (Invoice)" icon={Scan}>
                        <div className="border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center hover:border-brand-400 hover:bg-brand-50/50 transition-all cursor-pointer relative overflow-hidden h-full flex flex-col justify-center min-h-[300px]">
                            <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        processOCR(file);
                                        e.target.value = "";
                                    }
                                }} />
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                {ocrLoading ? <Loader2 className="animate-spin text-brand-500" size={32} /> : <Scan size={40} className="text-brand-500" />}
                            </div>
                            <h3 className="font-black text-slate-800 text-xl mb-2">Toque para escanear</h3>
                            <p className="text-sm text-slate-500">Envie um arquivo PDF ou Imagem do invoice.</p>
                            
                            {ocrLoading && (
                                <div className="mt-8 bg-brand-50 p-6 rounded-3xl">
                                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">{ocrStatus}</p>
                                    <div className="w-full bg-brand-200 rounded-full h-2 mb-2">
                                        <div className="bg-brand-500 h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                                    </div>
                                    <p className="font-black text-brand-600">{ocrProgress}%</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Step 2: Produtos */}
            {currentStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-8 space-y-6">
                    <GlassCard title={
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <span>Tabela de Produtos ({items.length})</span>
                            <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setViewCurrency('BRL')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                        viewCurrency === 'BRL' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    R$ Reais
                                </button>
                                <button
                                    onClick={() => setViewCurrency('USD')}
                                    className={cn(
                                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                        viewCurrency === 'USD' ? "bg-[#185FA5] text-white shadow-sm shadow-brand-500/30" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    US$ Dólar
                                </button>
                            </div>
                        </div>
                    } icon={List} action={
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentStep(1)} className="btn-secondary h-10 px-6 text-sm"><ChevronLeft size={16} /> Voltar</button>
                            <button onClick={() => setItems([])} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase ml-2">Limpar tudo</button>
                            <button onClick={() => setCurrentStep(3)} className="btn-primary h-10 px-6 text-sm ml-2">Avançar <ChevronRight size={16} /></button>
                        </div>
                    }>
                        {viewCurrency === 'USD' && (
                            <div className="text-right text-[11px] text-slate-400 font-medium mb-4 pr-4">
                                Conversão baseada em US$ 1 = R$ {params.dolarCompra.toFixed(2)} (Passo 1)
                            </div>
                        )}
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    {viewCurrency === 'BRL' ? (
                                        <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            <th className="px-2 py-3 min-w-[250px]">Produto (Descrição)</th>
                                            <th className="px-2 py-3 text-center">Cat / Cond.</th>
                                            <th className="px-2 py-3 text-center w-12">Qtd</th>
                                            <th className="px-2 py-3 text-right">USD</th>
                                            <th className="px-2 py-3 text-right">Compra</th>
                                            <th className="px-2 py-3 text-right">Taxa Imp.</th>
                                            <th className="px-2 py-3 text-right">Frete EUA</th>
                                            <th className="px-2 py-3 text-right">Frete BR</th>
                                            <th className="px-2 py-3 text-right font-bold text-slate-800">Total</th>
                                            <th className="px-2 py-3"></th>
                                        </tr>
                                    ) : (
                                        <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            <th className="px-2 py-3 min-w-[250px]">Produto (Descrição)</th>
                                            <th className="px-2 py-3 text-center">Cat / Cond.</th>
                                            <th className="px-2 py-3 text-center w-12">Qtd</th>
                                            <th className="px-2 py-3 text-right">Custo US$</th>
                                            <th className="px-2 py-3 text-right">Taxa Imp US$</th>
                                            <th className="px-2 py-3 text-right">Frete EUA US$</th>
                                            <th className="px-2 py-3 text-right">Frete BR US$</th>
                                            <th className="px-2 py-3 text-right font-bold text-slate-800">Total US$</th>
                                            <th className="px-2 py-3 text-right">Margem US$</th>
                                            <th className="px-2 py-3 text-right">Venda US$</th>
                                            <th className="px-2 py-3"></th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-20 text-center">
                                                <p className="text-slate-400 font-bold">Nenhum produto lido.</p>
                                            </td>
                                        </tr>
                                    ) : items.map((item, i) => {
                                        const calc = calculateItem(item.custoUsd, item.pricing_segment_id, item.margemCustom, item.margemTipoCustom, item.precoCustomPix);
                                        const usdValues = getProductUsdValues(item.custoUsd, calc.impostoBrl, calc.freteEuaBrl, calc.freteBrasilBrl, calc.custoFinalBrl, params.dolarCompra, item.precoVendaUsdCustom);
                                        return (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <input 
                                                        type="text"
                                                        className="w-full bg-slate-100 border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-lg px-2 py-1.5 font-bold text-slate-800 text-xs"
                                                        value={item.label} 
                                                        onChange={e => {
                                                            const newItems = [...items];
                                                            newItems[i].label = e.target.value;
                                                            setItems(newItems);
                                                        }}
                                                    />
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 relative">
                                                            <input 
                                                                type="text"
                                                                placeholder="IMEI / Serial"
                                                                maxLength={15}
                                                                className="w-full bg-amber-50 border border-amber-100 outline-none focus:ring-1 focus:ring-amber-500 rounded-lg px-2 py-1 font-bold text-amber-900 text-[10px]"
                                                                value={item.imei || ""}
                                                                onChange={e => {
                                                                    const newItems = [...items];
                                                                    newItems[i].imei = e.target.value;
                                                                    setItems(newItems);
                                                                }}
                                                            />
                                                        </div>
                                                        {(item.condicao === 'seminovo' || item.condicao === 'usado') && (
                                                            <div className="w-20 relative">
                                                                <input 
                                                                    type="number"
                                                                    placeholder="Bat %"
                                                                    max={100}
                                                                    className="w-full bg-emerald-50 border border-emerald-100 outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 font-bold text-emerald-900 text-[10px]"
                                                                    value={item.saudeBateria || ""}
                                                                    onChange={e => {
                                                                        const newItems = [...items];
                                                                        newItems[i].saudeBateria = Number(e.target.value);
                                                                        setItems(newItems);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <div className="flex flex-col gap-1 w-32">
                                                    <select 
                                                        className="bg-slate-100 px-1 py-1.5 rounded-lg text-[10px] font-bold outline-none border-none" 
                                                        value={item.product_type_id} 
                                                        onChange={e => {
                                                            const n = [...items]; 
                                                            n[i].product_type_id = e.target.value; 
                                                            setItems(n);
                                                        }}
                                                    >
                                                        <option value="">Tipo?</option>
                                                        {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                    <select 
                                                        className="bg-slate-200/50 px-1 py-1 rounded-lg text-[9px] font-bold outline-none border-none" 
                                                        value={item.brand_id} 
                                                        onChange={e => {
                                                            const bId = e.target.value;
                                                            const brand = brands.find(b => b.id === bId);
                                                            const n = [...items]; 
                                                            n[i].brand_id = bId; 
                                                            if (brand?.default_pricing_segment_id) {
                                                                n[i].pricing_segment_id = brand.default_pricing_segment_id;
                                                            }
                                                            setItems(n);
                                                        }}
                                                    >
                                                        <option value="">Marca?</option>
                                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                    <select 
                                                        className="bg-indigo-50 px-1 py-1 rounded-lg text-[9px] font-bold text-indigo-700 outline-none border-none" 
                                                        value={item.pricing_segment_id} 
                                                        onChange={e => {
                                                            const n = [...items]; 
                                                            n[i].pricing_segment_id = e.target.value; 
                                                            setItems(n);
                                                        }}
                                                    >
                                                        <option value="">Segmento?</option>
                                                        {pricingSegments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <select className="bg-slate-100 px-1 py-1 rounded-lg text-[9px] font-bold outline-none border-none" value={item.condicao} onChange={e => {
                                                        const newItems = [...items]; newItems[i].condicao = e.target.value; setItems(newItems);
                                                    }}>
                                                        <option value="novo_lacrado">Novo</option>
                                                        <option value="seminovo">Semi</option>
                                                        <option value="usado">Usado</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <input type="number" className="w-10 bg-slate-100 px-1 py-1 rounded-lg text-center font-black text-xs outline-none" value={item.quantidade} onChange={e => {
                                                        const newItems = [...items]; newItems[i].quantidade = Number(e.target.value); setItems(newItems);
                                                    }} />
                                                    {item.quantidade > 1 && (
                                                        <button 
                                                            onClick={() => splitItem(i)}
                                                            className="text-[8px] font-black text-brand-600 hover:text-brand-700 bg-brand-50 px-1 rounded uppercase tracking-tighter"
                                                            title="Criar um item para cada unidade"
                                                        >
                                                            Desmembrar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="flex items-center justify-end">
                                                    <span className="text-[10px] text-brand-400 mr-0.5">$</span>
                                                    <input type="number" step="0.01" className="w-14 bg-brand-50 text-brand-600 px-1 py-1 rounded-lg text-right font-black text-xs outline-none border-transparent focus:border-brand-300 border" value={item.custoUsd} onChange={e => {
                                                        const newItems = [...items]; newItems[i].custoUsd = Number(e.target.value); setItems(newItems);
                                                    }} />
                                                </div>
                                            </td>
                                            {viewCurrency === 'BRL' ? (
                                                <>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-500">
                                                        {formatCurrency(Math.round(calc.custoMoedaBrl * 100))}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-amber-600">
                                                        {formatCurrency(Math.round(calc.impostoBrl * 100))}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-400">
                                                        {formatCurrency(Math.round(calc.freteEuaBrl * 100))}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-400">
                                                        {formatCurrency(Math.round(calc.freteBrasilBrl * 100))}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <span className="text-xs font-black text-slate-800">
                                                            {formatCurrency(Math.round(calc.custoFinalBrl * 100))}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-500">
                                                        {formatUsd(usdValues.custoUsd)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-amber-600">
                                                        {formatUsd(usdValues.taxaImpUsd)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-400">
                                                        {formatUsd(usdValues.freteEuaUsd)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px] font-bold text-slate-400">
                                                        {formatUsd(usdValues.freteBrUsd)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <span className="text-xs font-black text-slate-800">
                                                            {formatUsd(usdValues.totalUsd)}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-[10px]">
                                                        <span className={cn("font-bold", usdValues.margemUsd && usdValues.margemUsd > 0 ? "text-emerald-600" : (usdValues.margemUsd && usdValues.margemUsd < 0 ? "text-red-600" : "text-slate-400"))}>
                                                            {usdValues.margemUsd !== null 
                                                                ? `${formatUsd(usdValues.margemUsd)} (${((usdValues.margemUsd / usdValues.totalUsd) * 100).toFixed(1)}%)` 
                                                                : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <div className="flex items-center justify-end">
                                                            <span className="text-[10px] text-brand-400 mr-0.5">$</span>
                                                            <input type="number" step="0.01" className="w-16 bg-white border border-slate-200 px-1 py-1 rounded-lg text-right font-bold text-xs outline-none focus:border-brand-500" 
                                                                value={item.precoVendaUsdCustom} 
                                                                placeholder={(calc.precoSugeridoPix / params.dolarCompra).toFixed(2)}
                                                                onChange={e => {
                                                                    const newItems = [...items]; 
                                                                    newItems[i].precoVendaUsdCustom = e.target.value === '' ? undefined : Number(e.target.value); 
                                                                    setItems(newItems);
                                                                }} 
                                                            />
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-2 py-2 text-right">
                                                <button onClick={() => setItems(items.filter(it => it.id !== item.id))} className="text-slate-300 hover:text-red-500 p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                    })}
                                    {items.length > 0 && (
                                        <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-200">
                                            <td className="px-2 py-3 text-right text-[10px] uppercase">Totais</td>
                                            <td className="px-2 py-3"></td>
                                            <td className="px-2 py-3 text-center text-xs">
                                                {items.reduce((acc, it) => acc + (it.quantidade || 0), 0)}
                                            </td>
                                            {viewCurrency === 'BRL' ? (
                                                <>
                                                    <td className="px-2 py-3 text-right text-xs">
                                                        ${items.reduce((acc, it) => acc + (it.custoUsd * (it.quantidade || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-2 py-3 text-right text-[10px]">
                                                        {formatCurrency(Math.round(items.reduce((acc, it) => {
                                                            const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                            return acc + (calc.custoMoedaBrl * (it.quantidade || 0));
                                                        }, 0) * 100))}
                                                    </td>
                                                    <td className="px-2 py-3 text-right text-[10px] text-amber-600">
                                                        {formatCurrency(Math.round(items.reduce((acc, it) => {
                                                            const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                            return acc + (calc.impostoBrl * (it.quantidade || 0));
                                                        }, 0) * 100))}
                                                    </td>
                                                    <td className="px-2 py-3 text-right text-[10px]">
                                                        {formatCurrency(Math.round(items.reduce((acc, it) => {
                                                            const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                            return acc + (calc.freteEuaBrl * (it.quantidade || 0));
                                                        }, 0) * 100))}
                                                    </td>
                                                    <td className="px-2 py-3 text-right text-[10px]">
                                                        {formatCurrency(Math.round(items.reduce((acc, it) => {
                                                            const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                            return acc + (calc.freteBrasilBrl * (it.quantidade || 0));
                                                        }, 0) * 100))}
                                                    </td>
                                                    <td className="px-2 py-3 text-right text-xs text-brand-600">
                                                        {formatCurrency(Math.round(items.reduce((acc, it) => {
                                                            const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                            return acc + (calc.custoFinalBrl * (it.quantidade || 0));
                                                        }, 0) * 100))}
                                                    </td>
                                                </>
                                            ) : (
                                                (() => {
                                                    const totals = items.reduce((acc, it) => {
                                                        const calc = calculateItem(it.custoUsd, it.pricing_segment_id, it.margemCustom, it.margemTipoCustom, it.precoCustomPix);
                                                        const usdValues = getProductUsdValues(it.custoUsd, calc.impostoBrl, calc.freteEuaBrl, calc.freteBrasilBrl, calc.custoFinalBrl, params.dolarCompra, it.precoVendaUsdCustom);
                                                        return {
                                                            totalCustoUsd: acc.totalCustoUsd + usdValues.custoUsd * (it.quantidade || 0),
                                                            totalTaxaUsd: acc.totalTaxaUsd + usdValues.taxaImpUsd * (it.quantidade || 0),
                                                            totalFreteEuaUsd: acc.totalFreteEuaUsd + usdValues.freteEuaUsd * (it.quantidade || 0),
                                                            totalFreteBrUsd: acc.totalFreteBrUsd + usdValues.freteBrUsd * (it.quantidade || 0),
                                                            totalGeralUsd: acc.totalGeralUsd + usdValues.totalUsd * (it.quantidade || 0),
                                                            totalVendaUsd: acc.totalVendaUsd + usdValues.vendaUsd * (it.quantidade || 0),
                                                            totalMargemUsd: acc.totalMargemUsd + (usdValues.margemUsd ?? 0) * (it.quantidade || 0)
                                                        };
                                                    }, { 
                                                        totalCustoUsd: 0, 
                                                        totalTaxaUsd: 0, 
                                                        totalFreteEuaUsd: 0, 
                                                        totalFreteBrUsd: 0, 
                                                        totalGeralUsd: 0, 
                                                        totalVendaUsd: 0, 
                                                        totalMargemUsd: 0 
                                                    });

                                                    return (
                                                        <>
                                                            <td className="px-2 py-3 text-right text-xs">
                                                                {formatUsd(totals.totalCustoUsd)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-[10px] text-amber-600">
                                                                {formatUsd(totals.totalTaxaUsd)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-[10px]">
                                                                {formatUsd(totals.totalFreteEuaUsd)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-[10px]">
                                                                {formatUsd(totals.totalFreteBrUsd)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-xs text-brand-600">
                                                                {formatUsd(totals.totalGeralUsd)}
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-[10px]">
                                                                <span className={cn("font-bold", totals.totalMargemUsd > 0 ? "text-emerald-600" : (totals.totalMargemUsd < 0 ? "text-red-600" : "text-slate-400"))}>
                                                                    {formatUsd(totals.totalMargemUsd)}
                                                                    {totals.totalGeralUsd > 0 && ` (${((totals.totalMargemUsd / totals.totalGeralUsd) * 100).toFixed(1)}%)`}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-3 text-right text-xs text-brand-600">
                                                                {totals.totalVendaUsd > 0 ? formatUsd(totals.totalVendaUsd) : '—'}
                                                            </td>
                                                        </>
                                                    );
                                                })()
                                            )}
                                            <td className="px-2 py-3"></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Step 3: Precificação */}
            {currentStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-8 space-y-4">
                    {/* Compact Horizontal Toolbar */}
                    <GlassCard className="!py-3 !px-4 shadow-sm border-white/40">
                        <div className="flex flex-wrap items-center gap-y-4 gap-x-6">
                            {/* Margem Global Section */}
                            <div className="flex items-center gap-3 pr-6 border-r border-slate-100 min-w-max">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                    <TrendingUp size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lucro Global</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-emerald-600">
                                            {params.margemTipo === 'fixa' && <span className="font-black text-xs mr-0.5">R$</span>}
                                            <input 
                                                type="number" 
                                                className="w-16 bg-transparent border-none p-0 font-black text-lg focus:ring-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                                value={params.margemPadrao} 
                                                onChange={e => setParams({ ...params, margemPadrao: Number(e.target.value) })} 
                                            />
                                            {params.margemTipo === 'percentual' && <span className="font-black text-base -ml-1">%</span>}
                                        </div>
                                        
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                            <button 
                                                onClick={() => setParams({...params, margemTipo: 'percentual'})}
                                                className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all", params.margemTipo === 'percentual' ? "bg-white shadow-sm text-brand-600" : "text-slate-400")}>
                                                %
                                            </button>
                                            <button 
                                                onClick={() => setParams({...params, margemTipo: 'fixa'})}
                                                className={cn("px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all", params.margemTipo === 'fixa' ? "bg-white shadow-sm text-brand-600" : "text-slate-400")}>
                                                R$
                                            </button>
                                        </div>

                                        <button 
                                            className="px-2 py-0.5 bg-emerald-600 text-[9px] font-black text-white rounded-md hover:bg-emerald-700 transition-colors uppercase"
                                            onClick={() => applyGlobalMargin(params.margemPadrao)}
                                        >
                                            Ok
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Extras Section */}
                            <div className="flex items-center gap-3 pr-6 border-r border-slate-100 min-w-max">
                                <div className="flex flex-col">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Extras Invoice ($)</label>
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <span className="font-black text-xs">$</span>
                                        <input 
                                            type="number" 
                                            className="w-14 bg-transparent border-none p-0 font-black text-sm focus:ring-0 outline-none" 
                                            value={params.invoiceExtrasUsd} 
                                            onChange={e => setParams({ ...params, invoiceExtrasUsd: Number(e.target.value) })} 
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col ml-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Taxa Fixa (R$)</label>
                                    <div className="flex items-center gap-1 text-emerald-600">
                                        <span className="font-black text-xs">R$</span>
                                        <input 
                                            type="number" 
                                            className="w-16 bg-transparent border-none p-0 font-black text-sm focus:ring-0 outline-none" 
                                            value={params.taxaFixa} 
                                            onChange={e => setParams({ ...params, taxaFixa: Number(e.target.value) })} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gateway Section */}
                            <div className="flex-1 flex items-center gap-3 min-w-[300px]">
                                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                                    <DollarSign size={18} />
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                    <div className="w-full max-w-[200px]">
                                        <GatewaySelector 
                                            gateways={config?.gateways || []} 
                                            selectedId={selectedGateway?.id || null} 
                                            onSelect={(g) => setSelectedGateway(g as any)} 
                                            compact
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 px-2 py-1 bg-slate-50/50 rounded-lg border border-slate-100/50">
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase">Pix</span>
                                            <span className="text-[10px] font-black text-slate-700">{selectedGateway?.taxa_pix_pct || 0}%</span>
                                        </div>
                                        <div className="w-px h-4 bg-slate-200" />
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase text-right">12x</span>
                                            <span className="text-[10px] font-black text-slate-700 text-right">
                                                {(() => {
                                                    const gateTaxas = (selectedGateway as any)?.taxas_credito || (selectedGateway as any)?.taxas_credito_json || [];
                                                    return (gateTaxas?.[11]?.taxa || 0).toFixed(2);
                                                })()}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                    
                    {/* Tabela de Preços Full Width */}
                    <div className="space-y-6">
                        <GlassCard title="Preços Finais de Venda" action={
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentStep(2)} className="btn-secondary h-10 px-4 text-[11px] font-bold">
                                    <ChevronLeft size={16} className="mr-1" /> Voltar
                                </button>
                                <button onClick={handleFinalImport} className="btn-primary h-10 px-6 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700">
                                    <Plus size={16} className="mr-1" /> ENVIAR ESTOQUE
                                </button>
                            </div>
                        }>
                            <div className="overflow-x-auto pb-4 hide-scrollbar">
                                <table className="w-full text-left whitespace-nowrap table-fixed">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-3 py-4 w-[25%]">Produto</th>
                                            <th className="px-3 py-4 text-center w-[12%]">Custo</th>
                                            <th className="px-3 py-4 text-center w-[12%]">Margem (%)</th>
                                            <th className="px-3 py-4 text-center w-[16%]">A Vista (Pix)</th>
                                            <th className="px-3 py-4 text-center w-[16%]">Credito 1x</th>
                                            <th className="px-3 py-4 text-center w-[19%]">12x Sem Juros</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {items.map((item, i) => {
                                            const calc = calculateItem(item.custoUsd, item.categoria, item.margemCustom, item.margemTipoCustom, item.precoCustomPix);
                                            const { custoFinalBrl, precoSugeridoPix, precoSugerido1x, precoSugerido12x, taxaNF, taxaPix } = calc;
                                            const tipoMargemEfetivo = item.margemTipoCustom || params.margemTipo;
                                            const valorMargemEfetivo = item.precoCustomPix 
                                                ? (item.precoCustomPix * (1 - taxaNF - taxaPix) - custoFinalBrl) // Se preço manual, mostra lucro real
                                                : (item.margemCustom !== undefined ? item.margemCustom : params.margemPadrao);
                                            
                                            const tipoMargemExibicao = item.precoCustomPix ? 'fixa' : tipoMargemEfetivo;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 text-[12px] truncate" title={item.label}>{item.label}</span>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1 rounded">IMEI: {item.imei || '---'}</span>
                                                                {(item.condicao === 'seminovo' || item.condicao === 'usado') && (
                                                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1 rounded">Bat: {item.saudeBateria || '---'}%</span>
                                                                )}
                                                                 {item.quantidade > 1 && (
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-1 rounded animate-pulse">
                                                                            {item.quantidade} unidades agrupadas!
                                                                        </span>
                                                                        <button 
                                                                            onClick={() => splitItem(i)}
                                                                            className="text-[8px] font-black bg-brand-600 text-white px-1.5 py-0.5 rounded hover:bg-brand-700 transition-colors uppercase"
                                                                        >
                                                                            Clique aqui para separar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="bg-slate-100 px-2 py-1.5 rounded-lg text-slate-500 font-bold text-[10px] inline-block">
                                                            {formatCurrency(Math.round(custoFinalBrl * 100))}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {tipoMargemExibicao === 'fixa' && <span className="text-[10px] font-black text-emerald-600">R$</span>}
                                                            <input type="number" className={cn(
                                                                "w-16 px-2 py-1.5 rounded-lg text-center font-black text-xs outline-none border transition-all",
                                                                item.precoCustomPix ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                            )} 
                                                                value={valorMargemEfetivo.toFixed(2)} 
                                                                onChange={e => {
                                                                    const newItems = [...items];
                                                                    newItems[i].margemCustom = Number(e.target.value);
                                                                    newItems[i].margemTipoCustom = tipoMargemExibicao;
                                                                    newItems[i].precoCustomPix = undefined; // Limpa preço manual se editar margem
                                                                    setItems(newItems);
                                                                }} />
                                                            {tipoMargemExibicao === 'percentual' && <span className="text-[10px] font-black text-emerald-600">%</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className={cn(
                                                            "flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border transition-all",
                                                            item.precoCustomPix ? "bg-amber-100/30 border-amber-200" : "bg-emerald-100/30 border-emerald-100"
                                                        )}>
                                                            <span className={cn("text-[10px] font-black", item.precoCustomPix ? "text-amber-600" : "text-emerald-600")}>R$</span>
                                                            <input 
                                                                type="number" 
                                                                step="0.01" 
                                                                className={cn(
                                                                    "bg-transparent border-none outline-none font-black w-24 text-center text-sm",
                                                                    item.precoCustomPix ? "text-amber-700" : "text-emerald-700"
                                                                )}
                                                                value={precoSugeridoPix}
                                                                onChange={e => {
                                                                    const newVal = Number(e.target.value);
                                                                    const newItems = [...items];
                                                                    newItems[i].precoCustomPix = newVal;
                                                                    newItems[i].margemCustom = undefined; // Limpa margem se editar preço
                                                                    setItems(newItems);
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="bg-brand-50 px-3 py-2 rounded-lg text-brand-600 font-black text-[12px] border border-brand-100">
                                                            {formatCurrency(Math.round(precoSugerido1x * 100))}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="bg-slate-900 px-3 py-2 rounded-lg text-white font-black text-[12px] shadow-lg shadow-slate-900/10">
                                                                {formatCurrency(Math.round(precoSugerido12x * 100))}
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 mt-1 uppercase">12x de {formatCurrency(Math.round((precoSugerido12x / 12) * 100))}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
}
