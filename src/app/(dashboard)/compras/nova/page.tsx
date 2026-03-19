"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Trash2, ChevronDown, ChevronUp,
  ArrowRight, ArrowLeft, Package, Loader2,
  AlertCircle, Check, Info, Code, Keyboard,
  MapPin, CheckCircle2, DollarSign, TrendingUp,
  Calculator, Tag, FileText, Truck, Save,
  CreditCard, Calendar, Zap, LayoutGrid
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { FornecedorCombobox } from "@/components/fornecedores/FornecedorCombobox";
import { ProdutoCombobox } from "@/components/compras/ProdutoCombobox";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency, toCentavos } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { criarCompra } from "@/app/actions/compras";

const supabase = createClient();

// Tipos
type InputMethod = "manual" | "xml";
type ItemType = "peca" | "celular" | "acessorio" | "outro";

interface CompraItem {
  id: string; // UUID local para controle de lista
  nome: string;
  ncm: string;
  quantidade: number;
  custoUnitario: number;
  precoVarejo: number;
  precoAtacado: number; // Em R$ ou US$ conforme o contexto (agora US$ no input conforme pedido)
  itemType: ItemType;
  categoria: string;
  catalogItemId: string | null;
  estoqueAtual: number;
  isNew: boolean; // true se será criado no catálogo
}

interface FornecedorData {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  prazo_medio_pagamento?: number;
  historico?: { totalCompras: number; ultimaCompra: string | null };
}

// Helpers
const newItem = (): CompraItem => ({
  id: crypto.randomUUID(),
  nome: "",
  ncm: "",
  quantidade: 1,
  custoUnitario: 0,
  precoVarejo: 0,
  precoAtacado: 0,
  itemType: "peca",
  categoria: "",
  catalogItemId: null,
  estoqueAtual: 0,
  isNew: false,
});

const calcMargem = (venda: number, custo: number): string => {
  if (custo <= 0 || venda <= 0) return "—";
  return `${Math.round(((venda - custo) / custo) * 100)}%`;
};

const margemColor = (venda: number, custo: number): string => {
  if (custo <= 0 || venda <= 0) return "text-slate-400";
  const m = (venda - custo) / custo;
  if (m >= 0.8) return "text-emerald-600";
  if (m >= 0.3) return "text-amber-600";
  return "text-red-500";
};

