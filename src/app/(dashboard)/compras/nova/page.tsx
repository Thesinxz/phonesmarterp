"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Plus, Search, Calendar, FileText, Package, 
    Trash2, CreditCard, ChevronRight, LayoutGrid, 
    ArrowLeft, ArrowRight, History, ShoppingBag, Truck,
    AlertCircle, Check, Info, Code, Keyboard, MapPin,
    CheckCircle2, DollarSign, Save, FileCheck, ChevronLeft,
    Calculator, Tag, Loader2
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

type CompraStep = 1 | 2 | 3;
type InputMethod = "manual" | "xml";

export default function ComprasNovaPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [step, setStep] = useState<CompraStep>(1);
    const [inputMethod, setInputMethod] = useState<InputMethod>("manual");
    const [loading, setLoading] = useState(false);
    
    // Form Data
    const [fornecedorId, setFornecedorId] = useState("");
    const [fornecedorNome, setFornecedorNome] = useState("");
    const [dataNota, setDataNota] = useState(new Date().toISOString().split("T")[0]);
    const today = new Date().toISOString().split("T")[0];
    const [numeroNota, setNumeroNota] = useState("");
    const [vencimento, setVencimento] = useState("");
    const [formaPagamento, setFormaPagamento] = useState("a_combinar");
    const [parcelas, setParcelas] = useState(1);
    const [observacoes, setObservacoes] = useState("");
    const [fornecedorCnpj, setFornecedorCnpj] = useState("");
    
    const [tens, setTens] = useState<any[]>([]); // "itens" já está sendo usado pelo Lucide o UI as vezes, usando "tens"
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [unidadeId, setUnidadeId] = useState("");

    useEffect(() => {
        if (profile?.unit_id) setUnidadeId(profile.unit_id);
    }, [profile?.unit_id]);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const load = async () => {
            const { data: fData } = await (supabase as any).from("fornecedores").select("id, nome").eq("empresa_id", profile.empresa_id).order("nome");
            if (fData) setFornecedores(fData);

            const { data: uData } = await supabase.from("units").select("id, name").eq("empresa_id", profile.empresa_id).eq("is_active", true);
            if (uData) setUnits(uData);
        };
        load();
    }, [profile?.empresa_id]);

    const addItem = () => {
        setTens([...tens, { 
            nome: "", 
            quantidade: 1, 
            custoUnitario: 0, 
            precoVarejo: 0, 
            precoAtacado: 0, 
            itemType: "peca", 
            categoria: "",
            ncm: "",
            catalogItemId: null,
            estoqueAtual: 0
        }]);
    };

    const removeItem = (idx: number) => {
        setTens(tens.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, updates: any) => {
        const newTens = [...tens];
        newTens[idx] = { ...newTens[idx], ...updates };
        setTens(newTens);
    };

    const valorTotal = tens.reduce((acc, it) => acc + (it.custoUnitario * it.quantidade), 0);

    const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "application/xml");

            // Parsing simples (apenas exemplo para demonstrar fluxo)
            const emitent = xml.getElementsByTagName("xNome")[0]?.textContent;
            const nNF = xml.getElementsByTagName("nNF")[0]?.textContent;
            const dEmi = xml.getElementsByTagName("dhEmi")[0]?.textContent?.split("T")[0];
            const vNF = xml.getElementsByTagName("vNF")[0]?.textContent;
            
            const detTags = Array.from(xml.getElementsByTagName("det"));
            const extractedItems = detTags.map(det => {
               const prod = det.getElementsByTagName("prod")[0];
               return {
                   nome: prod.getElementsByTagName("xProd")[0]?.textContent || "Produto XML",
                   quantidade: parseInt(prod.getElementsByTagName("qCom")[0]?.textContent || "1"),
                   custoUnitario: toCentavos(parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0")),
                   precoVarejo: 0,
                   precoAtacado: 0,
                   itemType: "peca",
                   categoria: "",
                   ncm: prod.getElementsByTagName("NCM")[0]?.textContent || "",
                   catalogItemId: null,
                   estoqueAtual: 0
               };
            });

            if (emitent) setFornecedorNome(emitent);
            if (nNF) setNumeroNota(nNF);
            if (dEmi) setDataNota(dEmi);

            // Tentar identificar fornecedor pelo CNPJ no XML (Emitente)
            const cnpjEmit = xml.querySelector('emit > CNPJ')?.textContent;
            if (cnpjEmit && profile?.empresa_id) {
                const cleanCnpj = cnpjEmit.replace(/\D/g, "");
                setFornecedorCnpj(cleanCnpj);
                const { data: forn } = await (supabase as any)
                    .from("fornecedores")
                    .select("id, razao_social, nome_fantasia, cnpj")
                    .eq("empresa_id", profile.empresa_id)
                    .eq("cnpj", cleanCnpj)
                    .maybeSingle();

                if (forn) {
                    setFornecedorId(forn.id);
                    setFornecedorNome(forn.nome_fantasia || forn.razao_social);
                    toast.success(`Fornecedor "${forn.razao_social}" identificado pelo CNPJ!`);
                }
            }

            setTens(extractedItems);
            
            toast.success("XML processado com sucesso!");
        } catch (err) {
            toast.error("Erro ao ler XML: verifique o formato.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmar = async () => {
        if (!profile?.empresa_id) return;
        if (!unidadeId) {
            toast.error("Por favor, selecione a unidade de destino no primeiro passo.");
            setStep(1);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await criarCompra({
                empresaId: profile.empresa_id,
                unidadeId: unidadeId,
                fornecedorId: fornecedorId || undefined,
                fornecedorNome: fornecedorNome || "Diverso",
                dataCompra: dataNota,
                dataVencimento: vencimento || undefined,
                formaPagamento: formaPagamento,
                parcelas: parcelas,
                notaFiscalNumero: numeroNota || undefined,
                observacoes: observacoes || undefined,
                origem: inputMethod === "xml" ? "xml_nfe" : "manual",
                itens: tens.map(it => ({
                    ...it,
                    catalogItemId: it.catalogItemId || undefined
                }))
            });
            
            toast.success(`Compra OC-${String(res.numero).padStart(3, '0')} registrada!`);
            router.push(`/compras/${res.compraId}`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 page-enter pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Plus className="text-brand-500" /> Nova Compra
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Lançamento de mercadorias e entrada de estoque</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                    <button 
                        onClick={() => setStep(1)} 
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2", step === 1 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        {tens.length > 0 ? <Check size={12} className="text-emerald-500" /> : <span className="w-3 h-3 flex items-center justify-center border border-current rounded-full text-[8px]">1</span>}
                        Entrada
                    </button>
                    <button 
                        disabled={tens.length === 0}
                        onClick={() => setStep(2)} 
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2", step === 2 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        {tens.length > 0 && tens.every(it => it.precoVarejo > 0) ? <Check size={12} className="text-emerald-500" /> : <span className="w-3 h-3 flex items-center justify-center border border-current rounded-full text-[8px]">2</span>}
                        Preços
                    </button>
                    <button 
                        disabled={tens.length === 0}
                        onClick={() => setStep(3)} 
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2", step === 3 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        <span className="w-3 h-3 flex items-center justify-center border border-current rounded-full text-[8px]">3</span>
                        Finalizar
                    </button>
                </div>
            </div>

            {/* PASSO 1: ENTRADA */}
            {step === 1 && (
                <div className="animate-in slide-in-from-bottom-5 duration-500 space-y-6">
                    <GlassCard className="border-brand-200 bg-brand-50/20">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="p-3 bg-brand-500 text-white rounded-[20px] shadow-brand-glow"><MapPin size={24}/></div>
                            <div className="flex-1 w-full">
                                <label className="text-[10px] font-black uppercase text-brand-600 tracking-widest ml-1">Unidade de Destino *</label>
                                <select 
                                    value={unidadeId} 
                                    onChange={e => setUnidadeId(e.target.value)}
                                    className="select-glass bg-white h-12 mt-1"
                                >
                                    <option value="">Selecionar Unidade...</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <p className="text-[10px] max-w-[200px] text-slate-400 font-bold uppercase leading-relaxed italic text-center md:text-left">
                               * Os produtos comprados serão adicionados ao estoque desta unidade.
                            </p>
                        </div>
                    </GlassCard>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setInputMethod("manual")}
                            className={cn("flex-1 h-32 rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-3", 
                                inputMethod === "manual" ? "border-brand-500 bg-brand-50" : "border-slate-100 bg-white hover:border-slate-200")}>
                            <div className={cn("p-2 rounded-xl", inputMethod === "manual" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400")}><Keyboard size={24}/></div>
                            <span className="font-black text-[10px] uppercase tracking-widest leading-none">Entrada Manual</span>
                        </button>
                        <button 
                            onClick={() => setInputMethod("xml")}
                            className={cn("flex-1 h-32 rounded-[24px] border-2 transition-all flex flex-col items-center justify-center gap-3", 
                                inputMethod === "xml" ? "border-brand-500 bg-brand-50" : "border-slate-100 bg-white hover:border-slate-200")}>
                            <div className={cn("p-2 rounded-xl", inputMethod === "xml" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400")}><Code size={24}/></div>
                            <span className="font-black text-[10px] uppercase tracking-widest leading-none">Importar XML (NF-e)</span>
                        </button>
                    </div>

                    {inputMethod === "manual" ? (
                        <div className="space-y-6">
                            <GlassCard className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fornecedor *</label>
                                    <FornecedorCombobox 
                                        empresaId={profile?.empresa_id || ''}
                                        value={fornecedorId}
                                        onSelect={(f) => {
                                            setFornecedorId(f?.id || '');
                                            setFornecedorNome(f?.nome_fantasia || f?.razao_social || '');
                                            setFornecedorCnpj(f?.cnpj || '');
                                        }}
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
                                    <input value={numeroNota} onChange={e => setNumeroNota(e.target.value)} placeholder="Ex: NF-123" className="input-glass h-11" />
                                </div>
                            </GlassCard>

                            <GlassCard className="p-0 overflow-hidden shadow-sm">
                                <div className="p-4 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Produtos / Itens</span>
                                    <button onClick={addItem} className="btn-secondary h-8 px-4 text-[10px] uppercase font-black tracking-widest">
                                        + Add Novo
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Produto</th>
                                                <th className="px-6 py-4 w-32 text-center">NCM</th>
                                                <th className="px-6 py-4 w-40">Tipo</th>
                                                <th className="px-6 py-4 text-center w-24">Qtd</th>
                                                <th className="px-6 py-4 text-right w-40">Custo Unit.</th>
                                                <th className="px-6 py-4 text-right pr-10">Total</th>
                                                <th className="px-6 py-4 w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {tens.map((it, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                                    <td className="px-6 py-3 min-w-[250px]">
                                                        <ProdutoCombobox
                                                            value={it.nome}
                                                            empresaId={profile?.empresa_id || ''}
                                                            itemType={it.itemType}
                                                            onSelect={(produto, nome) => {
                                                                updateItem(i, {
                                                                    nome,
                                                                    catalogItemId: produto?.id || null,
                                                                    itemType: produto?.item_type || it.itemType,
                                                                    custoUnitario: produto?.cost_price || it.custoUnitario,
                                                                    estoqueAtual: produto?.stock_qty || 0,
                                                                    ncm: produto?.ncm || it.ncm
                                                                });
                                                            }}
                                                        />
                                                        {it.catalogItemId && (
                                                            <div className="flex flex-col gap-0.5 mt-1 animate-in slide-in-from-left-1">
                                                                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
                                                                    <Check size={10} /> Vinculado ao catálogo
                                                                </div>
                                                                {it.estoqueAtual <= 0 && (
                                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase">
                                                                        <AlertCircle size={10} /> Estoque zerado — esta compra dará entrada
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-2">
                                                        <input 
                                                            value={it.ncm} 
                                                            maxLength={8}
                                                            onChange={e => updateItem(i, { ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })} 
                                                            placeholder="00000000" 
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg h-9 px-2 font-mono text-center text-xs outline-none focus:border-brand-500 transition-all" 
                                                        />
                                                    </td>
                                                    <td className="px-6 py-2">
                                                        <select value={it.itemType} onChange={e => updateItem(i, {itemType: e.target.value})} className="select-glass text-xs h-9">
                                                            <option value="peca">Peça</option>
                                                            <option value="celular">Celular</option>
                                                            <option value="acessorio">Acessório</option>
                                                            <option value="outro">Outro</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-2 text-center">
                                                        <input type="number" min={1} value={it.quantidade} onChange={e => updateItem(i, {quantidade: parseInt(e.target.value)||1})} className="w-16 h-9 rounded-xl border border-slate-100 text-center font-bold outline-none focus:ring-2 focus:ring-brand-500/20" />
                                                    </td>
                                                    <td className="px-6 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-slate-300 font-bold">R$</span>
                                                            <input type="number" step="0.01" value={it.custoUnitario / 100} onChange={e => updateItem(i, {custoUnitario: toCentavos(parseFloat(e.target.value))||0})} className="w-24 bg-transparent border-b border-transparent focus:border-brand-500 font-black text-slate-800 outline-none text-right h-10" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2 text-right pr-10 font-bold text-slate-800">
                                                        {formatCurrency(it.custoUnitario * it.quantidade)}
                                                    </td>
                                                    <td className="px-6 py-2 text-center">
                                                        <button onClick={() => removeItem(i)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {tens.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-xs">
                                                        Nenhum item adicionado. Use o botão + Add Novo.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {tens.length > 0 && (
                                            <tfoot className="bg-slate-50">
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 pl-6">Total da Nota</td>
                                                    <td className="px-6 py-4 text-right pr-10 font-black text-slate-900 text-lg">
                                                        {formatCurrency(valorTotal)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-4 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações da Compra</label>
                                <textarea
                                    value={observacoes}
                                    onChange={e => setObservacoes(e.target.value)}
                                    placeholder="Condições especiais, referências internas ou detalhes da entrega..."
                                    className="input-glass min-h-[80px] py-3 resize-none text-sm"
                                />
                            </GlassCard>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div 
                                className="h-64 rounded-[40px] border-4 border-dashed border-slate-100 bg-white flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-200 transition-all hover:bg-brand-50/20 group"
                                onClick={() => fileInputRef.current?.click()}>
                                <input type="file" accept=".xml" ref={fileInputRef} className="hidden" onChange={handleXmlUpload} />
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-brand-500 transition-all shadow-inner">
                                    <Code size={40} />
                                </div>
                                <div className="text-center">
                                    <p className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Clique para selecionar o XML</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Sua NF-e será processada automaticamente</p>
                                </div>
                            </div>
                            
                            {tens.length > 0 && (
                                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px] flex items-center justify-between animate-in zoom-in-95">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><CheckCircle2 size={24}/></div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">XML Processado</p>
                                            <p className="font-bold text-slate-800">{fornecedorNome} · {tens.length} itens encontrados</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Total Detectado</p>
                                        <p className="text-xl font-black text-slate-900">{formatCurrency(valorTotal)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button 
                            disabled={tens.length === 0}
                            onClick={() => {
                                if (tens.length === 0) return;
                                setStep(2);
                            }} 
                            className="btn-primary h-14 px-10 shadow-brand-glow"
                        >
                            Próximo Passo: Precificação <ArrowRight className="ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* PASSO 2: PRECIFICAÇÃO */}
            {step === 2 && (
                <div className="animate-in slide-in-from-right-5 duration-500 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700">
                        <Calculator size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Defina os preços de venda para o catálogo</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tens.map((it, idx) => (
                            <GlassCard key={idx} className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md">{it.itemType}</span>
                                        <span className="text-xs text-slate-400 font-bold">Custo: {formatCurrency(it.custoUnitario)}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 truncate">{it.nome}</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex justify-between">
                                            <span>Preço Varejo</span>
                                            {it.precoVarejo > 0 && <span className="text-emerald-500 font-black">+{(((it.precoVarejo*100 / it.custoUnitario) - 100).toFixed(0))}%</span>}
                                        </label>
                                        <div className="relative mt-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={it.precoVarejo / 100} 
                                                onChange={e => updateItem(idx, {precoVarejo: toCentavos(parseFloat(e.target.value))||0})}
                                                className="input-glass pl-10 font-black text-emerald-600 h-11" 
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Preço Atacado (US$)</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">US$</span>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={it.precoAtacado / 100} 
                                                    onChange={e => updateItem(idx, {precoAtacado: toCentavos(parseFloat(e.target.value))||0})}
                                                    className="input-glass pl-12 font-black text-[#1E40AF] h-11" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 block">Categoria</label>
                                            <input 
                                                value={it.categoria || ''}
                                                onChange={e => updateItem(idx, {categoria: e.target.value})}
                                                placeholder="Ex: Frontal"
                                                className="input-glass h-11 text-sm mt-1" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-8">
                        <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                            <ArrowLeft size={16}/> Voltar para Entrada
                        </button>
                        <button 
                            onClick={() => {
                                const semPreco = tens.filter(it => it.precoVarejo === 0);
                                if (semPreco.length > 0) {
                                    toast.warning(`${semPreco.length} item(ns) estão sem preço de venda definido.`);
                                }
                                setStep(3);
                            }} 
                            className="btn-primary h-14 px-10 shadow-brand-glow"
                        >
                            Revisar e Finalizar <ArrowRight className="ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* PASSO 3: CONFIRMAR */}
            {step === 3 && (
                <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center mx-auto shadow-xl"><Package size={32}/></div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Revisão e Pagamento</h2>
                        <p className="text-slate-500 text-sm">Confirme os dados e as condições financeiras</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* COLUNA ESQUERDA: RESUMO */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Resumo da Compra</h3>
                            
                            <GlassCard className="p-6 space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Fornecedor</span>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-slate-700">{fornecedorNome || "Diverso"}</div>
                                            {fornecedorCnpj && (
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    CNPJ: {fornecedorCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Data da Nota</span>
                                        <span className="text-sm font-bold text-slate-700">{formatDate(dataNota)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Número da Nota</span>
                                        <span className="text-sm font-bold text-slate-700">{numeroNota || "—"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Origem</span>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">
                                            {inputMethod === "xml" ? "XML NF-e" : "Manual"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pagamento</span>
                                        <span className="text-sm font-bold text-slate-700 capitalize">
                                            {parcelas}x no {formaPagamento.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-900 uppercase">Total Geral</span>
                                        <span className="text-xl font-black text-brand-600">{formatCurrency(valorTotal)}</span>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Itens ({tens.length})</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <tbody className="divide-y divide-slate-50">
                                            {tens.map((it, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-700 uppercase">{it.nome}</div>
                                                        {it.ncm && <div className="text-[9px] text-slate-400 font-mono">NCM: {it.ncm}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500">
                                                        {it.quantidade} × {formatCurrency(it.custoUnitario)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                        {formatCurrency(it.custoUnitario * it.quantidade)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>

                        {/* COLUNA DIREITA: PAGAMENTO */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Condições de Pagamento</h3>
                            
                            <GlassCard className="p-6 space-y-6 shadow-brand-glow/5 border-brand-100">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Forma de Pagamento</label>
                                        <select 
                                            value={formaPagamento} 
                                            onChange={e => setFormaPagamento(e.target.value)}
                                            className="select-glass bg-white h-12"
                                        >
                                            <option value="pix">PIX</option>
                                            <option value="boleto">Boleto</option>
                                            <option value="transferencia">Transferência</option>
                                            <option value="cartao">Cartão</option>
                                            <option value="dinheiro">Dinheiro</option>
                                            <option value="prazo">A prazo</option>
                                            <option value="a_combinar">A combinar</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento (1ª Parc)</label>
                                            <input 
                                                type="date" 
                                                value={vencimento} 
                                                min={today}
                                                onChange={e => setVencimento(e.target.value)} 
                                                className="input-glass h-12" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Parcelas</label>
                                            <select 
                                                value={parcelas} 
                                                onChange={e => setParcelas(parseInt(e.target.value))}
                                                className="select-glass bg-white h-12"
                                            >
                                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                                    <option key={n} value={n}>{n}x de {formatCurrency(Math.floor(valorTotal / n))}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {vencimento ? (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                            <CheckCircle2 size={14}/> Preview Financeiro
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                ✓ Será gerado em <strong>Contas a Pagar</strong>:
                                                {parcelas === 1 ? (
                                                    <span> 1 parcela de <strong>{formatCurrency(valorTotal)}</strong> vencendo em <strong>{formatDate(vencimento)}</strong>.</span>
                                                ) : (
                                                    <span> <strong>{parcelas}x</strong> de aproximadamente <strong>{formatCurrency(Math.floor(valorTotal / parcelas))}</strong> — com primeira parcela em <strong>{formatDate(vencimento)}</strong>.</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 text-slate-400 italic text-[11px]">
                                        <Info size={14} className="mt-0.5 shrink-0" />
                                        Sem data de vencimento definida. Nenhum título será gerado no Financeiro.
                                    </div>
                                )}
                            </GlassCard>

                            <div className="flex flex-col gap-3 pt-4">
                                <button 
                                    onClick={handleConfirmar} 
                                    disabled={loading}
                                    className="btn-primary h-16 text-xl shadow-brand-glow w-full"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "REGISTRAR COMPRA AGORA"}
                                </button>
                                <button onClick={() => setStep(2)} className="h-12 text-slate-400 font-bold text-xs hover:text-slate-600 transition-all uppercase tracking-widest text-center">
                                    Voltar e Ajustar Preços
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
