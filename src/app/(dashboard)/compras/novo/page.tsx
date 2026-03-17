"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    FileText, Image as ImageIcon, Code, Keyboard, 
    ArrowRight, ArrowLeft, Plus, Trash2, 
    TrendingUp, Calculator, Package, CheckCircle2,
    DollarSign, ShieldCheck, Tag, ShoppingCart,
    Loader2, Search, Info
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Stepper } from "@/components/ui/Stepper";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { finalizarCompra, type PurchaseItem } from "@/services/compras";

const supabase = createClient();

type CompraStep = 1 | 2 | 3 | 4;
type InputMethod = "pdf" | "image" | "xml" | "manual";

export default function ComprasNovoPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<CompraStep>(1);
    const [inputMethod, setInputMethod] = useState<InputMethod>("pdf");
    const [loading, setLoading] = useState(false);
    
    // Form Data
    const [itens, setItens] = useState<any[]>([]);
    const [fornecedorNome, setFornecedorNome] = useState("");
    const [dataNota, setDataNota] = useState(new Date().toISOString().split("T")[0]);
    const [numeroNota, setNumeroNota] = useState("");
    const [valorTotalNota, setValorTotalNota] = useState(0);
    const [vencimento, setVencimento] = useState("");
    
    const [pricingSegments, setPricingSegments] = useState<any[]>([]);
    const [itemTypes] = useState([
        { id: "peca", label: "Peça" },
        { id: "celular", label: "Celular" },
        { id: "acessorio", label: "Acessório" },
        { id: "outro", label: "Outro" }
    ]);

    useEffect(() => {
        const loadSegments = async () => {
            const { data } = await supabase.from("pricing_segments").select("*").order("name");
            if (data) setPricingSegments(data);
        };
        loadSegments();
    }, []);

    const steps = [
        { label: "Entrada", icon: FileText },
        { label: "Revisão", icon: Search },
        { label: "Preços", icon: DollarSign },
        { label: "Finalizar", icon: CheckCircle2 }
    ];

    // Passo 1: Processar Arquivo
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const res = await fetch("/api/ai/extract-invoice", {
                    method: "POST",
                    body: JSON.stringify({ file: base64, mimeType: file.type })
                });
                
                if (!res.ok) throw new Error("Erro na extração de dados");
                
                const data = await res.json();
                
                setFornecedorNome(data.fornecedor || "");
                setDataNota(data.data || new Date().toISOString().split("T")[0]);
                setNumeroNota(data.numero_nf || "");
                setValorTotalNota(data.valor_total || 0);
                
                const mappedItens = data.itens.map((it: any) => ({
                    nome: it.nome,
                    quantidade: it.quantidade,
                    custo: it.custo_unitario,
                    tipo: "peca", // default
                    segmentoId: "",
                    precoVarejo: 0,
                    precoAtacado: 0,
                    categoria: ""
                }));
                
                setItens(mappedItens);
                setStep(2);
                toast.success("Dados extraídos com sucesso!");
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addItemManual = () => {
        setItens([...itens, { 
            nome: "", 
            quantidade: 1, 
            custo: 0, 
            tipo: "peca", 
            segmentoId: "",
            precoVarejo: 0,
            precoAtacado: 0,
            categoria: "" 
        }]);
    };

    const removeItem = (index: number) => {
        setItens(itens.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItens = [...itens];
        newItens[index][field] = value;
        setItens(newItens);
    };

    // Passo 4: Finalizar
    const handleFinalize = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const result = await finalizarCompra({
                empresaId: profile.empresa_id,
                itens: itens.map(it => ({
                    nome: it.nome,
                    quantidade: it.quantidade,
                    custoUnitario: Math.round(it.custo * 100),
                    precoVarejo: Math.round(it.precoVarejo * 100),
                    precoAtacado: Math.round(it.precoAtacado * 100),
                    tipo: it.tipo,
                    categoria: it.categoria || it.tipo,
                    subcategoria: ""
                })),
                fornecedorNome: fornecedorNome,
                dataNota: dataNota,
                numeroNota: numeroNota,
                valorTotal: Math.round(valorTotalNota * 100),
                vencimento: vencimento || dataNota,
                parcelas: 1,
                origem: inputMethod === "manual" ? "manual" : "ocr_pdf"
            });
            
            toast.success(`Compra ${result.compraNumero} finalizada com sucesso!`);
            router.push("/compras");
        } catch (err: any) {
            toast.error("Erro ao finalizar compra: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 page-enter pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ShoppingCart className="text-brand-500" /> Gestão de Compras
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Refatore a carga de estoque com OCR e controle total</p>
                </div>
                <div className="hidden md:block">
                    <Stepper steps={steps} currentStep={step - 1} />
                </div>
            </div>

            {/* STEP 1: ENTRADA */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-700">Como deseja lançar a nota?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: "pdf", label: "Nota Fiscal (PDF)", icon: FileText, desc: "Envie o arquivo PDF" },
                                { id: "image", label: "Imagem (Foto)", icon: ImageIcon, desc: "Tire uma foto da nota" },
                                { id: "xml", label: "XML (NF-e)", icon: Code, desc: "Importe o arquivo XML" },
                                { id: "manual", label: "Manual (Teclado)", icon: Keyboard, desc: "Lançamento tradicional" }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setInputMethod(m.id as InputMethod)}
                                    className={cn(
                                        "p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 group relative overflow-hidden",
                                        inputMethod === m.id 
                                            ? "border-brand-500 bg-brand-50 shadow-brand-glow" 
                                            : "border-slate-100 bg-white hover:border-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl transition-all",
                                        inputMethod === m.id ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
                                    )}>
                                        <m.icon size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{m.label}</p>
                                        <p className="text-xs text-slate-400 font-medium">{m.desc}</p>
                                    </div>
                                    {inputMethod === m.id && (
                                        <div className="absolute top-4 right-4 text-brand-500">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {inputMethod !== "manual" ? (
                            <GlassCard className="p-10 border-dashed border-2 border-brand-200 text-center relative overflow-hidden bg-brand-50/20">
                                {loading ? (
                                    <div className="space-y-4 py-6">
                                        <Loader2 className="mx-auto text-brand-500 animate-spin" size={48} />
                                        <div className="space-y-1">
                                            <p className="text-brand-700 font-black animate-pulse">LENDO DOCUMENTO COM IA...</p>
                                            <p className="text-xs text-brand-500">Estamos extraindo todos os itens e preços</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto text-brand-600 border-4 border-white shadow-lg">
                                            <Plus size={32} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-700">Clique para selecionar</p>
                                            <p className="text-sm text-slate-400">ou arraste e solte o arquivo aqui</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept={inputMethod === "pdf" ? ".pdf" : "image/*"}
                                            onChange={handleFileUpload}
                                        />
                                    </div>
                                )}
                            </GlassCard>
                        ) : (
                            <div className="flex justify-end">
                                <button onClick={() => { setStep(2); addItemManual(); }} className="btn-primary h-14 px-10 shadow-brand-glow">
                                    Começar Lançamento Manual <ArrowRight className="ml-2" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-6">
                        <GlassCard title="Informações Úteis" icon={Info} className="h-full">
                            <ul className="space-y-4 text-sm text-slate-600">
                                <li className="flex gap-3">
                                    <div className="mt-1 text-brand-500"><CheckCircle2 size={16}/></div>
                                    <p>O OCR identifica automaticamente o fornecedor, itens, quantidades e valores.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1 text-brand-500"><CheckCircle2 size={16}/></div>
                                    <p>Ao importar via XML, os impostos e NCM são preservados para fins fiscais.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1 text-brand-500"><CheckCircle2 size={16}/></div>
                                    <p>Você poderá revisar e ajustar tudo antes de salvar no estoque.</p>
                                </li>
                            </ul>
                        </GlassCard>
                    </div>
                </div>
            )}

            {/* STEP 2: REVISÃO TÉCNICA */}
            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                             <label className="text-xs font-bold text-slate-400 uppercase ml-2">Fornecedor</label>
                             <input value={fornecedorNome} onChange={e => setFornecedorNome(e.target.value)} className="input-glass mt-1" placeholder="Nome do Fornecedor" />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase ml-2">Número da Nota</label>
                             <input value={numeroNota} onChange={e => setNumeroNota(e.target.value)} className="input-glass mt-1" placeholder="Ex: 12345" />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase ml-2">Data Emissão</label>
                             <input type="date" value={dataNota} onChange={e => setDataNota(e.target.value)} className="input-glass mt-1" />
                        </div>
                    </div>

                    <GlassCard className="p-0 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-700">Itens da Nota ({itens.length})</h3>
                            <button onClick={addItemManual} className="btn-secondary h-9 px-4 text-xs">
                                <Plus size={14} className="mr-1"/> Adicionar Item
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Item Extraído</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Segmento de Preço</th>
                                        <th className="px-6 py-4 text-center">Qtd</th>
                                        <th className="px-6 py-4 text-right">Custo Unitário</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {itens.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="px-6 py-3">
                                                <input value={it.nome} onChange={e => updateItem(idx, 'nome', e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none w-full border-b border-transparent focus:border-brand-500" />
                                            </td>
                                            <td className="px-6 py-3">
                                                <select value={it.tipo} onChange={e => updateItem(idx, 'tipo', e.target.value)} className="select-glass text-xs h-9">
                                                    {itemTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3">
                                                <select 
                                                    value={it.segmentoId} 
                                                    onChange={e => {
                                                        const segment = pricingSegments.find(s => s.id === e.target.value);
                                                        updateItem(idx, 'segmentoId', e.target.value);
                                                        if (segment) {
                                                            const margin = 1 + (segment.default_margin / 100);
                                                            updateItem(idx, 'precoVarejo', it.custo * margin);
                                                            updateItem(idx, 'precoAtacado', it.custo * (margin * 0.9)); // Exemplo: 10% desconto
                                                        }
                                                    }} 
                                                    className="select-glass text-xs h-9"
                                                >
                                                    <option value="">Selecionar Segmento...</option>
                                                    {pricingSegments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.default_margin}%)</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <input type="number" value={it.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 1)} className="w-16 h-9 rounded-xl border border-slate-200 text-center text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none" />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-slate-400 font-medium">R$</span>
                                                    <input type="number" step="0.01" value={it.custo} onChange={e => updateItem(idx, 'custo', parseFloat(e.target.value) || 0)} className="w-24 bg-transparent font-bold text-slate-800 outline-none text-right border-b border-transparent focus:border-brand-500" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                                <ArrowLeft size={16}/> Voltar
                            </button>
                            <button onClick={() => setStep(3)} className="btn-primary h-12 px-8 flex items-center gap-2">
                                Próximo: Precificação <ArrowRight size={16}/>
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* STEP 3: PRECIFICAÇÃO */}
            {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-5 duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-700">Defina os preços de venda</h2>
                        <div className="bg-brand-500 text-white px-4 py-2 rounded-2xl flex items-center gap-3 shadow-brand-glow">
                             <Calculator size={18} />
                             <span className="text-sm font-bold uppercase tracking-wider">Simulador de Margens Ativo</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {itens.map((it, idx) => (
                            <GlassCard key={idx} className="p-6 flex flex-col gap-4 relative group">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
                                            {it.tipo}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">Custo: {formatCurrency(it.custo * 100)}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 truncate">{it.nome}</h3>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 flex justify-between">
                                            <span>Preço Varejo</span>
                                            <span className="text-emerald-500">{(((it.precoVarejo / it.custo) - 1) * 100).toFixed(0)}% margem</span>
                                        </label>
                                        <div className="relative mt-1">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="number" 
                                                value={it.precoVarejo} 
                                                onChange={e => updateItem(idx, 'precoVarejo', parseFloat(e.target.value) || 0)}
                                                className="input-glass pl-9 font-black text-brand-600"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Preço Atacado</label>
                                        <div className="relative mt-1">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="number" 
                                                value={it.precoAtacado} 
                                                onChange={e => updateItem(idx, 'precoAtacado', parseFloat(e.target.value) || 0)}
                                                className="input-glass pl-9 font-bold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-8 h-20 bg-white/80 backdrop-blur-md px-10 border-t border-slate-100 sticky bottom-0 z-50 rounded-t-[40px]">
                        <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2">
                            <ArrowLeft size={16}/> Voltar
                        </button>
                        <button onClick={() => setStep(4)} className="btn-primary h-14 px-12 text-lg shadow-brand-glow">
                            Revisar Finalização <ArrowRight className="ml-2" />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: FINALIZAR */}
            {step === 4 && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Tudo pronto!</h2>
                        <p className="text-slate-500">Confira o resumo das operações que serão automatizadas</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassCard title="Documentos Gerados" icon={FileText} className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-[24px] border border-emerald-100">
                                    <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm"><ShoppingCart size={20}/></div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase">Ordem de Compra</p>
                                        <p className="font-bold text-slate-800">Geração de OC Sequencial</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-[24px] border border-blue-100">
                                    <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm"><DollarSign size={20}/></div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-500 uppercase">Financeiro</p>
                                        <p className="font-bold text-slate-800">1 Lançamento em Contas a Pagar</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-[24px] border border-amber-100">
                                    <div className="p-3 bg-white rounded-2xl text-amber-600 shadow-sm"><Package size={20}/></div>
                                    <div>
                                        <p className="text-[10px] font-black text-amber-500 uppercase">Estoque</p>
                                        <p className="font-bold text-slate-800">Entrada de {itens.reduce((s,i)=>s+i.quantidade,0)} unidades</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard title="Informações Adicionais" icon={Plus} className="p-6 flex flex-col gap-6">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-2">Data Vencimento do Boleto</label>
                                    <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="input-glass mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase ml-2">Total da Nota</label>
                                    <div className="text-3xl font-black text-slate-800 px-2">
                                        {formatCurrency(itens.reduce((s,i) => s + (i.custo * i.quantidade), 0) * 100)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-900 rounded-[24px] text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="text-brand-400" />
                                    <span className="text-xs font-black uppercase">Dados Verificados</span>
                                </div>
                                <span className="text-[10px] font-bold opacity-50">v1.2</span>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="flex gap-4 pt-10">
                        <button onClick={() => setStep(3)} className="btn-ghost flex-1 h-16 text-lg">
                            <ArrowLeft className="mr-2"/> Voltar
                        </button>
                        <button 
                            disabled={loading || itens.length === 0}
                            onClick={handleFinalize} 
                            className="btn-primary flex-[2] h-16 text-xl shadow-brand-glow"
                        >
                            {loading ? <Loader2 className="animate-spin mr-2"/> : <Package className="mr-2"/>}
                            FINALIZAR E DAR ENTRADA
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