export default function ComprasNovaPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do cabeçalho
  const [headerOpen, setHeaderOpen] = useState(true);
  const [inputMethod, setInputMethod] = useState<InputMethod>("manual");
  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [fornecedorData, setFornecedorData] = useState<FornecedorData | null>(null);
  const [dataNota, setDataNota] = useState(new Date().toISOString().split("T")[0]);
  const [numeroNota, setNumeroNota] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [unidades, setUnidades] = useState<any[]>([]);

  // Estado dos itens
  const [itens, setItens] = useState<CompraItem[]>([newItem()]);

  // Estado do pagamento (mostrado numa tela separada simples)
  const [showPagamento, setShowPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("a_combinar");
  const [vencimento, setVencimento] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  // Estado da cotação do dólar (interno, removido do JSX do cabeçalho)
  const [exchangeRate, setExchangeRate] = useState(5.87);

  // Loading
  const [loading, setLoading] = useState(false);
  const [xmlLoading, setXmlLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Carregar dados iniciais
  useEffect(() => {
    if (!profile?.empresa_id) return;
    const load = async () => {
      const { data: uData } = await supabase
        .from("units")
        .select("id, name")
        .eq("empresa_id", profile.empresa_id)
        .eq("is_active", true);
      if (uData) setUnidades(uData);
      if (profile?.unit_id) setUnidadeId(profile.unit_id);

      // Buscar cotação do dólar
      try {
        const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        const data = await res.json();
        if (data.USDBRL?.bid) setExchangeRate(parseFloat(data.USDBRL.bid));
      } catch {
        // fallback: manter 5.87
      }
    };
    load();
  }, [profile?.empresa_id]);

  // Carregar histórico do fornecedor ao selecionar
  const handleFornecedorSelect = async (f: any) => {
    setFornecedorId(f?.id || "");
    setFornecedorNome(f?.nome_fantasia || f?.razao_social || "");
    if (f?.id && profile?.empresa_id) {
      const { data: comprasRaw } = await supabase
        .from("compras")
        .select("valor_total, data_compra")
        .eq("empresa_id", profile.empresa_id)
        .eq("fornecedor_id", f.id)
        .order("data_compra", { ascending: false })
        .limit(10);
      
      const compras = comprasRaw as any[] | null;

      const totalCompras = compras?.reduce((acc: number, c: any) => acc + (c.valor_total || 0), 0) || 0;
      const ultimaCompra = compras?.[0]?.data_compra || null;

      setFornecedorData({
        ...f,
        historico: { totalCompras, ultimaCompra }
      });
    }
    setHeaderOpen(false); // Colapsar header após selecionar fornecedor
  };

  // Manipulação de itens
  const addItem = () => setItens(prev => [...prev, newItem()]);

  const removeItem = (id: string) =>
    setItens(prev => prev.filter(it => it.id !== id));

  const updateItem = (id: string, updates: Partial<CompraItem>) =>
    setItens(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));

  // Ações em massa
  const applyGlobalMargem = (percentual: number) => {
    setItens(prev => prev.map(it => ({
      ...it,
      precoVarejo: it.custoUnitario > 0
        ? Math.round(it.custoUnitario * (1 + percentual / 100))
        : it.precoVarejo
    })));
    toast.success(`Margem de ${percentual}% aplicada em todos os itens`);
  };

  const applyGlobalType = (type: ItemType) => {
    setItens(prev => prev.map(it => ({ ...it, itemType: type })));
    toast.success(`Tipo "${type}" aplicado em todos os itens`);
  };

  const calcAtacadoSuggestion = () => {
    setItens(prev => prev.map(it => ({
      ...it,
      precoAtacado: it.custoUnitario > 0
        ? Math.round((it.custoUnitario * 1.15) / 100 / exchangeRate * 100)
        : it.precoAtacado
    })));
    toast.success(`Preço atacado sugerido (US$) calculado em todos os itens`);
  };

  // Importar XML
  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXmlLoading(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");

      const emitentNome = xml.querySelector("emit > xNome")?.textContent;
      const cnpjEmitente = xml.querySelector("emit > CNPJ")?.textContent;
      const nNF = xml.querySelector("nNF")?.textContent;
      const dEmi = xml.querySelector("dhEmi")?.textContent?.split("T")[0];

      // Tentar vincular fornecedor pelo CNPJ
      if (cnpjEmitente && profile?.empresa_id) {
        const { data: forn } = await supabase
          .from("fornecedores")
          .select("id, razao_social, nome_fantasia, prazo_medio_pagamento")
          .eq("empresa_id", profile.empresa_id)
          .eq("cnpj", cnpjEmitente.replace(/\D/g, ""))
          .maybeSingle();

        if (forn) {
          const f = forn as any;
          await handleFornecedorSelect(f);
          toast.success(`Fornecedor "${f.razao_social}" identificado!`);
        } else if (emitentNome) {
          setFornecedorNome(emitentNome);
        }
      } else if (emitentNome) {
        setFornecedorNome(emitentNome);
      }

      if (nNF) setNumeroNota(nNF);
      if (dEmi) setDataNota(dEmi);

      const detTags = Array.from(xml.querySelectorAll("det"));
      const extractedItems: CompraItem[] = detTags.map(det => ({
        id: crypto.randomUUID(),
        nome: det.querySelector("prod > xProd")?.textContent || "Produto XML",
        ncm: det.querySelector("prod > NCM")?.textContent || "",
        quantidade: parseInt(det.querySelector("prod > qCom")?.textContent || "1"),
        custoUnitario: toCentavos(parseFloat(det.querySelector("prod > vUnCom")?.textContent || "0")),
        precoVarejo: 0,
        precoAtacado: 0,
        itemType: "peca" as ItemType,
        categoria: "",
        catalogItemId: null,
        estoqueAtual: 0,
        isNew: true,
      }));

      setItens(extractedItems);
      setHeaderOpen(false);
      toast.success(`XML processado: ${extractedItems.length} itens encontrados`);
    } catch {
      toast.error("Erro ao ler XML. Verifique o formato do arquivo.");
    } finally {
      setXmlLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cálculos derivados
  const valorTotal = itens.reduce((acc, it) => acc + it.custoUnitario * it.quantidade, 0);
  const receitaProjetada = itens.reduce((acc, it) => acc + it.precoVarejo * it.quantidade, 0);
  const lucroProjetado = receitaProjetada - valorTotal;
  const margemMedia = valorTotal > 0 ? Math.round((lucroProjetado / valorTotal) * 100) : 0;
  const itensSemPreco = itens.filter(it => it.precoVarejo === 0).length;
  const itensNovos = itens.filter(it => !it.catalogItemId).length;

  const headerComplete = (fornecedorId || fornecedorNome) && dataNota && unidadeId;

  // Confirmar compra
  const handleConfirmar = async () => {
    if (!profile?.empresa_id) return;
    if (!unidadeId) {
      toast.error("Selecione a unidade de destino.");
      setHeaderOpen(true);
      return;
    }
    if (itens.length === 0 || itens.every(it => it.nome.trim() === "")) {
      toast.error("Adicione pelo menos um produto.");
      return;
    }
    setLoading(true);
    try {
      const res = await criarCompra({
        empresaId: profile.empresa_id,
        unidadeId,
        fornecedorId: fornecedorId || undefined,
        fornecedorNome: fornecedorNome || "Fornecedor avulso",
        dataCompra: dataNota,
        dataVencimento: vencimento || undefined,
        formaPagamento,
        parcelas,
        notaFiscalNumero: numeroNota || undefined,
        observacoes: observacoes || undefined,
        origem: inputMethod === "xml" ? "xml_nfe" : "manual",
        itens: itens
          .filter(it => it.nome.trim() !== "")
          .map(it => ({
            nome: it.nome,
            quantidade: it.quantidade,
            custoUnitario: it.custoUnitario,
            precoVarejo: it.precoVarejo,
            precoAtacado: it.precoAtacado,
            wholesalePriceBrl: Math.round(it.precoAtacado * exchangeRate),
            itemType: it.itemType,
            categoria: it.categoria || undefined,
            ncm: it.ncm || undefined,
            catalogItemId: it.catalogItemId || undefined,
          })),
      });
      toast.success(`OC-${String(res.numero).padStart(3, "0")} registrada com sucesso!`);
      router.push(`/compras/${res.compraId}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar compra.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // TELA DE PAGAMENTO (modal/overlay simples)
  // ============================================================
  if (showPagamento) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 page-enter pb-24">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowPagamento(false)} className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800">Condições de Pagamento</h2>
            <p className="text-slate-400 text-xs uppercase tracking-widest mt-0.5">Passo final antes de confirmar</p>
          </div>
        </div>

        {/* Resumo compacto */}
        <GlassCard className="flex items-center justify-between p-5">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total da Compra</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(valorTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Lucro Projetado</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(lucroProjetado)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Margem Média</p>
            <p className="text-xl font-black text-emerald-600">{margemMedia}%</p>
          </div>
        </GlassCard>

        <GlassCard className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Forma de Pagamento</label>
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} className="select-glass bg-white h-12">
                <option value="pix">PIX</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="transferencia">Transferência Bancária</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="prazo">A prazo (conta corrente)</option>
                <option value="a_combinar">A combinar</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento (1ª Parcela)</label>
                <input type="date" value={vencimento} min={today} onChange={e => setVencimento(e.target.value)} className="input-glass h-12" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Parcelas</label>
                <select value={parcelas} onChange={e => setParcelas(parseInt(e.target.value))} className="select-glass bg-white h-12">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x de {formatCurrency(Math.round(valorTotal / n))}</option>
                  ))}
                </select>
              </div>
            </div>

            {vencimento ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-700 flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>
                  Será gerado em <strong>Contas a Pagar</strong>:{" "}
                  {parcelas === 1
                    ? `1 parcela de ${formatCurrency(valorTotal)} com vencimento em ${formatDate(vencimento)}.`
                    : `${parcelas}x de ${formatCurrency(Math.round(valorTotal / parcelas))} — primeira em ${formatDate(vencimento)}.`
                  }
                </span>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-400 flex items-start gap-3">
                <Info size={16} className="mt-0.5 shrink-0" />
                Sem data de vencimento. Nenhum título será gerado no financeiro.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Condições especiais, referência de entrega, etc."
                rows={3}
                className="input-glass resize-none"
              />
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <button onClick={() => setShowPagamento(false)} className="btn-ghost h-14 flex-1">
            ← Voltar para Produtos
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="btn-primary h-14 flex-1 text-base shadow-brand-glow"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "REGISTRAR COMPRA AGORA"}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA PRINCIPAL (página única com sidebar)
  // ============================================================
  return (
    <div className="page-enter pb-32">
      {/* Header da página */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Plus className="text-brand-500" /> Nova Ordem de Compra
          </h1>
          <p className="text-slate-500 text-sm mt-1">Entrada de mercadorias e atualização de estoque</p>
        </div>
        {/* Indicador de progresso inline */}
        <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <span className={cn("px-3 py-1.5 rounded-lg", headerComplete ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700")}>
            {headerComplete ? "✓" : "1"} Cabeçalho
          </span>
          <span className="text-slate-300">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500">2 Pagamento</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        {/* COLUNA PRINCIPAL */}
        <div className="space-y-4">

          {/* SEÇÃO 1: CABEÇALHO */}
          <GlassCard className={cn("transition-all", !headerComplete && "border-brand-200")}>
            <button
              onClick={() => setHeaderOpen(!headerOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black",
                  headerComplete ? "bg-emerald-100 text-emerald-600" : "bg-brand-100 text-brand-600")}>
                  {headerComplete ? "✓" : "1"}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm">
                    {headerComplete ? (fornecedorNome || "Fornecedor avulso") : "Dados da Nota de Compra"}
                  </p>
                  {headerComplete && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      NF {numeroNota || "s/n"} · {formatDate(dataNota)} ·{" "}
                      {unidades.find(u => u.id === unidadeId)?.name || ""}
                    </p>
                  )}
                </div>
              </div>
              {headerComplete
                ? (headerOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />)
                : <span className="text-[10px] text-brand-500 font-black">PREENCHER →</span>
              }
            </button>

            {(headerOpen || !headerComplete) && (
              <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Método de entrada */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setInputMethod("manual")}
                    className={cn("flex-1 py-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest",
                      inputMethod === "manual" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-100 text-slate-400 hover:border-slate-200"
                    )}>
                    <Keyboard size={16} /> Manual
                  </button>
                  <button
                    onClick={() => setInputMethod("xml")}
                    className={cn("flex-1 py-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest",
                      inputMethod === "xml" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-100 text-slate-400 hover:border-slate-200"
                    )}>
                    <Code size={16} /> XML NF-e
                  </button>
                  <input type="file" accept=".xml" ref={fileInputRef} className="hidden" onChange={handleXmlUpload} />
                  {inputMethod === "xml" && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={xmlLoading}
                      className="flex-1 py-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 text-brand-600 text-xs font-black uppercase tracking-widest hover:bg-brand-100 transition-all flex items-center justify-center gap-2"
                    >
                      {xmlLoading ? <Loader2 size={16} className="animate-spin" /> : <><FileText size={16} /> Selecionar XML</>}
                    </button>
                  )}
                </div>

                {/* Campos do cabeçalho */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fornecedor *</label>
                    <FornecedorCombobox
                      empresaId={profile?.empresa_id || ""}
                      value={fornecedorId}
                      onSelect={(f: any) => handleFornecedorSelect(f)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data da Nota *</label>
                    <input
                      type="date"
                      value={dataNota}
                      max={today}
                      onChange={e => setDataNota(e.target.value)}
                      className="input-glass h-11"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nº da Nota</label>
                    <input value={numeroNota} onChange={e => setNumeroNota(e.target.value)} placeholder="NF-001" className="input-glass h-11" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1">
                      <MapPin size={10} /> Unidade de Destino *
                    </label>
                    <select value={unidadeId} onChange={e => setUnidadeId(e.target.value)} className="select-glass bg-white h-11">
                      <option value="">Selecionar unidade...</option>
                      {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                {headerComplete && (
                  <button onClick={() => setHeaderOpen(false)} className="w-full py-2 text-[10px] font-black uppercase text-emerald-600 tracking-widest hover:bg-emerald-50 rounded-xl transition-all">
                    ✓ Confirmar e Recolher
                  </button>
                )}
              </div>
            )}
          </GlassCard>

          {/* SEÇÃO 2: LISTA DE PRODUTOS COMPACTA */}
          <GlassCard className="p-0 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-black">2</div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Produtos / Itens ({itens.filter(it => it.nome).length})
                </span>
              </div>
              <button onClick={addItem} className="btn-secondary h-8 px-4 text-[10px] uppercase font-black tracking-widest">
                + Adicionar item
              </button>
            </div>

            {/* Cabeçalho informativo fixo */}
            <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 grid grid-cols-5 gap-3">
              <div className="text-[9px] text-slate-400 font-bold uppercase col-span-1">NCM</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">Custo unit.</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">Venda R$</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">Atacado US$</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase">Total / Margem</div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
              {itens.map((it) => (
                <div key={it.id} className="border-b border-slate-50 py-3 px-4 hover:bg-slate-50/30 transition-all group">
                  
                  {/* LINHA 1: produto + tipo + qtd + delete */}
                  <div className="flex items-center gap-3 mb-2">
                    {/* Produto — ocupa todo espaço disponível */}
                    <div className="flex-1 min-w-0">
                      <ProdutoCombobox
                        value={it.nome}
                        empresaId={profile?.empresa_id || ""}
                        itemType={it.itemType}
                        onSelect={(produto, nome) => {
                          updateItem(it.id, {
                            nome,
                            catalogItemId: produto?.id || null,
                            itemType: produto?.item_type || it.itemType,
                            custoUnitario: produto?.cost_price || it.custoUnitario,
                            precoVarejo: produto?.sale_price || it.precoVarejo,
                            precoAtacado: (produto as any)?.sale_price_usd || (produto as any)?.wholesale_price_brl ? Math.round(((produto as any)?.wholesale_price_brl / 100) / exchangeRate * 100) : it.precoAtacado,
                            estoqueAtual: produto?.stock_qty || 0,
                            ncm: produto?.ncm || it.ncm,
                            isNew: !produto?.id,
                          });
                        }}
                      />
                      {it.nome && (
                        <div className="mt-0.5">
                          {it.catalogItemId ? (
                            <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                              <Check size={9} /> Vinculado · Estoque atual: {it.estoqueAtual}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1">
                              <AlertCircle size={9} /> Novo produto — será criado no catálogo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Tipo — dropdown compacto */}
                    <select
                      value={it.itemType}
                      onChange={e => updateItem(it.id, { itemType: e.target.value as ItemType })}
                      className="w-28 h-8 text-xs rounded-lg border border-slate-100 bg-slate-50 px-2 outline-none focus:border-brand-500 transition-all"
                    >
                      <option value="peca">Peça</option>
                      <option value="celular">Celular</option>
                      <option value="acessorio">Acessório</option>
                      <option value="outro">Outro</option>
                    </select>
                    {/* Quantidade */}
                    <input
                      type="number"
                      min={1}
                      value={it.quantidade}
                      onChange={e => updateItem(it.id, { quantidade: parseInt(e.target.value) || 1 })}
                      className="w-14 h-8 rounded-lg border border-slate-100 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                    {/* Delete */}
                    <button
                      onClick={() => removeItem(it.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* LINHA 2: campos numéricos compactos */}
                  <div className="grid grid-cols-5 gap-3 pl-0">
                    
                    {/* NCM */}
                    <div>
                      <input
                        value={it.ncm}
                        maxLength={8}
                        onChange={e => updateItem(it.id, { ncm: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                        placeholder="00000000"
                        className="w-full h-8 bg-slate-50 border border-slate-100 rounded-lg px-2 font-mono text-center text-xs outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Custo */}
                    <div>
                      <div className="flex items-center h-8 bg-slate-50 border border-slate-100 rounded-lg px-2 gap-1 focus-within:border-brand-500">
                        <span className="text-slate-300 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={it.custoUnitario / 100}
                          onChange={e => updateItem(it.id, { custoUnitario: toCentavos(parseFloat(e.target.value)) || 0 })}
                          className="flex-1 bg-transparent outline-none text-right text-sm font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Venda varejo */}
                    <div>
                      <div className="flex items-center h-8 bg-slate-50 border border-slate-100 rounded-lg px-2 gap-1 focus-within:border-brand-500">
                        <span className="text-slate-300 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={it.precoVarejo / 100}
                          onChange={e => updateItem(it.id, { precoVarejo: toCentavos(parseFloat(e.target.value)) || 0 })}
                          className="flex-1 bg-transparent outline-none text-right text-sm font-bold text-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Atacado US$ */}
                    <div>
                      <div className="flex items-center h-8 bg-slate-50 border border-slate-100 rounded-lg px-2 gap-1 focus-within:border-brand-500">
                        <span className="text-slate-400 text-[10px] font-bold">US$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={it.precoAtacado / 100}
                          onChange={e => updateItem(it.id, { precoAtacado: toCentavos(parseFloat(e.target.value)) || 0 })}
                          className="flex-1 bg-transparent outline-none text-right text-sm font-bold text-blue-600"
                        />
                      </div>
                    </div>

                    {/* Total + Margem */}
                    <div>
                      <div className="h-8 flex items-center justify-between px-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-sm font-black text-slate-800">
                          {formatCurrency(it.custoUnitario * it.quantidade)}
                        </span>
                        <span className={cn("text-xs font-bold", margemColor(it.precoVarejo, it.custoUnitario))}>
                          {calcMargem(it.precoVarejo, it.custoUnitario)}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            {itens.length > 0 && (
              <div className="p-4 bg-slate-50 flex items-center justify-between text-[10px] uppercase font-black text-slate-400">
                <span>
                  {itens.length} {itens.length === 1 ? "item" : "itens"} · {itensNovos > 0 && `${itensNovos} novo(s) no catálogo`}
                </span>
                <span className="text-slate-900 text-sm">
                  TOTAL: {formatCurrency(valorTotal)}
                </span>
              </div>
            )}
          </GlassCard>

          {/* SEÇÃO 3: AÇÕES EM MASSA */}
          {itens.length > 1 && (
            <GlassCard className="p-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
                Ações em massa
              </p>
              <div className="flex flex-wrap gap-2">
                {[50, 80, 100, 120, 150].map(m => (
                  <button
                    key={m}
                    onClick={() => applyGlobalMargem(m)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100 text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                  >
                    Margem {m}%
                  </button>
                ))}
                <button
                  onClick={calcAtacadoSuggestion}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100 text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                >
                  Sugerir atacado US$ (15% margem)
                </button>
                {(["peca", "celular", "acessorio"] as ItemType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => applyGlobalType(t)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100 text-slate-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                  >
                    Tipo: {t}
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Alertas */}
          {itensSemPreco > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              {itensSemPreco} {itensSemPreco === 1 ? "produto sem" : "produtos sem"} preço de venda definido. Você pode definir depois ou agora.
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {/* Cotação do dólar notice */}
          <GlassCard className="p-4 bg-brand-500 text-white border-0 overflow-hidden relative group">
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Cotação Atual</p>
                <p className="text-xl font-black mt-1">US$ 1 = R$ {exchangeRate.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-2 text-[9px] font-black uppercase tracking-tight bg-white/20 w-fit px-2 py-0.5 rounded-full">
                   <Zap size={10} /> Atualizado agora
                </div>
             </div>
             <DollarSign size={80} className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          </GlassCard>

          {/* Resumo financeiro */}
          <GlassCard className="p-5 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumo financeiro</p>
            <div className="space-y-2">
              {[
                { label: "Custo total", value: formatCurrency(valorTotal), color: "" },
                { label: "Receita projetada", value: formatCurrency(receitaProjetada), color: "text-emerald-600" },
                { label: "Lucro projetado", value: formatCurrency(lucroProjetado), color: lucroProjetado > 0 ? "text-emerald-600" : "text-red-500" },
                { label: "Margem média", value: `${margemMedia}%`, color: margemMedia >= 50 ? "text-emerald-600" : "text-amber-600" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className={cn("text-sm font-bold", row.color || "text-slate-800")}>{row.value}</span>
                </div>
              ))}
              {itensSemPreco > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-red-500">Sem preço de venda</span>
                  <span className="text-sm font-bold text-red-500">{itensSemPreco} item(s)</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Dados do fornecedor */}
          {fornecedorData && (
            <GlassCard className="p-5 space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fornecedor</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 font-black text-sm">
                  {fornecedorData.nome_fantasia?.[0] || fornecedorData.razao_social?.[0] || "?"}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {fornecedorData.nome_fantasia || fornecedorData.razao_social}
                  </p>
                  {fornecedorData.cnpj && (
                    <p className="text-[10px] text-slate-400 font-mono">{fornecedorData.cnpj}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Prazo médio", value: fornecedorData.prazo_medio_pagamento ? `${fornecedorData.prazo_medio_pagamento} dias` : "—" },
                  { label: "Total comprado", value: formatCurrency(fornecedorData.historico?.totalCompras || 0) },
                  { label: "Última compra", value: fornecedorData.historico?.ultimaCompra ? formatDate(fornecedorData.historico.ultimaCompra) : "Primeira compra" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-xs border-b border-slate-50 py-1.5 last:border-0">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-bold text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Preview de estoque */}
          {itens.some(it => it.nome) && (
            <GlassCard className="p-5 space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estoque após entrada</p>
              <div className="space-y-2">
                {itens.filter(it => it.nome).map(it => (
                  <div key={it.id} className="flex justify-between items-center text-xs border-b border-slate-50 py-1.5 last:border-0">
                    <span className="text-slate-500 truncate max-w-[140px]">{it.nome}</span>
                    <span className="font-bold text-slate-700 shrink-0">
                      {it.catalogItemId ? (
                        <span className={cn(it.estoqueAtual + it.quantidade > 0 ? "text-emerald-600" : "")}>
                          {it.estoqueAtual} → {it.estoqueAtual + it.quantidade}
                        </span>
                      ) : (
                        <span className="text-amber-500">0 → {it.quantidade} ✨</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* BARRA DE TOTAIS FIXA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-6 py-3 flex items-center gap-6 md:left-[220px]">
        <div className="flex gap-6 flex-1">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Itens</p>
            <p className="text-sm font-black text-white">{itens.filter(it => it.nome).length}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Custo total</p>
            <p className="text-sm font-black text-white">{formatCurrency(valorTotal)}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Receita proj.</p>
            <p className="text-sm font-black text-emerald-400">{formatCurrency(receitaProjetada)}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Margem</p>
            <p className="text-sm font-black text-emerald-400">{margemMedia > 0 ? `${margemMedia}%` : "—"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="h-10 px-4 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold hover:border-slate-600 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => setShowPagamento(true)}
            disabled={itens.filter(it => it.nome).length === 0}
            className="h-10 px-6 rounded-xl bg-brand-500 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-600 transition-all disabled:opacity-40 shadow-brand-glow flex items-center gap-2"
          >
            Finalizar e Pagar <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
