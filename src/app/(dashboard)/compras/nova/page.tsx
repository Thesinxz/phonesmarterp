"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    FileText, Code, Keyboard, 
    ArrowRight, ArrowLeft, Plus, Trash2, 
    Package, CheckCircle2, DollarSign, 
    ShoppingBag, Save, FileCheck, MapPin,
    ChevronLeft, Calculator, Tag, Loader2, Info, AlertCircle
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
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
    const [numeroNota, setNumeroNota] = useState("");
    const [vencimento, setVencimento] = useState("");
    const [observacoes, setObservacoes] = useState("");
    
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
            const { data: fData } = await supabase.from("fornecedores").select("id, nome").eq("empresa_id", profile.empresa_id).order("nome");
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
            categoria: "" 
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
                   categoria: ""
               };
            });

            if (emitent) setFornecedorNome(emitent);
            if (nNF) setNumeroNota(nNF);
            if (dEmi) setDataNota(dEmi);
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
                notaFiscalNumero: numeroNota || undefined,
                observacoes: observacoes || undefined,
                origem: inputMethod === "xml" ? "xml_nfe" : "manual",
                itens: tens
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
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all", step === 1 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        1. Entrada
                    </button>
                    <button 
                        disabled={tens.length === 0}
                        onClick={() => setStep(2)} 
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all", step === 2 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        2. Preços
                    </button>
                    <button 
                        disabled={tens.length === 0}
                        onClick={() => setStep(3)} 
                        className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all", step === 3 ? "bg-white text-slate-800 shadow-sm" : "text-slate-400")}
                    >
                        3. Finalizar
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
                                    <select 
                                        value={fornecedorId} 
                                        onChange={e => {
                                            const f = fornecedores.find(it => it.id === e.target.value);
                                            setFornecedorId(e.target.value);
                                            if (f) setFornecedorNome(f.nome);
                                        }}
                                        className="select-glass h-11"
                                    >
                                        <option value="">Selecionar...</option>
                                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data da Nota *</label>
                                    <input type="date" value={dataNota} onChange={e => setDataNota(e.target.value)} className="input-glass h-11" />
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
                                                    <td className="px-6 py-2">
                                                        <input value={it.nome} onChange={e => updateItem(i, {nome: e.target.value})} placeholder="Nome do produto..." className="w-full bg-transparent border-b border-transparent focus:border-brand-500 font-bold text-slate-800 outline-none h-10" />
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
                            onClick={() => setStep(2)} 
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
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Preço Atacado</label>
                                        <div className="relative mt-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={it.precoAtacado / 100} 
                                                onChange={e => updateItem(idx, {precoAtacado: toCentavos(parseFloat(e.target.value))||0})}
                                                className="input-glass pl-10 font-black text-[#1E40AF] h-11" 
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
                        <button onClick={() => setStep(3)} className="btn-primary h-14 px-10 shadow-brand-glow">
                            Revisar e Finalizar <ArrowRight className="ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* PASSO 3: CONFIRMAR */}
            {step === 3 && (
                <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center mx-auto shadow-xl"><Package size={32}/></div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Resumo Final</h2>
                        <p className="text-slate-500 text-sm">Confirme as informações antes de registrar no ERP</p>
                    </div>

                    <GlassCard className="p-0 overflow-hidden divide-y divide-slate-100">
                        <div className="p-6 space-y-4">
                            {[
                                { label: "Fornecedor", value: fornecedorNome || "Diverso" },
                                { label: "Data da Emissão", value: formatDate(dataNota) },
                                { label: "Nota Fiscal", value: numeroNota || "Não informada" },
                                { label: "Total da Compra", value: formatCurrency(valorTotal), bold: true },
                            ].map(r => (
                                <div key={r.label} className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{r.label}</span>
                                    <span className={cn("text-sm", r.bold ? "font-black text-slate-900 text-base" : "font-bold text-slate-700")}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento do Pagamento</label>
                                <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="input-glass h-12" />
                                <p className="text-[10px] text-brand-500 font-bold flex items-center gap-1.5 mt-2">
                                    <Info size={12}/> Um lançamento de Contas a Pagar será gerado automaticamente.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Automações que serão processadas:</h4>
                            <div className="space-y-2">
                                {[
                                    `Entrada de ${tens.length} produtos no estoque real.`,
                                    `Registro de OC (Ordem de Compra) sequencial.`,
                                    vencimento ? `Geração de Conta a Pagar: ${formatCurrency(valorTotal)}.` : null,
                                    `Histórico de movimentação de estoque registrado.`
                                ].filter(Boolean).map((t, i) => (
                                    <div key={i} className="flex gap-2 text-emerald-600 font-bold text-xs items-center">
                                        <CheckCircle2 size={14}/> {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleConfirmar} 
                            disabled={loading}
                            className="btn-primary h-16 text-xl shadow-brand-glow w-full"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "REGISTRAR COMPRA AGORA"}
                        </button>
                        <button onClick={() => setStep(2)} className="h-12 text-slate-400 font-bold text-xs hover:text-slate-600 transition-all uppercase tracking-widest">
                            Voltar e Corrigir Preços
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
