"use client";

import { useState, useRef, useEffect } from "react";
import {
    Scan,
    Image as ImageIcon,
    FileSearch,
    ArrowLeft,
    RefreshCw,
    Database,
    Trash2,
    Percent,
    TrendingUp,
    Plus,
    Download,
    ChevronRight,
    Check,
    FileText,
    Sparkles,
    Truck,
    RotateCw,
    Zap,
    ShieldCheck,
    ShieldAlert,
    Eye,
    CreditCard,
    Copy,
    X,
    MessageCircle,
    ExternalLink,
    Scale,
    ShoppingBag,
    Maximize2
} from "lucide-react";
import Link from "next/link";
import Tesseract from 'tesseract.js';
import { extractProductsWithGemini } from "@/services/gemini";
import { createProdutos } from "@/services/estoque";
import { GlassCard } from "@/components/ui/GlassCard";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { useAuth } from "@/context/AuthContext";
import { GatewaySelector } from "@/components/ui/GatewaySelector";
import { PriceBreakdown } from "@/components/pricing/PriceBreakdown";
import { InstallmentSimulator } from "@/components/pricing/InstallmentSimulator";
import { calculateReverseMarkup } from "@/utils/pricing";
import { type PaymentGateway } from "@/types/configuracoes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const supabase = createClient();

interface OCRItem {
    item: string;
    cost: string;
    qtd: number;
    price: string;
    pricePix: string;
    priceDebito: string;
    priceCredit1x: string;
    margin: string;
    marginType: 'porcentagem' | 'fixo';
    categoria: string;
    subcategoria: string;
    exigeNF: boolean;
}

