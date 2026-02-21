"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    Printer,
    ArrowLeft,
    Trash2,
    Plus,
    Minus,
    Barcode,
    QrCode,
    Settings2,
    LayoutGrid,
    CheckCircle2,
    Search,
    X,
    Eraser,
    DollarSign,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { type Produto } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { getProdutos } from "@/services/estoque";
import { useAuth } from "@/context/AuthContext";

interface LabelItem extends Produto {
    quantidade: number;
    precoPersonalizado?: number; // em centavos
}

function EtiquetasContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { profile } = useAuth();
    const [itens, setItens] = useState<LabelItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de Busca
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Produto[]>([]);
    const [searching, setSearching] = useState(false);

    // Configurações Globais
    const [format, setFormat] = useState<"40x25" | "50x30" | "100x150">("40x25");
    const [type, setType] = useState<"barcode" | "qrcode">("barcode");

    useEffect(() => {
        const idsString = searchParams.get("ids");
        if (!idsString) {
            setLoading(false);
            return;
        }

        // Wait for profile to avoid RLS empty results
        if (!profile?.empresa_id) return;

        const ids = idsString.split(",").filter(id => id.length > 0);
        if (ids.length === 0) {
            setLoading(false);
            return;
        }
        loadProducts(ids);
    }, [searchParams, profile?.empresa_id]);

    // Busca de produtos para adicionar ao lote
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const handler = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await getProdutos(1, 10, { search: searchQuery });
                setSearchResults(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    async function loadProducts(ids: string[]) {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .in('id', ids);

            if (error) throw error;

            setItens(data.map((p: any) => ({ ...p, quantidade: 1 })));
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar produtos selecionados");
        } finally {
            setLoading(false);
        }
    }

    const updateQtd = (id: string, delta: number) => {
        setItens(current => current.map(item =>
            item.id === id ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item
        ));
    };

    const updatePrice = (id: string, value: string) => {
        // Converter string de moeda (ex: 2.500,00) para centavos
        const clean = value.replace(/\./g, '').replace(',', '.').trim();
        const floatVal = parseFloat(clean);
        if (isNaN(floatVal)) return;

        const centavos = Math.round(floatVal * 100);
        setItens(current => current.map(item =>
            item.id === id ? { ...item, precoPersonalizado: centavos } : item
        ));
    };

    const addProduct = (p: Produto) => {
        if (itens.find(item => item.id === p.id)) {
            toast.message("Produto já está no lote", { description: "Aumente a quantidade se desejar mais etiquetas." });
        } else {
            setItens(prev => [...prev, { ...p, quantidade: 1 }]);
            toast.success(`${p.nome} adicionado`);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const removeItem = (id: string) => {
        const newItens = itens.filter(item => item.id !== id);
        setItens(newItens);
    };

    const clearAll = () => {
        setItens([]);
        toast.success("Lote limpo");
    };

    const handlePrint = () => {
        if (itens.length === 0) {
            toast.error("Adicione pelo menos um produto ao lote");
            return;
        }
        // Formatar dados para a página de impressão
        const printData = itens.map(item => ({
            id: item.id,
            q: item.quantidade,
            p: item.precoPersonalizado // Preço personalizado opcional
        }));

        const params = new URLSearchParams();
        params.set("data", JSON.stringify(printData));
        params.set("f", format);
        params.set("t", type);

        // Abrir em nova aba a rota de impressão em lote
        window.open(`/print/etiquetas?${params.toString()}`, '_blank');
    };

    if (loading) return <div className="p-12 text-center">Carregando central de etiquetas...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Central de Etiquetas</h1>
                        <p className="text-slate-500 text-sm">Configure o lote de etiquetas para impressão</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={clearAll}
                        className="btn-ghost text-rose-500 hover:bg-rose-50 h-12 px-6 flex items-center gap-2"
                    >
                        <Eraser size={20} />
                        Limpar Tudo
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={itens.length === 0}
                        className="btn-primary h-12 px-8 flex items-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                    >
                        <Printer size={20} />
                        Gerar Etiquetas
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configurações Extra */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Barra de Busca de Produtos */}
                    <GlassCard className="p-4 bg-brand-600 border-none shadow-brand-500/30">
                        <div className="relative">
                            <label className="text-[10px] font-black text-brand-100 uppercase tracking-widest block mb-2 px-1">Adicionar mais produtos</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-300 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por nome, imei..."
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:bg-white/20 outline-none transition-all text-sm font-medium"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Resultados da Busca */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-64 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addProduct(p)}
                                                className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-none"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                    {p.imagem_url ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <Barcode className="text-slate-300" size={18} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-xs truncate uppercase">{p.nome}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">#{p.codigo_barras || p.imei || p.id.slice(0, 8)}</p>
                                                </div>
                                                <Plus size={16} className="ml-auto text-brand-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {searching && searchQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white p-4 rounded-2xl shadow-xl text-center z-20">
                                    <RefreshCw size={16} className="animate-spin inline-block mr-2 text-brand-500" />
                                    <span className="text-xs font-bold text-slate-500">Buscando...</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard title="Configuração" icon={Settings2}>
                        <div className="space-y-6">
                            {/* Tamanho */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Tamanho da Etiqueta</label>
                                    <Link
                                        href="/configuracoes/etiquetas/a4"
                                        className="text-[10px] font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
                                    >
                                        <Settings2 size={12} /> Configurar A4
                                    </Link>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: "40x25", label: "40x25mm (Padrão)", desc: "Joias / Cabos / Peças" },
                                        { id: "50x30", label: "50x30mm (Médio)", desc: "Caixas / Acessórios" },
                                        { id: "100x150", label: "100x150mm (Grande)", desc: "Envio / Identificação" }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormat(opt.id as any)}
                                            className={cn(
                                                "w-full p-4 rounded-xl border-2 text-left transition-all",
                                                format === opt.id
                                                    ? "border-brand-500 bg-brand-50/50"
                                                    : "border-slate-100 hover:border-slate-200 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cn("font-bold", format === opt.id ? "text-brand-700" : "text-slate-700")}>{opt.label}</span>
                                                {format === opt.id && <CheckCircle2 size={16} className="text-brand-500" />}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-1">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tipo de Código */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Tipo de Código</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setType("barcode")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                                            type === "barcode" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <Barcode size={16} /> Código de Barras
                                    </button>
                                    <button
                                        onClick={() => setType("qrcode")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all",
                                            type === "qrcode" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <QrCode size={16} /> QR Code (Vitrine)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <LayoutGrid className="absolute right-4 top-4 text-white/10" size={60} />
                        <h3 className="text-lg font-bold mb-1">Dica de Impressão</h3>
                        <p className="text-indigo-100 text-xs leading-relaxed opacity-90">
                            Para melhores resultados em impressoras térmicas (Zebra, Elgin, Argox), defina as margens como "Nenhuma" no diálogo de impressão do navegador.
                        </p>
                    </div>
                </div>

                {/* Itens Selecionados */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Itens no Lote ({itens.length})</h2>

                    {itens.map((item) => (
                        <GlassCard key={item.id} className="p-4 group">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                        {item.imagem_url ? (
                                            <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
                                        ) : (
                                            <Barcode className="text-slate-300" size={24} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{item.nome}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                                                {item.codigo_barras || item.imei || "S/ CÓDIGO"}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs font-black text-brand-600">
                                                <DollarSign size={10} />
                                                <input
                                                    type="text"
                                                    defaultValue={((item.precoPersonalizado ?? item.preco_venda_centavos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    onBlur={(e) => updatePrice(item.id, e.target.value)}
                                                    className="w-20 bg-brand-50 border-none p-0 focus:ring-0 font-black cursor-edit outline-none"
                                                    title="Clique para alterar o preço nesta etiqueta"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 shrink-0">
                                    {/* Contador de Quantidade */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => { e.preventDefault(); updateQtd(item.id, -1); }}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center font-black text-slate-800 tabular-nums">
                                            {item.quantidade}
                                        </span>
                                        <button
                                            onClick={(e) => { e.preventDefault(); updateQtd(item.id, 1); }}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    {/* Botão Remover */}
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-2 text-slate-300 hover: Rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Remover do lote"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function EtiquetasLotePage() {
    return (
        <Suspense fallback={<div className="p-12 text-center">Carregando...</div>}>
            <EtiquetasContent />
        </Suspense>
    );
}
