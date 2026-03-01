"use client";

import { useState, useEffect } from "react";
import {
    Calculator,
    TrendingUp,
    ChevronRight,
    ArrowLeft,
    DollarSign,
    Percent,
    CreditCard,
    CheckCircle2,
    Info,
    RefreshCw,
    MessageSquare,
    Wallet
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { GatewaySelector } from "@/components/ui/GatewaySelector";
import { type PaymentGateway } from "@/types/configuracoes";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";

const supabase = createClient();

export default function CalculadoraVenda() {
    const { config, defaultGateway, loading: configLoading } = useFinanceConfig();
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);

    // Abas
    const [activeTab, setActiveTab] = useState<"precificacao" | "reverso">("precificacao");

    // Form states (Precificação)
    const [modoCalculo, setModoCalculo] = useState<"custo_brl" | "custo_usd" | "venda_brl">("custo_brl");
    const [valorInput, setValorInput] = useState<string>("0,00");
    const [categoriaId, setCategoriaId] = useState<string>("");

    // Form states (Reverso)
    const [reversoValorInput, setReversoValorInput] = useState<string>("0,00");

    // Margem e Impostos
    const [tipoMargem, setTipoMargem] = useState<"pct" | "fixo">("pct");
    const [margemValor, setMargemValor] = useState<number>(0); // Pode ser % ou R$ dependendo de tipoMargem
    const [impostoManual, setImpostoManual] = useState<number>(0);
    const [garantiaDias, setGarantiaDias] = useState<number>(90);

    // Cotação
    const [cotacaoManual, setCotacaoManual] = useState<number>(0);

    // Sincronizar gateway inicial e config
    useEffect(() => {
        if (defaultGateway && !selectedGateway) {
            setSelectedGateway(defaultGateway);
        }

        if (config) {
            // Atualizar cotação se não foi editada manualmente
            if (cotacaoManual === 0) {
                setCotacaoManual(config.cotacao_dolar_paraguai);
            }

            const selectedCategory = config.categorias.find(c => c.nome === categoriaId);
            if (selectedCategory) {
                setImpostoManual(selectedCategory.nf_obrigatoria ? config.taxa_nota_fiscal_pct : 0);
                setGarantiaDias(selectedCategory.garantia_padrao_dias);
                if (modoCalculo !== "venda_brl") {
                    setTipoMargem(selectedCategory.tipo_margem === "fixo" ? "fixo" : "pct");
                    setMargemValor(selectedCategory.margem_padrao);
                }
            } else if (impostoManual === 0 && !categoriaId) {
                setImpostoManual(config.taxa_nota_fiscal_pct);
            }
        }
    }, [defaultGateway, config, categoriaId, modoCalculo, tipoMargem, cotacaoManual]);

    const handleLimpar = () => {
        setValorInput("0,00");
        setCategoriaId("");
        setMargemValor(0);
        setTipoMargem("pct");
        if (config) setCotacaoManual(config.cotacao_dolar_paraguai);
        // Não reseta imposto manual pois depende da config global/categoria
    };

    const valorNum = parseFloat(valorInput.replace(/\./g, "").replace(",", ".")) || 0;

    // Lógica de Cálculo Centralizada
    let custoBaseBrl = 0;
    let precoBaseVenda = 0;

    const taxaImposto = (impostoManual || 0) / 100;
    const taxaMargemPct = tipoMargem === "pct" ? (margemValor || 0) / 100 : 0;
    const margemFixaReais = tipoMargem === "fixo" ? margemValor : 0;

    // Definir custo base em BRL
    if (modoCalculo === "custo_brl") {
        custoBaseBrl = valorNum;
    } else if (modoCalculo === "custo_usd") {
        custoBaseBrl = valorNum * (cotacaoManual || 5.32);
    } else if (modoCalculo === "venda_brl") {
        precoBaseVenda = valorNum;
        // Engenharia reversa complexa se margem for fixa, mas simplificando:
        // Preco = (Custo + MargemFixa) / (1 - Imposto) -> Preco(1-Imp) - MargemFixa = Custo
        if (tipoMargem === "fixo") {
            custoBaseBrl = precoBaseVenda * (1 - taxaImposto) - margemFixaReais;
        } else {
            // Preco = Custo / (1 - Margem% - Imposto) -> Preco * (1 - Margem% - Imposto) = Custo
            custoBaseBrl = precoBaseVenda * (1 - taxaMargemPct - taxaImposto);
        }
    }

    // Calcular Preço Base de Venda (se não for modo venda_brl)
    if (modoCalculo !== "venda_brl") {
        if (tipoMargem === "pct") {
            const divisor = 1 - taxaMargemPct - taxaImposto;
            precoBaseVenda = divisor > 0 ? custoBaseBrl / divisor : custoBaseBrl * (1 + taxaMargemPct + taxaImposto);
        } else {
            // Margem Fixa
            const divisor = 1 - taxaImposto;
            // Preço Base = (Custo + MargemFixa) / (1 - Imposto)
            precoBaseVenda = divisor > 0 ? (custoBaseBrl + margemFixaReais) / divisor : custoBaseBrl + margemFixaReais + (custoBaseBrl * taxaImposto);
        }
    }

    const lucroLiquidoReal = precoBaseVenda - custoBaseBrl - (precoBaseVenda * taxaImposto);

    const handleCopyWhatsapp = () => {
        if (!selectedGateway) return;

        const taxaPix = (selectedGateway?.taxa_pix_pct || 0) / 100;
        const taxaDebito = (selectedGateway?.taxa_debito_pct || 0) / 100;

        const precoPix = (1 - taxaPix) > 0 ? precoBaseVenda / (1 - taxaPix) : precoBaseVenda * (1 + taxaPix);
        const precoDebito = (1 - taxaDebito) > 0 ? precoBaseVenda / (1 - taxaDebito) : precoBaseVenda * (1 + taxaDebito);

        let text = `*Orçamento Smart*\n\n`;
        text += `Categoria: *${categoriaId || "Geral"}*\n`;
        text += `Garantia: *${garantiaDias} dias*\n\n`;

        text += `*💵 Dinheiro:* ${formatCurrency(precoBaseVenda)}\n`;
        text += `*⚡ Pix:* ${formatCurrency(precoPix)}\n`;
        text += `*💳 Débito:* ${formatCurrency(precoDebito)}\n\n`;

        text += `*🗓️ Parcelamento no Cartão:*\n`;

        const parcelasChave = [1, 3, 6, 10, 12, 18, 21];

        selectedGateway.taxas_credito?.forEach(taxa => {
            if (parcelasChave.includes(taxa.parcela)) {
                const taxaCartao = taxa.taxa / 100;
                let precoParcelado = 0;
                const divisorCartao = 1 - taxaCartao;
                precoParcelado = divisorCartao > 0 ? precoBaseVenda / divisorCartao : precoBaseVenda * (1 + taxaCartao);
                const valorParcela = precoParcelado / taxa.parcela;
                text += `${taxa.parcela}x de ${formatCurrency(valorParcela)}\n`;
            }
        });

        text += `\n_Valores sujeitos a alteração._`;

        navigator.clipboard.writeText(text);
        alert("Orçamento copiado para a área de transferência!");
    };

    return (
        <div className="space-y-6 page-enter pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/ferramentas" className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Calculadora de Venda</h1>
                        <p className="text-slate-500 text-sm">Precificação estratégica multi-moeda e cálculo reverso</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleLimpar} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                        <RefreshCw size={14} /> LIMPAR
                    </button>
                    <button onClick={handleCopyWhatsapp} className="px-4 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 rounded-lg transition-all flex items-center gap-2">
                        <MessageSquare size={14} /> COPIAR WHATSAPP
                    </button>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 border-b border-slate-200 pb-px mb-6">
                <button
                    onClick={() => setActiveTab("precificacao")}
                    className={cn(
                        "px-6 py-3 text-sm font-black tracking-tight border-b-2 transition-all",
                        activeTab === "precificacao"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                    )}
                >
                    Precificação Padrão
                </button>
                <button
                    onClick={() => setActiveTab("reverso")}
                    className={cn(
                        "px-6 py-3 text-sm font-black tracking-tight border-b-2 transition-all",
                        activeTab === "reverso"
                            ? "border-purple-500 text-purple-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                    )}
                >
                    Cálculo Reverso (Líquido)
                </button>
            </div>

            {activeTab === "precificacao" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* Coluna Esquerda: Inputs (4 colunas) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Seletor de Modo */}
                        <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                            <button
                                onClick={() => setModoCalculo("custo_brl")}
                                className={cn(
                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-wide rounded-lg transition-all",
                                    modoCalculo === "custo_brl" ? "bg-white text-brand-600 shadow-sm scale-100" : "text-slate-400 hover:text-slate-600 scale-95"
                                )}
                            >
                                Custo R$
                            </button>
                            <button
                                onClick={() => setModoCalculo("custo_usd")}
                                className={cn(
                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-wide rounded-lg transition-all",
                                    modoCalculo === "custo_usd" ? "bg-white text-emerald-600 shadow-sm scale-100" : "text-slate-400 hover:text-slate-600 scale-95"
                                )}
                            >
                                Custo U$
                            </button>
                            <button
                                onClick={() => setModoCalculo("venda_brl")}
                                className={cn(
                                    "flex-1 py-3 text-[10px] font-black uppercase tracking-wide rounded-lg transition-all",
                                    modoCalculo === "venda_brl" ? "bg-white text-blue-600 shadow-sm scale-100" : "text-slate-400 hover:text-slate-600 scale-95"
                                )}
                            >
                                Venda Final
                            </button>
                        </div>

                        {/* Seletor de Categoria Visual */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Categoria do Produto</label>
                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                                {config?.categorias.map(cat => (
                                    <button
                                        key={cat.nome}
                                        onClick={() => {
                                            setCategoriaId(cat.nome);
                                            if (modoCalculo !== "venda_brl") {
                                                setTipoMargem(cat.tipo_margem === "fixo" ? "fixo" : "pct");
                                                setMargemValor(cat.margem_padrao);
                                            }
                                        }}
                                        className={cn(
                                            "h-14 p-2 rounded-xl border flex items-center gap-3 transition-all text-left relative overflow-hidden group",
                                            categoriaId === cat.nome
                                                ? "border-brand-500 bg-brand-50 shadow-md ring-1 ring-brand-200"
                                                : "border-slate-100 bg-white hover:border-brand-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-2 h-full absolute left-0 top-0 transition-colors",
                                            categoriaId === cat.nome ? "bg-brand-500" : "bg-slate-200 group-hover:bg-brand-200"
                                        )} />
                                        <div className="pl-2">
                                            <p className="text-[10px] font-black uppercase text-slate-700 leading-tight">{cat.nome}</p>
                                            {modoCalculo !== "venda_brl" && (
                                                <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                                                    {cat.tipo_margem === "fixo" ? `R$ ${cat.margem_padrao} fixo` : `${cat.margem_padrao}% margem`}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Principal (AGORA ACIMA) */}
                        <GlassCard title={
                            modoCalculo === "custo_brl" ? "Preço de Custo (R$)" :
                                modoCalculo === "custo_usd" ? "Preço de Custo (U$)" :
                                    "Preço de Venda Final (R$)"
                        } icon={DollarSign} className="border-2 border-slate-100 shadow-md">
                            <div className="space-y-3">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-lg">
                                        {modoCalculo === "custo_usd" ? "$" : "R$"}
                                    </span>
                                    <input
                                        className={cn(
                                            "input-glass h-14 pl-12 text-3xl font-black focus:ring-4 transition-all w-full",
                                            modoCalculo === "custo_usd" ? "text-emerald-600 focus:ring-emerald-100" :
                                                modoCalculo === "venda_brl" ? "text-blue-600 focus:ring-blue-100" :
                                                    "text-brand-600 focus:ring-brand-100"
                                        )}
                                        value={valorInput}
                                        onChange={e => setValorInput(e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>

                                {/* Cotação Editável no Modo USD */}
                                {modoCalculo === "custo_usd" && (
                                    <div className="bg-emerald-50 rounded-lg p-2 flex items-center justify-between border border-emerald-100">
                                        <label className="text-[9px] font-bold text-emerald-700 uppercase">Cotação Dólar</label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-emerald-600">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-16 h-6 bg-white rounded border border-emerald-200 text-right text-xs font-bold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                value={cotacaoManual}
                                                onChange={e => setCotacaoManual(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {modoCalculo === "custo_usd" && (
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold">Custo Convertido: <span className="text-slate-600">R$ {formatCurrency(Math.round(valorNum * (cotacaoManual || 5.32) * 100), { symbol: '' })}</span></p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {/* Margens e Garantia (AGORA ABAIXO DO CUSTO) */}
                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className={cn(modoCalculo === "venda_brl" && "opacity-50 pointer-events-none")}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem</label>
                                    <button
                                        onClick={() => setTipoMargem(t => t === "pct" ? "fixo" : "pct")}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors"
                                    >
                                        {tipoMargem === "pct" ? "%" : "R$"}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="input-glass h-10 font-bold pr-8"
                                        value={margemValor}
                                        onChange={e => setMargemValor(Number(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                                        {tipoMargem === "pct" ? "%" : "R$"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Garantia (Dias)</label>
                                <input
                                    type="number"
                                    className="input-glass h-10 font-bold text-center"
                                    value={garantiaDias}
                                    onChange={e => setGarantiaDias(Number(e.target.value))}
                                />
                            </div>
                            <div className="col-span-2 pt-2 border-t border-slate-50">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Imposto / NF</label>
                                    <span className="text-[9px] font-bold text-slate-300">Sobre Venda</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="input-glass h-10 font-bold text-slate-500 pr-8"
                                        value={impostoManual}
                                        onChange={e => setImpostoManual(Number(e.target.value))}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        {config?.gateways && (
                            <div className="pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Maquininha / Gateway</label>
                                <GatewaySelector
                                    gateways={config.gateways}
                                    selectedId={selectedGateway?.id || null}
                                    onSelect={setSelectedGateway}
                                />
                            </div>
                        )}
                    </div>

                    {/* Coluna Direita: Resultados (8 colunas) */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Card de Destaque */}
                        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-500 to-purple-600 rounded-full blur-[80px] -mr-20 -mt-20 opacity-30 group-hover:opacity-40 transition-opacity" />

                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div>
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">Preço Sugerido (À Vista)</p>
                                    <p className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                                        <span className="text-2xl align-top opacity-50 mr-1">R$</span>
                                        {formatCurrency(Math.round(precoBaseVenda * 100), { symbol: '' })}
                                    </p>
                                    {modoCalculo !== "venda_brl" && (
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-white/80 border border-white/5">
                                                Lucro: {formatCurrency(Math.round(lucroLiquidoReal * 100))}
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-white/80 border border-white/5">
                                                Margem: {precoBaseVenda > 0 ? ((lucroLiquidoReal / precoBaseVenda) * 100).toFixed(1) : 0}%
                                            </div>
                                            {tipoMargem === "fixo" && (
                                                <div className="px-3 py-1 rounded-full bg-brand-500/20 text-[10px] font-bold text-brand-300 border border-brand-500/30">
                                                    Meta Fixa: {formatCurrency(Math.round(margemFixaReais * 100))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-end h-full gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-emerald-400 text-[10px] font-black uppercase">Pix</p>
                                            </div>
                                            <p className="text-xl font-bold text-white">
                                                {formatCurrency(Math.round(((1 - (selectedGateway?.taxa_pix_pct || 0) / 100) > 0 ? precoBaseVenda / (1 - (selectedGateway?.taxa_pix_pct || 0) / 100) : precoBaseVenda) * 100))}
                                            </p>
                                            <p className="text-[9px] text-white/40 mt-1">Taxa: {selectedGateway?.taxa_pix_pct || 0}%</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-blue-400 text-[10px] font-black uppercase">Débito</p>
                                            </div>
                                            <p className="text-xl font-bold text-white">
                                                {formatCurrency(Math.round(((1 - (selectedGateway?.taxa_debito_pct || 0) / 100) > 0 ? precoBaseVenda / (1 - (selectedGateway?.taxa_debito_pct || 0) / 100) : precoBaseVenda) * 100))}
                                            </p>
                                            <p className="text-[9px] text-white/40 mt-1">Taxa: {selectedGateway?.taxa_debito_pct || 0}%</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 px-4 py-2 rounded-xl flex justify-between items-center">
                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Dinheiro (Espécie)</p>
                                        <p className="text-sm font-bold text-white">{formatCurrency(Math.round(precoBaseVenda * 100))}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabela de Parcelamento */}
                        <GlassCard title="Tabela de Venda Parcelada" icon={CreditCard} className="h-full">
                            <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl mb-6 flex items-start gap-3">
                                <Info size={18} className="text-sky-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-sky-700 leading-relaxed font-medium">
                                    Os valores abaixo já incluem o <strong>acréscimo da taxa da maquininha</strong>.
                                    Ao cobrar o "Preço Final" do cliente, você receberá exatamente <strong>{formatCurrency(precoBaseVenda)}</strong> na sua conta.
                                </p>
                            </div>

                            {configLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                    <RefreshCw className="animate-spin" size={32} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {(selectedGateway?.taxas_credito || []).map((taxa) => {
                                        const taxaCartao = taxa.taxa / 100;
                                        const divisorFinal = 1 - taxaCartao;
                                        const precoFinal = divisorFinal > 0 ? precoBaseVenda / divisorFinal : precoBaseVenda * (1 + taxaCartao);
                                        const valorParcela = precoFinal / taxa.parcela;

                                        return (
                                            <div key={taxa.parcela} className="bg-white p-3 rounded-xl border border-slate-100 hover:border-brand-300 hover:shadow-lg transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 bg-slate-50 px-2 py-1 rounded-bl-xl border-b border-l border-slate-100">
                                                    <span className="text-[9px] font-bold text-slate-400">{taxa.taxa}%</span>
                                                </div>

                                                <div className="mb-2">
                                                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black group-hover:bg-brand-600 transition-colors">
                                                        {taxa.parcela}x
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-bold text-brand-600">{formatCurrency(Math.round(valorParcela * 100))}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total: {formatCurrency(Math.round(precoFinal * 100))}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            )}

            {activeTab === "reverso" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="lg:col-span-4 space-y-6">
                        <GlassCard title="Valor Cobrado (R$)" icon={DollarSign} className="border-2 border-purple-100 shadow-md">
                            <div className="space-y-3">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 font-bold text-lg">R$</span>
                                    <input
                                        className="input-glass h-14 pl-12 text-3xl font-black text-purple-600 focus:ring-4 focus:ring-purple-100 transition-all w-full"
                                        value={reversoValorInput}
                                        onChange={e => setReversoValorInput(e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                                    Informe o valor total que será passado na maquininha. O sistema calculará quanto vai cair líquido na sua conta.
                                </p>
                            </div>
                        </GlassCard>

                        {config?.gateways && (
                            <div className="pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Maquininha / Gateway</label>
                                <GatewaySelector
                                    gateways={config.gateways}
                                    selectedId={selectedGateway?.id || null}
                                    onSelect={setSelectedGateway}
                                />
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <GlassCard title="Valor Líquido a Receber" icon={Wallet} className="h-full border-purple-100 shadow-purple-glow">
                            {configLoading || !selectedGateway ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                    <RefreshCw className="animate-spin" size={32} />
                                </div>
                            ) : (() => {
                                const valorPassado = parseFloat(reversoValorInput.replace(/\./g, "").replace(",", ".")) || 0;

                                const taxaPixPct = selectedGateway.taxa_pix_pct || 0;
                                const liqPix = valorPassado - (valorPassado * (taxaPixPct / 100));

                                const taxaDebitoPct = selectedGateway.taxa_debito_pct || 0;
                                const liqDebito = valorPassado - (valorPassado * (taxaDebitoPct / 100));

                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Se passar no PIX</p>
                                                    <span className="text-[9px] font-bold text-slate-400">-{taxaPixPct}%</span>
                                                </div>
                                                <p className="text-2xl font-black text-emerald-600">
                                                    <span className="text-sm align-top mr-1">R$</span>
                                                    {formatCurrency(Math.round(liqPix * 100), { symbol: '' })}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Se passar no Débito</p>
                                                    <span className="text-[9px] font-bold text-slate-400">-{taxaDebitoPct}%</span>
                                                </div>
                                                <p className="text-2xl font-black text-blue-600">
                                                    <span className="text-sm align-top mr-1">R$</span>
                                                    {formatCurrency(Math.round(liqDebito * 100), { symbol: '' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {(selectedGateway.taxas_credito || []).map((taxa) => {
                                                const tx = taxa.taxa / 100;
                                                const recebidoLiquido = valorPassado - (valorPassado * tx);

                                                return (
                                                    <div key={taxa.parcela} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-300 transition-all relative">
                                                        <div className="absolute top-0 right-0 bg-slate-50 px-2 py-1 rounded-bl-xl border-b border-l border-slate-100">
                                                            <span className="text-[9px] font-bold text-slate-400">-{taxa.taxa}%</span>
                                                        </div>

                                                        <div className="mb-2">
                                                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black">
                                                                {taxa.parcela}x Crédito
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Líquido na Conta</span>
                                                            <span className="text-lg font-black text-slate-800">{formatCurrency(Math.round(recebidoLiquido * 100))}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
}