export default function CalculoEmMassa() {
    const router = useRouter();
    const { profile } = useAuth();
    const { config, defaultGateway, loading: configLoading } = useFinanceConfig();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. All State Declarations First
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrImages, setOcrImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [ocrResult, setOcrResult] = useState<OCRItem[]>([]);
    const [knownProducts, setKnownProducts] = useState<{ item: string; categoria: string }[]>([]);
    const [dollarRate, setDollarRate] = useState<number>(0);
    const [rawText, setRawText] = useState("");
    const [ocrMode, setOcrMode] = useState<'local' | 'gemini'>('gemini');
    const [showDebug, setShowDebug] = useState(false);
    const [debugLines, setDebugLines] = useState<{ original: string; cleaned: string; status: 'success' | 'skip' | 'fail'; reason?: string }[]>([]);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [currencyType, setCurrencyType] = useState<'BRL' | 'USD'>('BRL');
    const [isFinishing, setIsFinishing] = useState(false);
    const [extraCosts, setExtraCosts] = useState<number>(0);
    const [focusedItemIndex, setFocusedItemIndex] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [activeSimulatorItem, setActiveSimulatorItem] = useState<number | null>(null);
    const [distributionMode, setDistributionMode] = useState<'proportional' | 'equal'>('proportional');
    const [showFullImage, setShowFullImage] = useState(false);

    // 2. Hydration Effect
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (defaultGateway && !selectedGateway) {
            setSelectedGateway(defaultGateway);
        }
        if (config && dollarRate === 0) {
            setDollarRate(config.cotacao_dolar_paraguai || 5.32);
        }

        // Check if AI (Gemini) is configured (com cache)
        const checkAI = async () => {
            const cacheKey = "smartos_ai_config";
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const val = JSON.parse(cached);
                    if (val.geminiEnabled) {
                        setOcrMode('gemini');
                    }
                    if (val.geminiApiKey) return;
                }
            } catch { /* ignore */ }

            const { data: configs } = await supabase
                .from("configuracoes")
                .select("chave, valor")
                .in("chave", ["gemini"]) as any;

            const gemini = configs?.find((c: any) => c.chave === "gemini")?.valor;
            const isGeminiActive = gemini?.enabled || gemini?.api_key;

            if (isGeminiActive) {
                setOcrMode('gemini');
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                        geminiEnabled: true,
                        geminiApiKey: gemini?.api_key || ""
                    }));
                } catch { /* ignore */ }
            } else {
                try { sessionStorage.setItem(cacheKey, JSON.stringify({ geminiEnabled: false, geminiApiKey: "" })); } catch { /* ignore */ }
            }
        };
        checkAI();

        // Carregar memória de produtos para matching inteligente
        const fetchKnown = async () => {
            const { data } = await supabase
                .from("produtos")
                .select("nome") as { data: { nome: string }[] | null };
            if (data) {
                setKnownProducts(data.map(p => ({
                    item: p.nome,
                    categoria: ""
                })));
            }
        };
        fetchKnown();
    }, [defaultGateway, config, mounted]);

    // Global Paste Listeners
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        e.preventDefault();
                        const url = URL.createObjectURL(blob);
                        setOcrImages(prev => [...prev, url]);
                        // @ts-ignore - processOCR is defined below but hoisted
                        processOCR([blob]);
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    });

    // 3. Helper Functions
    const calculatePrices = (cost: number, margin: number, gateway: PaymentGateway | null, categoriaNome?: string, marginType?: 'porcentagem' | 'fixo', externalExtraCostUnit: number = 0, exigeNFPar: boolean = true) => {
        // Definir o custo base em BRL
        const baseCostBrl = currencyType === 'USD' ? cost * dollarRate : cost;

        // Calcular o custo final com o extra (proporcional ou fixo vindo de fora)
        const costBrl = baseCostBrl + externalExtraCostUnit;

        const categoria = config?.categorias.find(c => c.nome === categoriaNome);
        const tipoMargem = marginType || categoria?.tipo_margem || "porcentagem";
        const margemValor = margin;

        const impostoPct = exigeNFPar ? (config?.taxa_nota_fiscal_pct || 0) : 0;

        // Se a categoria tiver um gateway padrão específico, usamos ele preferencialmente
        const effectiveGateway = (categoria?.default_gateway_id && config?.gateways)
            ? (config.gateways.find(g => g.id === categoria.default_gateway_id) || gateway)
            : gateway;

        const getPrice = (gwPct: number) => calculateReverseMarkup(costBrl, margemValor, tipoMargem, impostoPct, gwPct);

        return {
            base: getPrice(0).toFixed(2),
            pix: getPrice(effectiveGateway?.taxa_pix_pct || 0).toFixed(2),
            debito: getPrice(effectiveGateway?.taxa_debito_pct || 0).toFixed(2),
            credit1x: getPrice(effectiveGateway?.taxas_credito?.[0]?.taxa || 0).toFixed(2)
        };
    };

    // 4. Recalcular TUDO se a cotação ou o gateway mudarem (Sincronização Global)
    useEffect(() => {
        if (!mounted || ocrResult.length === 0) return;

        // Debounce para evitar loops infinitos se updateItem for chamado em cascata
        const timer = setTimeout(() => {
            setOcrResult(prev => {
                const totalBaseCost = prev.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);

                return prev.map(item => {
                    const c = parseFloat(item.cost) || 0;
                    const m = parseFloat(item.margin) || 0;
                    const extraCostUnit = distributionMode === 'proportional'
                        ? (totalBaseCost > 0 ? (c / totalBaseCost) * extraCosts : 0)
                        : (prev.length > 0 ? extraCosts / prev.length : 0);
                    const prices = calculatePrices(c, m, selectedGateway, item.categoria, item.marginType, extraCostUnit, item.exigeNF);

                    // Só atualizar se mudar mesmo para evitar re-renders infinitos ou perda de foco no input "item"
                    if (
                        item.price === prices.base &&
                        item.pricePix === prices.pix &&
                        item.priceDebito === prices.debito &&
                        item.priceCredit1x === prices.credit1x
                    ) return item;

                    return {
                        ...item, // Mantém o nome (item), cost, categoria atuais
                        price: prices.base,
                        pricePix: prices.pix,
                        priceDebito: prices.debito,
                        priceCredit1x: prices.credit1x
                    };
                });
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [currencyType, dollarRate, selectedGateway, extraCosts, distributionMode, mounted, config?.categorias, config?.taxa_nota_fiscal_pct]);

    const preprocessImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(img.src);
                    return;
                }

                // Aumentar a escala para melhorar a nitidez
                const scale = 2;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                // Desenhar escalado e suave
                ctx.imageSmoothingEnabled = false; // Pixel art style para textos pequenos
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Converter para Grayscale e Binarizar
                // Algoritmo simples de limiarização
                let sum = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    sum += avg;
                }
                const avgBrightness = sum / (data.length / 4);

                // Se for muito escuro (fundo preto/azul), inverter logicamente para facilitar OCR
                // (Tesseract prefere texto preto em fundo branco)
                const isDarkBackground = avgBrightness < 128;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Grayscale baseada em luminância
                    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    // Aumentar contraste
                    // Se fundo é escuro: Texto claro -> Preto, Fundo escuro -> Branco
                    if (isDarkBackground) {
                        gray = 255 - gray;
                    }

                    // Binarização agressiva (Thresholding)
                    // Se ficou "quase branco" (> 200), vira branco total. Se "quase preto" (< 150), vira preto.
                    // Ajuste fino: limiar de 180 costuma ser bom para texto impresso/tela
                    const threshold = 160;
                    const val = gray > threshold ? 255 : 0;

                    data[i] = val;
                    data[i + 1] = val;
                    data[i + 2] = val;
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => {
                resolve(URL.createObjectURL(file));
            };
        });
    };

    // Helper to convert any Image URL/Blob to clean Base64 for OCR Engine
    const getBase64FromUrl = (url: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
            };
            img.src = url;
        });
    };

    // Helper to load external scripts (PDF.js)
    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
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

    async function processOCR(files: File[]) {
        setOcrLoading(true);
        setOcrProgress(0);
        // Não limpamos ocrResult nem ocrImages pois queremos acumular
        // mas se for o PRIMEIRO upload do reset, garantimos que comece novo
        let allItems: OCRItem[] = [...ocrResult];
        let newImages: string[] = [...ocrImages];
        let totalRawText = "";
        try {
            for (let fIndex = 0; fIndex < files.length; fIndex++) {
                const file = files[fIndex];
                const imagesToProcess: string[] = [];

                // 1. Identificar se é PDF
                if (file.type === "application/pdf") {
                    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");

                    // @ts-ignore
                    const pdfjsLib = window['pdfjsLib'];
                    if (!pdfjsLib) throw new Error("Erro ao carregar motor PDF. Tente novamente.");

                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                    // Processar até 5 páginas para não travar
                    const maxPages = Math.min(pdf.numPages, 5);

                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 3.0 }); // Aumentar escala para melhor leitura
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');

                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport }).promise;
                            imagesToProcess.push(canvas.toDataURL('image/jpeg', 0.95));
                        }
                    }
                } else {
                    // Para Gemini, preferimos a imagem original de alta qualidade
                    // Mas precisamos converter blob URL para Base64 para garantir envio via REST
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                    });
                    reader.readAsDataURL(file);
                    const base64 = await base64Promise;
                    imagesToProcess.push(base64);
                }

                // 2. Processar cada imagem (Página do PDF ou Imagem única)

                for (let i = 0; i < imagesToProcess.length; i++) {
                    const imgUrl = imagesToProcess[i];
                    const baseProgress = (i / imagesToProcess.length) * 100;
                    let resultText = "";
                    let pageItemsFromGemini: OCRItem[] = [];

                    console.log(`Página ${i + 1}: Tamanho da imagem base64:`, imgUrl.length);
                    let currentApiKey = "";
                    const cacheKey = "smartos_ai_config";
                    try {
                        const cached = sessionStorage.getItem(cacheKey);
                        if (cached) {
                            const val = JSON.parse(cached);
                            currentApiKey = val.geminiApiKey || "";
                        }
                    } catch { /* ignore */ }

                    if (!currentApiKey) {
                        toast.error("Chave da API Gemini não encontrada. Configure no painel.", { duration: 5000 });
                        setOcrLoading(false);
                        return;
                    }

                    console.log("Aguardando resposta do Gemini...");
                    setOcrProgress(Math.round(baseProgress + 20));
                    const geminiResult = await extractProductsWithGemini(imgUrl, currentApiKey);
                    console.log("Gemini respondeu:", geminiResult);

                    if (geminiResult.error) {
                        toast.error(`Erro Gemini IA: ${geminiResult.error}`, { duration: 10000 });
                        setOcrLoading(false);
                        return;
                    }

                    const gItems = geminiResult.items || [];
                    try {
                        for (const gItem of gItems) {
                            const costNum = parseFloat(gItem.cost) || 0;
                            if (costNum <= 0) continue;

                            let bestCat = config?.categorias?.find(c =>
                                c.nome?.toLowerCase() === gItem.categoria?.toLowerCase() ||
                                gItem.item?.toLowerCase().includes(c.nome?.toLowerCase() || '')
                            ) || config?.categorias?.[0];

                            const margin = bestCat?.margem_padrao || 30;
                            const prices = calculatePrices(costNum, margin, selectedGateway, bestCat?.nome);
                            const qtdNum = parseInt(gItem.qtd) || 1;
                            const safeQtd = qtdNum > 100 ? 1 : qtdNum;

                            // Um cadastro único com a quantidade correta (não desdobrar em N linhas)
                            pageItemsFromGemini.push({
                                item: gItem.item || "Sem nome",
                                cost: costNum.toFixed(2),
                                qtd: safeQtd,
                                price: prices.base,
                                pricePix: prices.pix,
                                priceDebito: prices.debito,
                                priceCredit1x: prices.credit1x,
                                margin: String(margin),
                                marginType: (bestCat?.tipo_margem as 'porcentagem' | 'fixo') || 'porcentagem',
                                categoria: bestCat?.nome || "",
                                subcategoria: "",
                                exigeNF: bestCat?.nf_obrigatoria ?? true
                            });
                        }
                    } catch (parseError: any) {
                        console.error("Erro interno ao processar os itens do Gemini:", parseError);
                        alert("Aviso: Houve um erro processando parte dos itens da nota. " + parseError.message);
                    }
                    resultText = `ITENS ENCONTRADOS PELO GEMINI:\n` + gItems.map((gi: any) => `- ${gi.item}: ${gi.cost} (x${gi.qtd})`).join('\n');
                    setOcrProgress(Math.round(baseProgress + 95));

                    totalRawText += `--- PÁGINA ${i + 1} (GEMINI) ---\n${resultText}\n\n`;
                    allItems = [...allItems, ...pageItemsFromGemini];
                }

                if (imagesToProcess.length > 0) {
                    newImages = [...newImages, ...imagesToProcess];
                }
            }

            setRawText(prev => prev + totalRawText);
            setOcrResult(allItems);
            setOcrImages(newImages);
            setCurrentImageIndex(newImages.length > 0 ? newImages.length - 1 : 0);

        } finally {
            setOcrLoading(false);
            if (allItems.length > 0) {
                setStep(2); // Move to review step
            }
        }
    }

    // ... (rest of helper functions like removeItem, updateItem remain similar but must use new calculatePrices)

    const removeItem = (idx: number) => {
        setOcrResult(prev => prev.filter((_, i) => i !== idx));
    };

    const updateItem = (index: number, field: string, value: any) => {
        setOcrResult(prev => {
            const newResults = [...prev];
            const item = newResults[index];
            if (!item) return prev;

            let finalValue = value;
            if (field === 'exigeNF') {
                finalValue = value === 'true' || value === true;
            }

            const updatedItem = { ...item, [field]: finalValue };

            // Se mudar a categoria, aplicar margem padrão e NF
            if (field === 'categoria') {
                const cat = config?.categorias?.find(c => c.nome === value);
                if (cat) {
                    updatedItem.margin = String(cat.margem_padrao);
                    updatedItem.marginType = (cat.tipo_margem as 'porcentagem' | 'fixo') || 'porcentagem';
                    updatedItem.exigeNF = cat.nf_obrigatoria ?? true;
                }
            }

            // Se mudou NOME ou SUBCATEGORIA, não precisa recalcular preços caros! Apenas devolve.
            if (field === 'item' || field === 'subcategoria') {
                newResults[index] = updatedItem;
                return newResults;
            }

            // Para outras mudanças (cost, categoria), Recalcular preços
            const c = parseFloat(updatedItem.cost) || 0;
            const m = parseFloat(updatedItem.margin) || 0;

            // Proporcional de custos extras para este item
            const totalBaseCost = newResults.reduce((acc, curr, i) => acc + (i === index ? c : (parseFloat(curr.cost) || 0)), 0);

            const extraCostUnit = distributionMode === 'proportional'
                ? (totalBaseCost > 0 ? (c / totalBaseCost) * extraCosts : 0)
                : (newResults.length > 0 ? extraCosts / newResults.length : 0);

            const prices = calculatePrices(c, m, selectedGateway, updatedItem.categoria, updatedItem.marginType, extraCostUnit, updatedItem.exigeNF);

            newResults[index] = {
                ...updatedItem,
                price: prices.base,
                pricePix: prices.pix,
                priceDebito: prices.debito,
                priceCredit1x: prices.credit1x
            };

            return newResults;
        });
    };

    const resetCalculation = () => {
        setOcrResult([]);
        setOcrImages([]);
        setCurrentImageIndex(0);
        setRawText("");
        setOcrProgress(0);
        setOcrLoading(false);
        setStep(1);
    };

    const handleDownloadRawText = () => {
        if (!rawText) return;
        const blob = new Blob([rawText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr_bruto_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const applyBulkCategory = (catName: string) => {
        if (!catName) return;
        const cat = config?.categorias.find(c => c.nome === catName);
        if (!cat) return;

        setOcrResult(prev => prev.map(item => {
            const updatedItem = {
                ...item,
                categoria: catName,
                margin: String(cat.margem_padrao),
                marginType: (cat.tipo_margem as 'porcentagem' | 'fixo') || 'porcentagem'
            };
            const c = parseFloat(updatedItem.cost) || 0;
            const m = parseFloat(updatedItem.margin) || 0;
            const prices = calculatePrices(c, m, selectedGateway, updatedItem.categoria, updatedItem.marginType);
            return {
                ...updatedItem,
                price: prices.base,
                pricePix: prices.pix,
                priceDebito: prices.debito,
                priceCredit1x: prices.credit1x
            };
        }));
        toast.success(`Categoria ${catName} aplicada a todos os itens`);
    };

    const applyBulkSubcategory = (subcat: string) => {
        setOcrResult(prev => prev.map(item => ({ ...item, subcategoria: subcat })));
        toast.success(`Subcategoria ${subcat} aplicada a todos os itens`);
    };

    const importingRef = useRef(false); // Guard contra importação dupla

    const handleFinalImport = async () => {
        if (!profile) {
            toast.error("Usuário não autenticado");
            return;
        }

        if (ocrResult.length === 0) {
            toast.error("Nenhum produto para importar");
            return;
        }

        if (importingRef.current) {
            console.warn("[Import] Importação já em andamento, ignorando...");
            return;
        }
        importingRef.current = true;
        setIsFinishing(true);

        const performImport = async () => {
            try {
                // Preparar dados para inserção em massa
                // Cada item agora tem sua quantidade correta (1 cadastro = N unidades)
                const produtosParaInserir = ocrResult.map(item => {
                    const baseCost = parseFloat(item.cost) || 0;
                    const dollar = (currencyType === 'USD' ? dollarRate : 1) || 1;
                    const costBrl = baseCost * dollar;

                    const custoCentavos = Math.round(costBrl * 100);
                    const vendaFloat = parseFloat(item.price) || (costBrl * 1.3);
                    const vendaCentavos = Math.round(vendaFloat * 100);
                    const qtd = item.qtd || 1;

                    console.log(`[Mass Import] Preparando item: ${item.item} | Qtd: ${qtd} | Custo: ${custoCentavos} | Venda: ${vendaCentavos}`);

                    return {
                        empresa_id: profile.empresa_id,
                        nome: item.item || "Produto sem nome",
                        preco_custo_centavos: isNaN(custoCentavos) ? 0 : custoCentavos,
                        preco_venda_centavos: isNaN(vendaCentavos) ? 0 : vendaCentavos,
                        estoque_qtd: qtd,
                        estoque_minimo: 1,
                        ncm: "85171231",
                        cfop: "5102",
                        origem: currencyType === 'USD' ? "1" : "0",
                        categoria: item.categoria || null,
                        subcategoria: item.subcategoria || null,
                        imei: null,
                        cor: null,
                        capacidade: null,
                        grade: null,
                        codigo_barras: null,
                        descricao: `Importado via Cálculo em Massa em ${new Date().toLocaleDateString()}`,
                        fornecedor_id: null,
                        condicao: "novo_lacrado" as const,
                        exibir_vitrine: true,
                        sku: null,
                        cest: null,
                        saude_bateria: null,
                        memoria_ram: null,
                        imagem_url: null,
                        product_type_id: null,
                        pricing_segment_id: null,
                        brand_id: null,
                        sale_price_usd: currencyType === 'USD' ? Math.round(baseCost * 1.15 * 100) : 0,
                        sale_price_usd_rate: currencyType === 'USD' ? dollarRate : 0,
                        wholesale_price_brl: Math.round(baseCost * 1.15 * dollar * 100)
                    };
                });

                if (produtosParaInserir.some(p => !p.empresa_id)) {
                    throw new Error("Erro interno: empresa_id não encontrado no perfil.");
                }

                console.log("[Mass Import] Chamando createProdutos com", produtosParaInserir.length, "itens");
                const data = await createProdutos(produtosParaInserir);

                console.log("[Mass Import] Inserção via service concluída:", data?.length);
                return data;
            } catch (err: any) {
                console.error("[Mass Import] Try/Catch Error:", err);
                throw err;
            } finally {
                importingRef.current = false;
                setIsFinishing(false);
            }
        };

        toast.promise(performImport(), {
            loading: 'Importando produtos para o estoque...',
            success: () => {
                router.push("/estoque");
                router.refresh();
                return "Sucesso! Produtos importados.";
            },
            error: (err) => `Erro ao importar: ${err.message || 'Erro desconhecido'}`
        });
    };

    if (!mounted) return null;

    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Wizard Progress */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between relative z-10 px-8">
                    {[
                        { s: 1, l: "OCR e Moeda", icon: Scan },
                        { s: 2, l: "Conferir Dados", icon: FileSearch },
                        { s: 3, l: "Precificação Final", icon: TrendingUp }
                    ].map((item) => (
                        <div key={item.s} className="flex flex-col items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                                step >= item.s ? "bg-brand-500 border-brand-500 text-white shadow-brand-glow scale-110" : "bg-slate-50 border-slate-100 text-slate-300"
                            )}>
                                {step > item.s ? <Check size={24} /> : <item.icon size={24} />}
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest transition-all",
                                step >= item.s ? "text-brand-600" : "text-slate-300"
                            )}>
                                {item.l}
                            </span>
                        </div>
                    ))}
                </div>
                {/* Connector Line */}
                <div className="absolute top-[44px] left-[15%] right-[15%] h-1 bg-slate-50 -z-0 rounded-full">
                    <div
                        className="h-full bg-brand-500 transition-all duration-700 ease-out rounded-full shadow-brand-glow"
                        style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                    />
                </div>
            </div>

            {/* Header / Global Actions */}
            <div className="flex items-center justify-between bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/60 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/ferramentas" className="p-2.5 bg-white hover:bg-slate-50 rounded-2xl transition-all text-slate-400 border border-slate-100 shadow-sm">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Cálculo em Massa</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider opacity-60">
                            Passo {step} de 3 • {step === 1 ? 'Captura e Moeda' : step === 2 ? 'Revisão Técnica' : 'Margens e Taxas'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Currency Selector - ALWAYS VISIBLE */}
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex items-center gap-1 shadow-sm">
                        <button
                            onClick={() => setCurrencyType('BRL')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                currencyType === 'BRL' ? "bg-slate-800 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            REAL (R$)
                        </button>
                        <button
                            onClick={() => setCurrencyType('USD')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                currencyType === 'USD' ? "bg-emerald-500 text-white shadow-emerald-glow" : "text-slate-400 hover:bg-slate-50"
                            )}
                        >
                            DÓLAR (U$)
                        </button>
                    </div>

                    {currencyType === 'USD' && (
                        <div className="flex items-center gap-3 bg-emerald-50/50 px-4 py-2 rounded-2xl border border-emerald-100/50 backdrop-blur-sm">
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Cotação:</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-emerald-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={dollarRate}
                                    onChange={e => setDollarRate(Number(e.target.value))}
                                    className="w-16 bg-transparent border-none p-0 text-sm font-black text-emerald-700 focus:ring-0"
                                />
                            </div>
                        </div>
                    )}

                    <div className="h-8 w-px bg-slate-200/50 mx-2" />

                    <button
                        onClick={resetCalculation}
                        className="p-2.5 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm group"
                        title="Limpar e Começar Novo"
                    >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {step === 1 && (
                <div className={cn(
                    "animate-in fade-in slide-in-from-bottom-4 duration-500",
                    ocrResult.length === 0 ? "max-w-xl mx-auto" : "grid grid-cols-1 lg:grid-cols-4 gap-8"
                )}>
                    {/* Upload Column */}
                    <div className={cn(ocrResult.length === 0 ? "w-full" : "lg:col-span-1", "space-y-4")}>
                        <GlassCard title="Documento / Tabela" icon={Scan}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-6 bg-slate-50/80 p-4 rounded-[24px] border border-slate-100">
                                    <div className="p-2.5 bg-brand-500 rounded-2xl shadow-brand-glow">
                                        <Sparkles size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motor de IA</p>
                                        <p className="text-xs font-black text-slate-800 uppercase">Gemini 2.5 Flash 🚀</p>
                                    </div>
                                </div>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-[32px] p-8 text-center hover:border-brand-400 hover:bg-white transition-all cursor-pointer bg-slate-50/50 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length === 0) return;
                                            const urls = files.map(f => URL.createObjectURL(f));
                                            setOcrImages(prev => [...prev, ...urls]);
                                            processOCR(files);
                                        }}
                                    />
                                    {ocrImages.length > 0 ? (
                                        <div className="relative group/img">
                                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 scrollbar-thin">
                                                {ocrImages.map((img, idx) => (
                                                    <img key={idx} src={img} className="w-full h-24 object-cover rounded-lg shadow-sm" />
                                                ))}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all bg-white/40 backdrop-blur-sm rounded-[32px]">
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-widest bg-white/80 px-4 py-2 rounded-full">Adicionar mais Imagens</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <ImageIcon size={32} className="text-brand-500" />
                                            </div>
                                            <p className="font-black text-slate-800 text-sm">Arraste a lista ou Cole (Ctrl+V)</p>
                                            <button className="mt-3 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                                                Selecionar Arquivo
                                            </button>
                                        </>
                                    )}
                                </div>

                                {ocrLoading && (
                                    <div className="p-6 bg-slate-900 rounded-[28px] text-white text-center">
                                        <div className="w-10 h-10 border-4 border-white/10 border-t-brand-400 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-xs font-bold uppercase tracking-widest mb-1">Processando OCR</p>
                                        <p className="text-2xl font-black">{ocrProgress}%</p>
                                    </div>
                                )}

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                                    <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                                        <Database size={14} />
                                    </div>
                                    <p className="text-[10px] text-amber-700 leading-relaxed font-bold">
                                        DICA: Capture imagens nítidas da invoice. O sistema identificará automaticamente os produtos e preços de custo encontrados.
                                    </p>
                                </div>

                                {config?.gateways && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <GatewaySelector
                                            gateways={config.gateways}
                                            selectedId={selectedGateway?.id || null}
                                            onSelect={setSelectedGateway}
                                        />
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {/* DEBUG PANEL */}
                        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
                            <button
                                onClick={() => setShowDebug(!showDebug)}
                                className="text-[10px] font-bold text-slate-500 flex items-center gap-2 hover:text-slate-800 w-full"
                            >
                                <span>🛠 MODO DEBUG (Ver texto bruto)</span>
                            </button>
                            {showDebug && (
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full mt-2 h-40 text-[10px] font-mono bg-white p-2 rounded border border-slate-200"
                                        value={rawText}
                                        readOnly
                                        placeholder="Aguardando OCR..."
                                    />
                                    <button
                                        onClick={handleDownloadRawText}
                                        className="w-full py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={12} /> Baixar Texto Bruto (.txt)
                                    </button>

                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Análise de Linhas Processadas</p>
                                        <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {debugLines.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 italic">Nenhuma linha processada ainda.</p>
                                            ) : (
                                                debugLines.map((dbg, idx) => (
                                                    <div key={idx} className={cn(
                                                        "p-2 rounded text-[9px] font-mono border",
                                                        dbg.status === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                                            dbg.status === 'skip' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                                                "bg-red-50 border-red-100 text-red-600"
                                                    )}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-black uppercase">{dbg.status} {dbg.reason ? ` - ${dbg.reason}` : ''}</span>
                                                            <span>L{idx + 1}</span>
                                                        </div>
                                                        <p className="line-through opacity-50 mb-1">{dbg.original}</p>
                                                        <p className="font-bold">→ {dbg.cleaned}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table Column - Only show if has results */}
                    {ocrResult.length > 0 && (
                        <div className="lg:col-span-3">
                            <GlassCard title={`Produtos Identificados (${ocrResult.length})`} icon={TrendingUp} className="h-full flex flex-col">
                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="px-4 py-4 text-left">Produto extraído</th>
                                                <th className="px-4 py-4 text-left w-32">Categoria</th>
                                                <th className="px-4 py-4 text-center w-16">Qtd</th>
                                                <th className="px-4 py-4 text-center w-24">Custo {currencyType === 'USD' ? "(U$)" : "(R$)"}</th>
                                                <th className="px-4 py-4 text-center w-20">Margem</th>
                                                <th className="px-4 py-4 text-center w-28">Venda Pix</th>
                                                <th className="px-4 py-4 text-center w-28">Venda 1x</th>
                                                <th className="px-4 py-4 text-right w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {ocrResult.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                                            <FileSearch size={48} className="opacity-10" />
                                                            <p className="text-sm font-bold uppercase tracking-widest">Aguardando leitura de tabela...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                ocrResult.map((res, i) => (
                                                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                className="bg-transparent text-xs font-bold text-slate-800 w-full focus:outline-none mb-1"
                                                                value={res.item}
                                                                onChange={e => updateItem(i, 'item', e.target.value)}
                                                                placeholder="Nome do Produto"
                                                            />
                                                            <input
                                                                className="bg-transparent text-[10px] font-semibold text-slate-400 w-full focus:outline-none focus:text-slate-600 transition-colors"
                                                                value={res.subcategoria}
                                                                onChange={e => updateItem(i, 'subcategoria', e.target.value)}
                                                                placeholder="Subcategoria (Ex: iPhone, Xiaomi...)"
                                                                list="subcategorias-bulk"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                className="bg-slate-100/50 h-8 rounded-lg px-2 text-[9px] font-black uppercase text-slate-600 w-full focus:ring-1 focus:ring-brand-500 outline-none appearance-none"
                                                                value={res.categoria}
                                                                onChange={e => updateItem(i, 'categoria', e.target.value)}
                                                            >
                                                                <option value="">...</option>
                                                                {config?.categorias.map(cat => (
                                                                    <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="bg-amber-50/50 h-8 w-16 rounded-lg text-center text-xs font-black text-amber-700 focus:ring-1 focus:ring-brand-500 outline-none mx-auto block"
                                                                value={res.qtd}
                                                                onChange={e => updateItem(i, 'qtd', Math.max(1, parseInt(e.target.value) || 1))}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    className={cn(
                                                                        "bg-slate-100/50 h-8 rounded-lg text-center text-xs font-black w-full focus:ring-1 focus:ring-brand-500 outline-none",
                                                                        currencyType === 'USD' ? "text-emerald-600 bg-emerald-50/30" : "text-slate-700"
                                                                    )}
                                                                    value={res.cost}
                                                                    onChange={e => updateItem(i, 'cost', e.target.value)}
                                                                />
                                                                {currencyType === 'USD' && (
                                                                    <div className="text-[8px] text-center text-emerald-400 mt-0.5 font-bold">
                                                                        = {formatCurrency(Math.round(parseFloat(res.cost) * dollarRate * 100))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                className="bg-brand-50/50 h-8 rounded-lg text-center text-xs font-black text-brand-600 w-full focus:ring-1 focus:ring-brand-500 outline-none"
                                                                value={res.margin}
                                                                onChange={e => updateItem(i, 'margin', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="h-8 px-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                                                                <span className="text-[11px] font-black text-emerald-600">
                                                                    {formatCurrency(Math.round(parseFloat(res.pricePix) * 100))}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="h-8 px-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                                                                <span className="text-[11px] font-black text-blue-600">
                                                                    {formatCurrency(Math.round(parseFloat(res.priceCredit1x) * 100))}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => removeItem(i)} className="p-1.5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {ocrResult.length > 0 && (
                                    <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Resumo da Carga</p>
                                            <p className="text-sm font-bold text-slate-700">{ocrResult.length} produtos ({ocrResult.reduce((sum, r) => sum + (r.qtd || 1), 0)} unidades) prontos para importação</p>
                                        </div>
                                        <button onClick={() => setStep(2)} className="btn-primary shadow-emerald-glow bg-emerald-600 hover:bg-emerald-700 h-12 px-8">
                                            <Plus size={18} /> IMPORTAR TUDO PARA ESTOQUE
                                        </button>
                                    </div>
                                )}
                            </GlassCard>
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Column - Full Width */}
                    <div className="xl:col-span-12 space-y-6">
                        <GlassCard title="Passo 2: Conferência Técnica" icon={FileSearch} action={
                            ocrImages.length > 0 && (
                                <button
                                    onClick={() => setShowFullImage(true)}
                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-500 transition-all flex items-center gap-1.5"
                                    title="Ver Documento Original"
                                >
                                    <Eye size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ver Documento</span>
                                </button>
                            )
                        }>
                            <div className="p-6 bg-brand-50/30 border-b border-brand-100/50">
                                <p className="text-xs font-bold text-brand-700">
                                    Verifique se os nomes, categorias e custos foram identificados corretamente. Você pode ajustar qualquer campo nesta tabela.
                                </p>
                            </div>
                            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações em Massa:</p>
                                    <select
                                        className="bg-white h-8 rounded-lg border border-slate-200 px-2 text-[9px] font-black uppercase text-slate-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                        onChange={(e) => { applyBulkCategory(e.target.value); e.target.value = ''; }}
                                    >
                                        <option value="">Aplicar Categoria...</option>
                                        {config?.categorias.map(cat => (
                                            <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="bg-white h-8 rounded-lg border border-slate-200 px-2 text-[9px] font-black uppercase text-slate-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                        onChange={(e) => { applyBulkSubcategory(e.target.value); e.target.value = ''; }}
                                    >
                                        <option value="">Aplicar Subcategoria...</option>
                                        <option value="iPhone">iPhone</option>
                                        <option value="Samsung">Samsung</option>
                                        <option value="Xiaomi">Xiaomi</option>
                                        <option value="Cabo">Cabo</option>
                                        <option value="Carregador">Carregador</option>
                                        <option value="Capa">Capa</option>
                                        <option value="Película">Película</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400">
                                    <RefreshCw size={12} className="animate-spin-slow" />
                                    <span>MEMÓRIA ATIVA</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-6 py-4 text-left">Produto Identificado</th>
                                            <th className="px-6 py-4 text-left w-56">Categoria</th>
                                            <th className="px-6 py-4 text-center w-36">Custo ({currencyType === 'USD' ? 'U$' : 'R$'})</th>
                                            <th className="px-6 py-4 text-right w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {ocrResult.map((res, i) => {
                                            const isRegistered = knownProducts.some(p => p.item.toLowerCase() === res.item.toLowerCase());
                                            return (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            className="bg-transparent text-[11px] font-black text-slate-800 w-full focus:outline-none mb-1"
                                                            value={res.item}
                                                            onChange={e => updateItem(i, 'item', e.target.value)}
                                                            placeholder="Nome do Produto"
                                                        />
                                                        <input
                                                            className="bg-transparent text-[10px] font-semibold text-slate-400 w-full focus:outline-none focus:text-slate-600 transition-colors"
                                                            value={res.subcategoria}
                                                            onChange={e => updateItem(i, 'subcategoria', e.target.value)}
                                                            placeholder="Subcategoria (Opcional)"
                                                            list="subcategorias-bulk"
                                                        />
                                                        {isRegistered && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">Produto em Estoque</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select
                                                            className="bg-white h-9 rounded-xl border border-slate-200 px-3 text-[9px] font-black uppercase text-slate-600 w-full focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                                                            value={res.categoria}
                                                            onChange={e => updateItem(i, 'categoria', e.target.value)}
                                                        >
                                                            <option value="">Selecionar...</option>
                                                            {config?.categorias.map(cat => (
                                                                <option key={cat.nome} value={cat.nome}>{cat.nome} ({cat.margem_padrao}%)</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="number"
                                                            className={cn(
                                                                "bg-white h-9 rounded-xl border border-slate-200 text-center text-xs font-black w-full focus:ring-2 focus:ring-brand-500 outline-none shadow-sm",
                                                                currencyType === 'USD' ? "text-emerald-600 border-emerald-100" : "text-slate-800"
                                                            )}
                                                            value={res.cost}
                                                            onChange={e => updateItem(i, 'cost', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => removeItem(i)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 text-xs font-black text-slate-500 hover:text-slate-800 transition-all uppercase tracking-widest"
                                >
                                    Voltar para OCR
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="btn-primary px-10 py-4 shadow-brand-glow flex items-center gap-3"
                                >
                                    <span className="uppercase tracking-widest text-xs font-black">Próximo: Precificação</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                    {/* Toolbar / Global Settings */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <TrendingUp size={120} className="text-slate-900" />
                        </div>
                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <div className="p-3 bg-brand-500 rounded-2xl shadow-brand-glow text-white">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Precificação Inteligente</h2>
                                <p className="text-xs font-bold text-slate-400">Ajuste margens e simule parcelas individualmente</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto relative z-10">
                            {config?.gateways && (
                                <div className="flex-1 md:flex-none min-w-[200px]">
                                    <GatewaySelector
                                        gateways={config.gateways}
                                        selectedId={selectedGateway?.id || null}
                                        onSelect={setSelectedGateway}
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    onClick={() => setDistributionMode('proportional')}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2",
                                        distributionMode === 'proportional' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400"
                                    )}
                                    title="Distribuir frete pelo valor dos itens"
                                >
                                    <Scale size={12} />
                                    Proporcional
                                </button>
                                <button
                                    onClick={() => setDistributionMode('equal')}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2",
                                        distributionMode === 'equal' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400"
                                    )}
                                    title="Dividir frete igualmente entre itens"
                                >
                                    <RotateCw size={12} />
                                    Diluído
                                </button>
                            </div>

                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-white/10">
                                <Truck size={18} className="text-amber-400" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Custos Extras</span>
                                    <input
                                        type="number"
                                        className="bg-transparent text-white font-black text-sm outline-none w-24"
                                        value={extraCosts}
                                        onChange={(e) => setExtraCosts(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {ocrResult.map((res, i) => {
                            const costBrl = parseFloat(res.cost) * (currencyType === 'USD' ? dollarRate : 1);
                            const totalBaseCost = ocrResult.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);

                            const extraCostUnit = distributionMode === 'proportional'
                                ? (totalBaseCost > 0 ? ((parseFloat(res.cost) || 0) / totalBaseCost) * extraCosts : 0)
                                : (ocrResult.length > 0 ? extraCosts / ocrResult.length : 0);

                            const finalCostBrl = costBrl + extraCostUnit;

                            const profit = parseFloat(res.price) - finalCostBrl;
                            const profitPerc = (profit / (parseFloat(res.price) || 1)) * 100;

                            const maxParcela = 12; // Ou buscar dinamicamente o maior do gateway
                            const taxaMax = selectedGateway?.taxas_credito?.[maxParcela - 1]?.taxa || 0;
                            const breakdownImpostoPct = res.exigeNF ? (config?.taxa_nota_fiscal_pct || 0) : 0;

                            const totalParcelado = calculateReverseMarkup(finalCostBrl, parseFloat(res.margin), res.marginType, breakdownImpostoPct, taxaMax);
                            const valorParcela = totalParcelado / maxParcela;

                            return (
                                <div key={i} className={cn(
                                    "bg-white rounded-[32px] border border-slate-100 shadow-lg p-6 hover:shadow-2xl transition-all duration-500 flex flex-col gap-6 relative group overflow-hidden",
                                    focusedItemIndex === i ? "ring-2 ring-brand-500" : ""
                                )} onClick={() => setFocusedItemIndex(i)}>

                                    {/* Card Header */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
                                                    {res.categoria || "Sem Categoria"}
                                                </span>
                                                {(res.qtd || 1) > 1 && (
                                                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                                        x{res.qtd} un.
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = `CUSTOS: ${res.item}\n- Custo Base: ${formatCurrency(costBrl * 100)}\n- Frete Diluído: ${formatCurrency(extraCostUnit * 100)}\n- Custo Final: ${formatCurrency(finalCostBrl * 100)}\n- Sugestão Pix: ${formatCurrency(parseFloat(res.pricePix) * 100)}`;
                                                        navigator.clipboard.writeText(text);
                                                        toast.success("Custos copiados!");
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-brand-500 transition-colors"
                                                    title="Copiar Custos"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 uppercase leading-tight line-clamp-2 min-h-[2.5rem]">
                                            {res.item}
                                        </h3>
                                    </div>

                                    {/* Cost Summary */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Custo Final</span>
                                            <span className="text-sm font-black text-slate-700">
                                                {formatCurrency(Math.round(finalCostBrl * 100))}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-2xl border flex flex-col justify-center",
                                            profitPerc > 25 ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                                profitPerc > 15 ? "bg-amber-50 border-amber-100 text-amber-700" :
                                                    "bg-red-50 border-red-100 text-red-700"
                                        )}>
                                            <span className="text-[9px] font-black opacity-60 uppercase block mb-1">Lucro Líquido</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black text-current">
                                                    {profitPerc.toFixed(1)}%
                                                </span>
                                                <span className="text-[8px] opacity-70 font-bold uppercase">Margem</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls Grid */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateItem(i, 'marginType', 'porcentagem'); }}
                                                    className={cn(
                                                        "flex-1 h-9 rounded-xl text-[10px] font-black transition-all",
                                                        res.marginType === 'porcentagem' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400"
                                                    )}
                                                >
                                                    %
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateItem(i, 'marginType', 'fixo'); }}
                                                    className={cn(
                                                        "flex-1 h-9 rounded-xl text-[10px] font-black transition-all",
                                                        res.marginType === 'fixo' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"
                                                    )}
                                                >
                                                    R$
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-16 bg-white h-9 rounded-xl text-center text-xs font-black text-slate-800 outline-none"
                                                    value={res.margin}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={e => updateItem(i, 'margin', e.target.value)}
                                                />
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateItem(i, 'exigeNF', !res.exigeNF); }}
                                                className={cn(
                                                    "h-11 px-4 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase transition-all border shadow-sm",
                                                    res.exigeNF
                                                        ? "bg-blue-500 text-white border-blue-600 shadow-blue-glow"
                                                        : "bg-slate-100 text-slate-400 border-slate-200"
                                                )}
                                            >
                                                {res.exigeNF ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                                NF-e
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const text = `*🔥 OFERTA: ${res.item}*\n\n💰 À Vista (PIX): *${formatCurrency(parseFloat(res.pricePix) * 100)}*\n💳 Cartão 1x: *${formatCurrency(parseFloat(res.priceCredit1x) * 100)}*\n📱 ${maxParcela}x de *${formatCurrency(Math.round(valorParcela * 100))}*`;
                                                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                                                    window.open(url, '_blank');
                                                }}
                                                className="h-11 w-11 rounded-2xl bg-emerald-500 text-white border border-emerald-600 shadow-emerald-glow flex items-center justify-center hover:scale-105 transition-all"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Prices */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-emerald-glow">
                                            <span className="text-[9px] font-black opacity-80 uppercase block mb-1">Preço À Vista (Pix)</span>
                                            <span className="text-lg font-black">{formatCurrency(Math.round(parseFloat(res.pricePix) * 100))}</span>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-3xl text-white border border-white/5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Cartão 1x</span>
                                            <span className="text-lg font-black">{formatCurrency(Math.round(parseFloat(res.priceCredit1x) * 100))}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveSimulatorItem(i); }}
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-[24px] flex items-center justify-between group-hover:bg-brand-50 transition-all hover:border-brand-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                                <CreditCard size={18} className="text-brand-500" />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase block">Simulação Cartão (1x-21x)</span>
                                                <p className="text-sm font-black text-slate-700">
                                                    {maxParcela}x de <span className="text-brand-600">{formatCurrency(Math.round(valorParcela * 100))}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-2 bg-white rounded-xl group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={16} />
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Consolidated Harvest Summary - Fixed Bottom */}
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-full duration-700">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex flex-wrap items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens Processados</p>
                                    <p className="text-xl font-black text-slate-800">{ocrResult.length} <span className="text-xs text-slate-400">unid.</span></p>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-slate-200" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Total Nota</p>
                                    <p className="text-xl font-black text-slate-800">
                                        {formatCurrency(Math.round(ocrResult.reduce((acc, res) => acc + (parseFloat(res.cost) * (currencyType === 'USD' ? dollarRate : 1)), 0) * 100))}
                                    </p>
                                </div>
                                <div className="hidden sm:block w-px h-10 bg-slate-200" />
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Lucro Bruto Médio</p>
                                    <p className="text-2xl font-black text-emerald-600 tracking-tighter drop-shadow-sm">
                                        {(() => {
                                            const totalBaseCost = ocrResult.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);
                                            return formatCurrency(Math.round(ocrResult.reduce((acc, res) => {
                                                const costBrl = parseFloat(res.cost) * (currencyType === 'USD' ? dollarRate : 1);
                                                const itemExtra = distributionMode === 'proportional'
                                                    ? (totalBaseCost > 0 ? (parseFloat(res.cost) / totalBaseCost) * extraCosts : 0)
                                                    : (ocrResult.length > 0 ? extraCosts / ocrResult.length : 0);
                                                return acc + (parseFloat(res.price) - (costBrl + itemExtra));
                                            }, 0) * 100));
                                        })()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 md:flex-none px-6 py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                                >
                                    Revisar
                                </button>
                                <button
                                    onClick={() => {
                                        const header = `*📋 TABELA DE PREÇOS - ${new Date().toLocaleDateString()}*\n\n`;
                                        const body = ocrResult.map(item => `📍 *${item.item}*\n💵 À Vista: *${formatCurrency(parseFloat(item.pricePix) * 100)}*\n💳 Cartão 1x: *${formatCurrency(parseFloat(item.priceCredit1x) * 100)}*\n`).join('\n');
                                        navigator.clipboard.writeText(header + body);
                                        toast.success("Tabela completa copiada!");
                                    }}
                                    className="hidden sm:flex h-14 px-6 items-center gap-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 font-black text-[10px] uppercase hover:bg-emerald-100 transition-all"
                                >
                                    <MessageCircle size={18} />
                                    Gerar Tabela WhatsApp
                                </button>
                                <button
                                    disabled={isFinishing || ocrResult.length === 0}
                                    onClick={handleFinalImport}
                                    className="flex-[2] md:flex-none px-10 py-5 bg-slate-900 hover:bg-brand-500 text-white rounded-[24px] shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isFinishing ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Plus size={24} />
                                            <span className="text-base font-black uppercase tracking-widest leading-none">Finalizar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Simulator Modal */}
                    {activeSimulatorItem !== null && ocrResult[activeSimulatorItem] && (() => {
                        const item = ocrResult[activeSimulatorItem];
                        const costBrl = parseFloat(item.cost) * (currencyType === 'USD' ? dollarRate : 1);
                        const totalBaseCost = ocrResult.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);
                        const extraCostUnit = distributionMode === 'proportional'
                            ? (totalBaseCost > 0 ? (parseFloat(item.cost) / totalBaseCost) * extraCosts : 0)
                            : (ocrResult.length > 0 ? extraCosts / ocrResult.length : 0);

                        return (
                            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveSimulatorItem(null)} />
                                <div className="relative w-full max-w-xl animate-in zoom-in-95 duration-300">
                                    <InstallmentSimulator
                                        cost={costBrl + extraCostUnit}
                                        margin={parseFloat(item.margin)}
                                        marginType={item.marginType}
                                        impostoPct={item.exigeNF ? (config?.taxa_nota_fiscal_pct || 0) : 0}
                                        gateway={selectedGateway}
                                        productName={item.item}
                                    />
                                    <button
                                        onClick={() => setActiveSimulatorItem(null)}
                                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
            {/* Image Preview Modal */}
            {showFullImage && ocrImages.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute top-6 right-6 z-[110] flex items-center gap-3">
                        {ocrImages.length > 1 && (
                            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/10">
                                <button
                                    onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentImageIndex === 0}
                                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-30"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <span className="px-4 text-white text-xs font-black">
                                    {currentImageIndex + 1} / {ocrImages.length}
                                </span>
                                <button
                                    onClick={() => setCurrentImageIndex(prev => Math.min(ocrImages.length - 1, prev + 1))}
                                    disabled={currentImageIndex === ocrImages.length - 1}
                                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-30"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setShowFullImage(false)}
                            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-800 hover:scale-110 transition-all shadow-2xl"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="relative w-full h-full flex items-center justify-center overflow-auto custom-scrollbar rounded-[40px]">
                        <img
                            src={ocrImages[currentImageIndex]}
                            alt="Full View"
                            className="max-w-none w-auto h-auto min-w-full md:min-w-0"
                        />
                    </div>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[110] bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full">
                        <p className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            Use o mouse/touch para navegar e conferir os detalhes
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface StructuredLine {
    fullText: string;
    words: { text: string; xStart: number; xEnd: number; yCenter: number; height: number; }[];
    yCenter: number;
}

function groupAnnotationByLines(annotation: any): StructuredLine[] {
    const allWords: any[] = [];

    if (!annotation || !annotation.pages) return [];

    annotation.pages.forEach((page: any) => {
        page.blocks.forEach((block: any) => {
            block.paragraphs.forEach((para: any) => {
                para.words.forEach((word: any) => {
                    const text = word.symbols.map((s: any) => s.text).join("");
                    const bbox = word.boundingBox.vertices;

                    const xCoords = bbox.map((v: any) => v.x ?? 0);
                    const yCoords = bbox.map((v: any) => v.y ?? 0);

                    const xStart = Math.min(...xCoords);
                    const xEnd = Math.max(...xCoords);
                    const yTop = Math.min(...yCoords);
                    const yBottom = Math.max(...yCoords);

                    const yCenter = (yTop + yBottom) / 2;
                    const height = yBottom - yTop;

                    allWords.push({ text, yCenter, xStart, xEnd, height });
                });
            });
        });
    });

    // Ordenar por Y
    allWords.sort((a, b) => a.yCenter - b.yCenter);

    const structuredLines: StructuredLine[] = [];
    if (allWords.length > 0) {
        let currentWords = [allWords[0]];
        for (let i = 1; i < allWords.length; i++) {
            const word = allWords[i];
            const avgHeight = currentWords.reduce((acc, w) => acc + w.height, 0) / currentWords.length;

            // Tolerância vertical reduzida de 0.8 para 0.4 para evitar merge de linhas próximas
            if (Math.abs(word.yCenter - currentWords[0].yCenter) < (avgHeight * 0.45)) {
                currentWords.push(word);
            } else {
                currentWords.sort((a, b) => a.xStart - b.xStart);

                // Unir palavras respeitando colunas (espaços extras se o gap for grande)
                let fullText = "";
                for (let j = 0; j < currentWords.length; j++) {
                    const w = currentWords[j];
                    if (j > 0) {
                        const prevW = currentWords[j - 1];
                        const gap = w.xStart - prevW.xEnd;
                        const charWidth = (prevW.xEnd - prevW.xStart) / Math.max(1, prevW.text.length);
                        // Se houver um buraco de mais de 4 caracteres, é provavelmente outra coluna
                        if (gap > charWidth * 4) {
                            fullText += "    ";
                        } else {
                            fullText += " ";
                        }
                    }
                    fullText += w.text;
                }

                structuredLines.push({
                    fullText,
                    words: [...currentWords],
                    yCenter: currentWords[0].yCenter
                });
                currentWords = [word];
            }
        }
        currentWords.sort((a, b) => a.xStart - b.xStart);
        let finalFullText = "";
        for (let j = 0; j < currentWords.length; j++) {
            const w = currentWords[j];
            if (j > 0) {
                const prevW = currentWords[j - 1];
                const gap = w.xStart - prevW.xEnd;
                const charWidth = (prevW.xEnd - prevW.xStart) / Math.max(1, prevW.text.length);
                if (gap > charWidth * 4) finalFullText += "    ";
                else finalFullText += " ";
            }
            finalFullText += w.text;
        }
        structuredLines.push({
            fullText: finalFullText,
            words: currentWords,
            yCenter: currentWords[0].yCenter
        });
    }
    return structuredLines;
}
