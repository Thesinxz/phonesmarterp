"use client";

import { useState, useEffect } from "react";
import {
    Smartphone,
    Globe,
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    Zap,
    Ship,
    AlertTriangle,
    CheckCircle2,
    DollarSign,
    Scan,
    Image as ImageIcon,
    FileSearch,
    Plus,
    Loader2,
    Copy,
    Trash2
} from "lucide-react";
import Link from "next/link";
import Tesseract from 'tesseract.js';
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { createClient } from "@/lib/supabase/client";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { useAuth } from "@/context/AuthContext";
import { GatewaySelector } from "@/components/ui/GatewaySelector";
import { type PaymentGateway } from "@/types/configuracoes";
import { createProdutos } from "@/services/estoque";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

const supabase = createClient();

export default function CalculadoraImportacaoAvancada() {
    const { config, defaultGateway, loading: configLoading } = useFinanceConfig();
    const { profile } = useAuth();
    const router = useRouter();
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
    const [loadingRates, setLoadingRates] = useState(false);

    // GLOBAL PARAMS (Configuráveis pelo usuário)
    const [params, setParams] = useState({
        dolarCompra: 5.15,
        taxaImportacaoPct: 7.5,
        taxaUsdtUsdPct: 0.05,
        dolarTaxaImportacao: 5.25,
        freteEuaUsd: 15,
        freteBrasilBrl: 150,
        margemPadrao: 25
    });

    // OCR States
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrImage, setOcrImage] = useState<string | null>(null);
    const [items, setItems] = useState<{ id: string, label: string, custoUsd: number, categoria: string, subcategoria: string, condicao: string, quantidade: number }[]>([]);
    const [debugMode, setDebugMode] = useState(false);
    const [rawOcrText, setRawOcrText] = useState("");
    const [ocrStatus, setOcrStatus] = useState("");

    // Sincronizar dados iniciais
    useEffect(() => {
        if (config) {
            setParams(prev => ({
                ...prev,
                dolarCompra: config.cotacao_dolar_paraguai || 5.15,
                dolarTaxaImportacao: (config.cotacao_dolar_paraguai || 5.15) + 0.10
            }));
            if (defaultGateway && !selectedGateway) {
                setSelectedGateway(defaultGateway);
            }
        }
    }, [config, defaultGateway]);

    // Helper para carregar scripts dinamicamente
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
            script.onload = () => {
                console.log(`Script carregado: ${src}`);
                resolve(true);
            };
            script.onerror = (err) => {
                console.error(`Erro ao carregar script: ${src}`, err);
                reject(err);
            };
            document.head.appendChild(script);
        });
    };

    // OCR Logic
    async function processOCR(file: File) {
        console.log("📂 Iniciando processamento:", file.name);
        setOcrLoading(true);
        setOcrProgress(0);
        setRawOcrText("");
        setOcrStatus("Iniciando...");

        try {
            let imagesToProcess: string[] = [];

            if (file.type === "application/pdf") {
                setOcrStatus("Carregando motor de PDF (v2.16)...");
                // Usando a versão 2.16 que é a mais estável para injeção global
                await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js");

                // @ts-ignore
                const pdfjsLib = window['pdfjsLib'];
                if (!pdfjsLib) throw new Error("O motor de PDF não respondeu. Tente novamente ou use um Print.");

                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

                setOcrStatus("Lendo arquivo PDF...");
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                console.log("📄 PDF carregado com", pdf.numPages, "páginas.");

                for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                    setOcrStatus(`Convertendo página ${i} em imagem...`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d', { willReadFrequently: true });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({
                            canvasContext: context,
                            viewport
                        }).promise;
                        imagesToProcess.push(canvas.toDataURL('image/png'));
                    }
                }
            } else {
                setOcrStatus("Preparando imagem...");
                imagesToProcess.push(URL.createObjectURL(file));
            }

            const newItems: any[] = [];
            let fullText = "";

            setOcrStatus("Iniciando reconhecimento de texto (OCR)...");
            for (let idx = 0; idx < imagesToProcess.length; idx++) {
                const imgSource = imagesToProcess[idx];
                console.log(`Iniciando Tesseract na imagem ${idx + 1}...`);
                setOcrStatus(`Lendo texto da página/imagem ${idx + 1}...`);

                const result = await Tesseract.recognize(imgSource, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
                    }
                });

                fullText += result.data.text + "\n";
                const lines = result.data.text.split('\n');
                let lastIncompleteItem: any = null;

                lines.forEach((line) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;

                    // Regex para capturar padrão RecirQ: ID Descrição Qty - Qty $Price $ExtPrice
                    // Ex: 4407 Apple iPhone 13 128GB Grade B Green 1 - 1 $280.00 $280.00
                    const recirqPattern = /(\d{4,5})\s+(Apple\s+.+?)\s+(\d+)\s+-\s+(\d+)\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})/;
                    const match = cleanLine.match(recirqPattern);

                    if (match) {
                        const [full, id, desc, ordQty, shipQty, price, extPrice] = match;
                        const unitPrice = parseFloat(price.replace(',', ''));
                        const quantity = parseInt(shipQty);

                        const lower = desc.toLowerCase();
                        let categoria = "iPhone Lacrado";
                        if (lower.includes('grade') || lower.includes('used') || lower.includes('semi')) {
                            categoria = "iPhone Semi Novo";
                        }

                        const newItem = {
                            id: `item-${Date.now()}-${Math.random()}`,
                            label: desc.trim(),
                            custoUsd: unitPrice,
                            quantidade: quantity,
                            categoria,
                            subcategoria: "iPhone",
                            condicao: lower.includes('grade') || lower.includes('used') || lower.includes('semi') ? "seminovo" : "novo_lacrado"
                        };

                        newItems.push(newItem);
                        lastIncompleteItem = newItem;
                    } else if (lastIncompleteItem && cleanLine.length > 3 && !cleanLine.includes('$')) {
                        // Se a linha não tem preço mas tem texto, pode ser continuação da descrição anterior
                        // Ex: "Titanium" quebrado na linha de baixo
                        lastIncompleteItem.label += " " + cleanLine;
                    }
                });
            }

            setRawOcrText(fullText);
            setOcrStatus("Cálculo concluído.");

            if (newItems.length === 0) {
                console.warn("Nenhum item identificado pelo regex.");
                alert("Não identificamos produtos. Verifique se o arquivo está nítido e no padrão de invoice.");
            } else {
                console.log(`${newItems.length} itens identificados.`);
                setItems(prev => [...prev, ...newItems]);
            }
        } catch (error: any) {
            console.error("Erro fatal no OCR:", error);
            setOcrStatus(`Erro: ${error?.message || "Erro desconhecido"}`);
            alert(`Erro ao processar arquivo: ${error?.message || "Verifique se é um PDF ou Imagem válido."}`);
        } finally {
            setOcrLoading(false);
        }
    }

    // Calculation per Item
    const calculateItem = (itemCustoUsd: number, categoriaNome?: string) => {
        // 1. Total de itens para rateio de frete
        const totalItems = items.reduce((acc, it) => acc + (it.quantidade || 1), 0) || 1;

        // 2. Custo USDT (USD -> USD com taxa)
        const valorTaxaUsdtUsd = itemCustoUsd * (params.taxaUsdtUsdPct / 100);
        const custoComUsdtUsd = itemCustoUsd + valorTaxaUsdtUsd;

        // 3. Imposto de Importação (calculado sobre USD, mas convertido pelo Dólar da Taxa)
        const impostoBrl = (custoComUsdtUsd * (params.taxaImportacaoPct / 100)) * params.dolarTaxaImportacao;

        // 4. Conversão do produto (Custo USD x Dólar Compra)
        const custoMoedaBrl = custoComUsdtUsd * params.dolarCompra;

        // 5. Fretes Pro-rata (Divide o frete total pela qtd de aparelhos)
        const freteEuaBrl = (params.freteEuaUsd * params.dolarCompra) / totalItems;
        const freteBrasilBrl = params.freteBrasilBrl / totalItems;

        const custoFinalBrl = custoMoedaBrl + impostoBrl + freteEuaBrl + freteBrasilBrl;

        // CÁLCULO DE PREÇO SUGERIDO COM GATEWAY + NF POR CATEGORIA (MARKUP REVERSO)
        // Preço = Custo / (1 - Margem% - NF% - TaxaGateway%)
        const cat = config?.categorias.find(c => c.nome === categoriaNome);
        const exigeNF = cat ? cat.nf_obrigatoria : true;
        const taxaNF = exigeNF ? (config?.taxa_nota_fiscal_pct || 0) / 100 : 0;

        const taxaMargem = params.margemPadrao / 100;
        const taxaPix = (selectedGateway?.taxa_pix_pct || 0) / 100;
        const taxaCredito1x = (selectedGateway?.taxas_credito?.[0]?.taxa || 0) / 100;

        const divisorPix = 1 - taxaMargem - taxaNF - taxaPix;
        const precoSugeridoPix = divisorPix > 0
            ? custoFinalBrl / divisorPix
            : custoFinalBrl * (1 + taxaMargem + taxaNF + taxaPix);

        const divisor1x = 1 - taxaMargem - taxaNF - taxaCredito1x;
        const precoSugerido1x = divisor1x > 0
            ? custoFinalBrl / divisor1x
            : custoFinalBrl * (1 + taxaMargem + taxaNF + taxaCredito1x);

        return {
            custoMoedaBrl,
            impostoBrl,
            freteTotalBrl: freteEuaBrl + freteBrasilBrl,
            custoFinalBrl,
            precoSugeridoPix,
            precoSugerido1x
        };
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleFinalImport = async () => {
        if (!profile) return toast.error("Usuário não autenticado");
        if (items.length === 0) return toast.error("Nenhum produto para importar");

        const promise = new Promise(async (resolve, reject) => {
            try {
                const produtosParaInserir = items.map(item => {
                    const { custoFinalBrl, precoSugerido1x } = calculateItem(item.custoUsd, item.categoria);
                    return {
                        empresa_id: profile.empresa_id,
                        nome: item.label,
                        categoria: item.categoria,
                        subcategoria: item.subcategoria || null,
                        preco_custo_centavos: Math.round(custoFinalBrl * 100),
                        preco_venda_centavos: Math.round(precoSugerido1x * 100),
                        estoque_qtd: item.quantidade || 1,
                        estoque_minimo: 1,
                        condicao: item.condicao || 'novo_lacrado',
                        ncm: "85171231",
                        cfop: "5102",
                        origem: "1", // Importado
                        descricao: "Importado via Calculadora de Importação Avançada"
                    };
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await createProdutos(produtosParaInserir as any);
                resolve(true);
            } catch (e) { reject(e); }
        });
        toast.promise(promise, {
            loading: 'Importando para o estoque...',
            success: () => { setItems([]); router.push('/estoque'); return 'Importação concluída!'; },
            error: 'Erro na importação'
        });
    };

    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/ferramentas" className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Importação Pro (USA/PY)</h1>
                        <p className="text-slate-500 text-sm">Escaneie invoices e calcule custos reais de desembarque</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* GLOBAL PARAMETERS COLUMN */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard title="Configuração de Taxas" icon={TrendingUp}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Dólar Compra (Produto)</label>
                                <input type="text" className="input-glass h-10 font-bold"
                                    value={params.dolarCompra} onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === "" || !isNaN(Number(val))) setParams({ ...params, dolarCompra: val as any });
                                    }} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa Importação (%)</label>
                                <input type="text" className="input-glass h-10 font-bold"
                                    value={params.taxaImportacaoPct} onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === "" || !isNaN(Number(val))) setParams({ ...params, taxaImportacaoPct: val as any });
                                    }} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa USDT {"->"} USD (%)</label>
                                <input type="text" className="input-glass h-10 font-bold"
                                    value={params.taxaUsdtUsdPct} onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === "" || !isNaN(Number(val))) setParams({ ...params, taxaUsdtUsdPct: val as any });
                                    }} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Dólar (Taxa de Importação)</label>
                                <input type="text" className="input-glass h-10 font-bold text-amber-600"
                                    value={params.dolarTaxaImportacao} onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === "" || !isNaN(Number(val))) setParams({ ...params, dolarTaxaImportacao: val as any });
                                    }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete EUA ($)</label>
                                    <input type="text" className="input-glass h-10 font-bold"
                                        value={params.freteEuaUsd} onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            if (val === "" || !isNaN(Number(val))) setParams({ ...params, freteEuaUsd: val as any });
                                        }} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete BR (R$)</label>
                                    <input type="text" className="input-glass h-10 font-bold"
                                        value={params.freteBrasilBrl} onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            if (val === "" || !isNaN(Number(val))) setParams({ ...params, freteBrasilBrl: val as any });
                                        }} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Margem Padrão (%)</label>
                                <input type="text" className="input-glass h-10 font-bold text-emerald-600"
                                    value={params.margemPadrao} onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        if (val === "" || !isNaN(Number(val))) setParams({ ...params, margemPadrao: val as any });
                                    }} />
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

                    {/* OCR UPLOAD */}
                    <div className="border-2 border-dashed border-slate-200 rounded-[32px] p-6 text-center hover:border-brand-400 transition-all cursor-pointer bg-slate-50/50 group relative overflow-hidden">
                        <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    processOCR(file);
                                    e.target.value = ""; // Reseta o input para permitir selecionar o mesmo arquivo novamente
                                }
                            }} />
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            {ocrLoading ? <Loader2 className="animate-spin text-brand-500" /> : <Scan size={24} className="text-brand-500" />}
                        </div>
                        <p className="font-black text-slate-800 text-xs">Escamear Invoice</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">PDF ou Imagem</p>
                        {ocrLoading && (
                            <div className="p-4 bg-slate-900 rounded-[24px] text-white text-center mt-4">
                                <div className="w-8 h-8 border-4 border-white/10 border-t-brand-400 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1">{ocrStatus}</p>
                                {ocrProgress > 0 && <p className="text-xl font-black">{ocrProgress}%</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* ITEMS LIST COLUMN */}
                <div className="lg:col-span-3 space-y-6">
                    <GlassCard
                        title={`Produtos Importados Detalhados (${items.length})`}
                        icon={Smartphone}
                        action={items.length > 0 && (
                            <button
                                onClick={() => setItems([])}
                                className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                            >
                                <Trash2 size={12} /> Limpar Tudo
                            </button>
                        )}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-4 text-left">Modelo / Descrição</th>
                                        <th className="px-4 py-4 text-center w-12">Qtd</th>
                                        <th className="px-4 py-4 text-center">Origem ($)</th>
                                        <th className="px-4 py-4 text-center">Imposto (R$)</th>
                                        <th className="px-4 py-4 text-center">Fretes (R$)</th>
                                        <th className="px-4 py-4 text-center">Custo Final</th>
                                        <th className="px-4 py-4 text-center">Venda Pix</th>
                                        <th className="px-4 py-4 text-center">Venda 1x</th>
                                        <th className="px-4 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-300">
                                                    <FileSearch size={48} className="opacity-10" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">Aguardando importação de invoice...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item: any, i) => {
                                            const { custoFinalBrl, precoSugeridoPix, precoSugerido1x, impostoBrl, freteTotalBrl } = calculateItem(item.custoUsd, item.categoria);
                                            return (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col gap-2">
                                                            <input className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-800 text-sm w-full outline-none focus:ring-1 focus:ring-brand-500 transition-shadow"
                                                                value={item.label} onChange={e => {
                                                                    const newItems = [...items];
                                                                    newItems[i].label = e.target.value;
                                                                    setItems(newItems);
                                                                }} placeholder="Modelo / Descrição" />
                                                            <div className="flex gap-2">
                                                                <input className="bg-transparent text-[10px] text-brand-500 font-black uppercase tracking-widest w-full outline-none placeholder:text-brand-300"
                                                                    value={item.categoria} onChange={e => {
                                                                        const newItems = [...items];
                                                                        newItems[i].categoria = e.target.value;
                                                                        setItems(newItems);
                                                                    }} placeholder="Categoria Ex: Smartphones" />
                                                                <input className="bg-transparent text-[10px] text-slate-400 font-bold uppercase tracking-widest w-full outline-none placeholder:text-slate-300"
                                                                    value={item.subcategoria} onChange={e => {
                                                                        const newItems = [...items];
                                                                        newItems[i].subcategoria = e.target.value;
                                                                        setItems(newItems);
                                                                    }} placeholder="Subcategoria Ex: iPhone" />
                                                                <select className="bg-transparent text-[9px] text-indigo-500 font-bold uppercase tracking-widest outline-none w-24 cursor-pointer"
                                                                    value={item.condicao} onChange={e => {
                                                                        const newItems = [...items];
                                                                        newItems[i].condicao = e.target.value;
                                                                        setItems(newItems);
                                                                    }}>
                                                                    <option value="novo_lacrado">Novo</option>
                                                                    <option value="seminovo">Seminovo</option>
                                                                    <option value="usado">Usado</option>
                                                                    <option value="defeito">Defeito</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <input type="number" className="bg-slate-100/50 h-8 w-10 rounded-lg text-center font-black text-slate-600 outline-none"
                                                            value={item.quantidade || 1} onChange={e => {
                                                                const newItems = [...items];
                                                                newItems[i].quantidade = Number(e.target.value);
                                                                setItems(newItems);
                                                            }} />
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <p className="text-sm font-black text-brand-600">${item.custoUsd.toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <p className="text-xs font-bold text-slate-400">R$ {impostoBrl.toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <p className="text-xs font-bold text-slate-400">R$ {freteTotalBrl.toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div
                                                            onClick={() => handleCopy(formatCurrency(Math.round(custoFinalBrl * 100)))}
                                                            className="flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 py-1 rounded transition-colors group/copy"
                                                            title="Clique para copiar"
                                                        >
                                                            <p className="text-sm font-black text-slate-800">
                                                                {formatCurrency(Math.round(custoFinalBrl * 100))}
                                                            </p>
                                                            <Copy size={10} className="text-slate-300 opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div
                                                            onClick={() => handleCopy(formatCurrency(Math.round(precoSugeridoPix * 100)))}
                                                            className="bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1 group/copy"
                                                            title="Clique para copiar"
                                                        >
                                                            <span className="text-emerald-600 font-black text-sm">
                                                                {formatCurrency(Math.round(precoSugeridoPix * 100))}
                                                            </span>
                                                            <Copy size={10} className="text-emerald-300 opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div
                                                            onClick={() => handleCopy(formatCurrency(Math.round(precoSugerido1x * 100)))}
                                                            className="bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg cursor-pointer hover:bg-brand-100 transition-colors flex items-center justify-center gap-1 group/copy"
                                                            title="Clique para copiar"
                                                        >
                                                            <span className="text-brand-600 font-black text-sm">
                                                                {formatCurrency(Math.round(precoSugerido1x * 100))}
                                                            </span>
                                                            <Copy size={10} className="text-brand-300 opacity-0 group-hover/copy:opacity-100" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <button onClick={() => setItems(items.filter((it: any) => it.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {items.length > 0 && (
                            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Itens</p>
                                        <p className="text-xl font-black text-slate-800">
                                            {items.reduce((acc, it) => acc + (it.quantidade || 1), 0)} un.
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Origem ($)</p>
                                        <p className="text-xl font-black text-brand-600">
                                            ${items.reduce((acc, it) => acc + (it.custoUsd * (it.quantidade || 1)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Impostos (R$)</p>
                                        <p className="text-xl font-black text-amber-600">
                                            R$ {items.reduce((acc, it) => acc + (calculateItem(it.custoUsd, it.categoria).impostoBrl * (it.quantidade || 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fretes (R$)</p>
                                        <p className="text-xl font-black text-slate-600">
                                            R$ {items.reduce((acc, it) => acc + (calculateItem(it.custoUsd, it.categoria).freteTotalBrl * (it.quantidade || 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Custo Final Lote</p>
                                        <div className="flex flex-col">
                                            <p className="text-2xl font-black text-slate-900 leading-none">
                                                {formatCurrency(Math.round(items.reduce((acc, it) => acc + (calculateItem(it.custoUsd, it.categoria).custoFinalBrl * (it.quantidade || 1)), 0) * 100))}
                                            </p>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Investimento Total</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 size={20} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">Conferência Pronta</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Revise os dados antes de importar ao estoque</p>
                                        </div>
                                    </div>
                                    <button onClick={handleFinalImport} className="btn-primary h-14 px-10 gap-3 text-sm shadow-emerald-glow bg-emerald-600 hover:bg-emerald-700">
                                        <Plus size={20} /> IMPORTAR TUDO PARA ESTOQUE
                                    </button>
                                </div>
                            </div>
                        )}
                    </GlassCard>

                    {/* Legend / Info */}
                    <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-400" size={20} /> Entenda o Cálculo Pro
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-white/60 leading-relaxed">
                            <p>
                                <strong className="text-white">Taxa USDT:</strong> Aplicada sobre o custo em dólar para refletir o custo real da moeda enviada.
                                <br /><br />
                                <strong className="text-white">Taxa Importação:</strong> Calculada sobre o custo USD e convertida usando o <strong className="text-amber-400">Dólar da Taxa</strong> específico.
                            </p>
                            <p>
                                <strong className="text-white">Desembarque:</strong> Soma o produto convertido + taxas + fretes pro-rata. Este é o seu <strong className="text-brand-400">Custo Real Final</strong> em estoque.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEBUG PANEL - Print Debug */}
            <div className="mt-20 border-t border-slate-200 pt-8">
                <button
                    onClick={() => setDebugMode(!debugMode)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-500 transition-colors"
                >
                    {debugMode ? "[ Esconder Debug ]" : "[ Mostrar Print Debug ]"}
                </button>

                {debugMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-slide-up">
                        <div className="bg-slate-900 p-6 rounded-3xl overflow-auto max-h-[400px]">
                            <p className="text-brand-400 text-[10px] font-black uppercase mb-4">Finance Config & Params</p>
                            <pre className="text-xs text-brand-200/50 font-mono">
                                {JSON.stringify({ config, params }, null, 2)}
                            </pre>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-3xl overflow-auto max-h-[400px]">
                            <p className="text-brand-400 text-[10px] font-black uppercase mb-4">Raw OCR Text</p>
                            <pre className="text-xs text-emerald-200/50 font-mono whitespace-pre-wrap">
                                {rawOcrText || "Nenhum texto processado ainda."}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
