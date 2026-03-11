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
    FileSearch
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

export default function CalculadoraImportacaoAvancada() {
    const { config, defaultGateway, loading: configLoading } = useFinanceConfig();
    const { profile } = useAuth();
    const router = useRouter();
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
    const [currentStep, setCurrentStep] = useState(1);

    // GLOBAL PARAMS
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
    const [items, setItems] = useState<{ id: string, label: string, custoUsd: number, categoria: string, subcategoria: string, condicao: string, quantidade: number, margemCustom?: number }[]>([]);
    const [ocrStatus, setOcrStatus] = useState("");

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

    const calculateItem = (itemCustoUsd: number, categoriaNome?: string, margemCustom?: number) => {
        const totalItems = items.reduce((acc, it) => acc + (it.quantidade || 1), 0) || 1;
        const valorTaxaUsdtUsd = itemCustoUsd * (params.taxaUsdtUsdPct / 100);
        const custoComUsdtUsd = itemCustoUsd + valorTaxaUsdtUsd;
        const impostoBrl = (custoComUsdtUsd * (params.taxaImportacaoPct / 100)) * params.dolarTaxaImportacao;
        const custoMoedaBrl = custoComUsdtUsd * params.dolarCompra;
        const freteEuaBrl = (params.freteEuaUsd * params.dolarCompra) / totalItems;
        const freteBrasilBrl = params.freteBrasilBrl / totalItems;

        const custoFinalBrl = custoMoedaBrl + impostoBrl + freteEuaBrl + freteBrasilBrl;

        const cat = config?.categorias.find(c => c.nome === categoriaNome);
        const exigeNF = cat ? cat.nf_obrigatoria : true;
        const taxaNF = exigeNF ? (config?.taxa_nota_fiscal_pct || 0) / 100 : 0;

        const taxaMargem = (margemCustom !== undefined ? margemCustom : params.margemPadrao) / 100;
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
        toast.success("Copiado!");
    };

    const applyGlobalMargin = (margin: number) => {
        setParams({ ...params, margemPadrao: margin });
        setItems(items.map(item => ({ ...item, margemCustom: undefined })));
    };

    const handleFinalImport = async () => {
        if (!profile) return toast.error("Usuário não autenticado");
        if (items.length === 0) return toast.error("Nenhum produto para importar");

        const promise = new Promise(async (resolve, reject) => {
            try {
                const produtosParaInserir = items.map(item => {
                    const { custoFinalBrl, precoSugerido1x } = calculateItem(item.custoUsd, item.categoria, item.margemCustom);
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
                        descricao: "Importado via Calculadora de Importação Avançada",
                        exibir_vitrine: true // FIX: added required field
                    };
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await createProdutos(produtosParaInserir as any);
                resolve(true);
            } catch (e) { reject(e); }
        });
        toast.promise(promise, {
            loading: 'Importando para o estoque...',
            success: () => { setItems([]); router.push('/estoque/pecas'); return 'Importação concluída com sucesso!'; },
            error: 'Erro na importação. Verifique os dados.'
        });
    };

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
            <div className="flex items-center justify-between mb-8">
                {[
                    { step: 1, label: "Configuração e Upload", icon: Settings },
                    { step: 2, label: "Produtos Detalhados", icon: List },
                    { step: 3, label: "Precificação e Estoque", icon: DollarSign }
                ].map((s, idx) => (
                    <div key={s.step} className="flex flex-col items-center flex-1 relative">
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
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Taxa USDT {"->"} USD (%)</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.taxaUsdtUsdPct} onChange={e => setParams({ ...params, taxaUsdtUsdPct: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete EUA ($) - Lote</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.freteEuaUsd} onChange={e => setParams({ ...params, freteEuaUsd: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Frete BR (R$) - Lote</label>
                                <input type="number" step="0.01" className="input-glass h-12 font-bold text-lg w-full"
                                    value={params.freteBrasilBrl} onChange={e => setParams({ ...params, freteBrasilBrl: Number(e.target.value) })} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="2. Enviar Invoice (Invoice)" icon={Scan}>
                        <div className="border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center hover:border-brand-400 hover:bg-brand-50/50 transition-all cursor-pointer relative overflow-hidden h-full flex flex-col justify-center">
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
                    <GlassCard title={`Tabela de Produtos (${items.length})`} icon={List} action={
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentStep(1)} className="btn-secondary h-10 px-6 text-sm"><ChevronLeft size={16} /> Voltar</button>
                            <button onClick={() => setItems([])} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase ml-2">Limpar tudo</button>
                            <button onClick={() => setCurrentStep(3)} className="btn-primary h-10 px-6 text-sm ml-2">Avançar <ChevronRight size={16} /></button>
                        </div>
                    }>
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-4 min-w-[350px]">Produto (Descrição)</th>
                                        <th className="px-4 py-4 text-center">Classificação</th>
                                        <th className="px-4 py-4 text-center w-24">Qtd</th>
                                        <th className="px-4 py-4 text-right min-w-[120px]">Valor Base ($)</th>
                                        <th className="px-4 py-4 text-right">Imposto (R$)</th>
                                        <th className="px-4 py-4 text-right">Fretes (R$)</th>
                                        <th className="px-4 py-4 text-right font-bold text-slate-800">Custo Final</th>
                                        <th className="px-4 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <p className="text-slate-400 font-bold">Nenhum produto lido.</p>
                                            </td>
                                        </tr>
                                    ) : items.map((item, i) => {
                                        const calc = calculateItem(item.custoUsd, item.categoria, item.margemCustom);
                                        return (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="text"
                                                    className="w-full bg-slate-100 border-none outline-none focus:ring-2 focus:ring-brand-500 rounded-xl px-4 py-3 font-bold text-slate-800 text-sm"
                                                    value={item.label} 
                                                    onChange={e => {
                                                        const newItems = [...items];
                                                        newItems[i].label = e.target.value;
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <input className="bg-slate-100 px-3 py-2 rounded-lg text-xs font-bold w-full max-w-[120px] outline-none" value={item.categoria} onChange={e => {
                                                        const newItems = [...items]; newItems[i].categoria = e.target.value; setItems(newItems);
                                                    }} placeholder="Cat" />
                                                    <select className="bg-slate-100 px-3 py-2 rounded-lg text-xs font-bold flex-1 min-w-[100px] outline-none" value={item.condicao} onChange={e => {
                                                        const newItems = [...items]; newItems[i].condicao = e.target.value; setItems(newItems);
                                                    }}>
                                                        <option value="novo_lacrado">Novo</option>
                                                        <option value="seminovo">Seminovo</option>
                                                        <option value="usado">Usado</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input type="number" className="w-16 bg-slate-100 px-2 py-2 rounded-lg text-center font-black outline-none" value={item.quantidade} onChange={e => {
                                                    const newItems = [...items]; newItems[i].quantidade = Number(e.target.value); setItems(newItems);
                                                }} />
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-brand-600 text-base">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span>$</span>
                                                    <input type="number" step="0.01" className="w-24 bg-brand-50 text-brand-600 px-2 py-1 rounded-lg text-right font-black outline-none border-transparent focus:border-brand-300 border" value={item.custoUsd} onChange={e => {
                                                        const newItems = [...items]; newItems[i].custoUsd = Number(e.target.value); setItems(newItems);
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-slate-400">
                                                R$ {calc.impostoBrl.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-bold text-slate-400">
                                                R$ {calc.freteTotalBrl.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-black text-slate-800">
                                                    {formatCurrency(Math.round(calc.custoFinalBrl * 100))}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => setItems(items.filter(it => it.id !== item.id))} className="text-slate-300 hover:text-red-500 p-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Step 3: Precificação */}
            {currentStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-8 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Margem Global Control */}
                        <GlassCard title="Painel de Precificação" icon={TrendingUp}>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Margem de Lucro (% Global)</label>
                                <div className="flex gap-2">
                                    <input type="number" className="input-glass h-12 w-full font-black text-emerald-600 text-lg" value={params.margemPadrao} onChange={e => applyGlobalMargin(Number(e.target.value))} />
                                    <button className="btn-secondary h-12 px-4 whitespace-nowrap text-xs" onClick={() => applyGlobalMargin(params.margemPadrao)}>Aplicar a Todos</button>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Gateway de Pagamento Ativo</label>
                                    <GatewaySelector gateways={config?.gateways || []} selectedId={selectedGateway?.id || null} onSelect={setSelectedGateway} />
                                </div>
                            </div>
                        </GlassCard>
                        
                        {/* Resumo Financeiro */}
                        <div className="lg:col-span-2">
                            <GlassCard title="Resumo do Lote">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Itens</p>
                                        <p className="text-2xl font-black text-slate-800">{items.reduce((acc, it) => acc + (it.quantidade || 1), 0)} un.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Origem</p>
                                        <p className="text-2xl font-black text-brand-600">${items.reduce((acc, it) => acc + (it.custoUsd * (it.quantidade || 1)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Impostos/Fretes</p>
                                        <p className="text-xl font-black text-amber-600">R$ {items.reduce((acc, it) => {
                                            const calc = calculateItem(it.custoUsd, it.categoria, it.margemCustom);
                                            return acc + ((calc.impostoBrl + calc.freteTotalBrl) * (it.quantidade || 1));
                                        }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Custo Real Final</p>
                                        <p className="text-3xl font-black text-slate-900 leading-none mt-1">
                                            {formatCurrency(Math.round(items.reduce((acc, it) => acc + (calculateItem(it.custoUsd, it.categoria, it.margemCustom).custoFinalBrl * (it.quantidade || 1)), 0) * 100))}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>

                    <GlassCard title="Preços Finais de Venda" action={
                        <div className="flex gap-4">
                            <button onClick={() => setCurrentStep(2)} className="btn-secondary h-12 px-6 text-sm">
                                <ChevronLeft size={18} className="mr-2" /> Voltar
                            </button>
                            <button onClick={handleFinalImport} className="btn-primary h-12 px-8 text-sm bg-emerald-600 hover:bg-emerald-700 shadow-emerald-glow">
                                <Plus size={18} className="mr-2" /> ENVIAR PARA ESTOQUE
                            </button>
                        </div>
                    }>
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-4 min-w-[200px]">Produto</th>
                                        <th className="px-4 py-4 text-center">Custo Final</th>
                                        <th className="px-4 py-4 text-center w-32">Margem (%)</th>
                                        <th className="px-4 py-4 text-center">Venda Pix Sug.</th>
                                        <th className="px-4 py-4 text-center">Venda 1x Sug.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item, i) => {
                                        const { custoFinalBrl, precoSugeridoPix, precoSugerido1x } = calculateItem(item.custoUsd, item.categoria, item.margemCustom);
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-4 max-w-[200px] truncate font-bold text-slate-800 text-sm">
                                                    {item.quantidade}x {item.label}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="text-sm font-bold text-slate-500 cursor-pointer" onClick={() => handleCopy(formatCurrency(Math.round(custoFinalBrl * 100)))}>
                                                        {formatCurrency(Math.round(custoFinalBrl * 100))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input type="number" className="w-20 bg-emerald-50 text-emerald-600 px-2 py-2 rounded-lg text-center font-black outline-none border border-emerald-100 focus:border-emerald-400" 
                                                        value={item.margemCustom !== undefined ? item.margemCustom : params.margemPadrao} 
                                                        onChange={e => {
                                                            const newItems = [...items];
                                                            newItems[i].margemCustom = Number(e.target.value);
                                                            setItems(newItems);
                                                        }} />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="bg-slate-100 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors inline-block text-slate-800 font-black text-sm" onClick={() => handleCopy(formatCurrency(Math.round(precoSugeridoPix * 100)))}>
                                                        {formatCurrency(Math.round(precoSugeridoPix * 100))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="bg-brand-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-brand-100 transition-colors inline-block text-brand-600 font-black text-sm" onClick={() => handleCopy(formatCurrency(Math.round(precoSugerido1x * 100)))}>
                                                        {formatCurrency(Math.round(precoSugerido1x * 100))}
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
            )}
        </div>
    );
}
