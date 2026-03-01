"use client";

import { useState, useEffect } from "react";
import {
    Search, ShoppingCart, Trash2, Plus, Minus, User, Package,
    CheckCircle2, CreditCard, Banknote, History,
    MessageCircle, Phone, Globe, Instagram, Loader2,
    Printer, Receipt, QrCode
} from "lucide-react";
import { getProdutos } from "@/services/estoque";
import { criarPedido } from "@/services/vendas";
import { getClientes } from "@/services/clientes";
import { type Produto, type Cliente } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { CadastroCompletoClienteModal } from "@/components/clientes/CadastroCompletoClienteModal";

interface CartItem extends Produto {
    quantity: number;
}

export default function NovoPedidoPage() {
    const { profile } = useAuth();
    const [step, setStep] = useState(1);

    // Products & Cart
    const [products, setProducts] = useState<Produto[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Client selection
    const [searchClient, setSearchClient] = useState("");
    const [clients, setClients] = useState<Cliente[]>([]);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [showNewClientModal, setShowNewClientModal] = useState(false);

    // Order Meta
    const [canalVenda, setCanalVenda] = useState<string>("whatsapp");
    const [observacoes, setObservacoes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("dinheiro");
    const [parcelas, setParcelas] = useState<number>(1);

    // Success State
    const [createdVenda, setCreatedVenda] = useState<{ id: string, numero?: number } | null>(null);

    useEffect(() => {
        if (step === 2) {
            loadProducts();
        }
    }, [step]);

    useEffect(() => {
        if (step === 2) {
            const timer = setTimeout(() => {
                loadProducts(searchTerm);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchTerm, step]);

    async function loadProducts(search?: string) {
        setLoading(true);
        try {
            const response = await getProdutos(1, 50, { search });
            setProducts(response.data);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
        } finally {
            setLoading(false);
        }
    }

    async function buscarClientes(term: string) {
        if (term.length < 2) {
            setClients([]);
            return;
        }
        try {
            const { data } = await getClientes(1, 5, { search: term });
            setClients(data);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
        }
    }

    const addToCart = (product: Produto) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.estoque_qtd) {
                    toast.error(`Apenas ${product.estoque_qtd} un. de ${product.nome} em estoque`);
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            if (product.estoque_qtd <= 0) {
                toast.error(`Produto sem estoque suficiente`);
                return prev;
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const existingProduct = prev.find(item => item.id === productId);
            if (!existingProduct) return prev;

            if (delta > 0 && existingProduct.quantity >= existingProduct.estoque_qtd) {
                toast.error(`Limite de estoque atingido para ${existingProduct.nome}`);
                return prev;
            }

            return prev.map(item => {
                if (item.id === productId) {
                    const newQtd = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQtd };
                }
                return item;
            });
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.id !== productId));
    };

    const total = cart.reduce((acc, item) => acc + (item.preco_venda_centavos * item.quantity), 0);

    async function handleSalvarPedido() {
        if (!profile || cart.length === 0) return;

        setSaving(true);
        try {
            const finalPayment = ['credito', 'boleto', 'crediario'].includes(paymentMethod) ? `${paymentMethod}_${parcelas}x` : paymentMethod;

            const venda = await criarPedido({
                venda: {
                    empresa_id: profile.empresa_id,
                    cliente_id: selectedClient?.id || null,
                    total_centavos: total,
                    desconto_centavos: 0,
                    forma_pagamento: finalPayment,
                    nfce_chave: null,
                    observacoes: observacoes,
                    tipo: "pedido",
                    status_pedido: "rascunho",
                    canal_venda: canalVenda as any
                },
                itens: cart.map(item => ({
                    empresa_id: profile.empresa_id,
                    produto_id: item.id,
                    quantidade: item.quantity,
                    preco_unitario_centavos: item.preco_venda_centavos,
                    total_centavos: item.preco_venda_centavos * item.quantity
                })),
                usuarioId: profile.id
            });

            setCreatedVenda({ id: venda.id, numero: venda.numero });
            setStep(4);
        } catch (error: any) {
            alert("Erro ao salvar pedido: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-100px)] page-enter">
            {/* Header com os Passos */}
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50">
                <div className="flex gap-4 items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Novo Pedido</h1>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Assistente de Venda</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all", step === s ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110' : step > s ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400')}>
                                {s}
                            </div>
                        ))}
                    </div>
                </div>
                {step < 4 && (
                    <button onClick={() => window.history.back()} className="text-sm font-bold text-slate-400 hover:text-slate-600">
                        Cancelar Venda
                    </button>
                )}
            </div>

            {/* Passo 1: Informar Cliente */}
            {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4">
                    <GlassCard className="w-full max-w-2xl p-8 flex flex-col gap-6 shadow-2xl border-white/60">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-[2xl] flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <User size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">1. Identificação do Cliente</h2>
                            <p className="text-slate-500 text-sm mt-1">Busque, cadastre na hora ou avance como consumidor final.</p>
                        </div>

                        <div className="relative z-50">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                className="input-glass pl-12 h-16 text-lg font-bold w-full bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-brand-500"
                                placeholder="Buscar cliente por nome ou celular..."
                                value={selectedClient ? selectedClient.nome : searchClient}
                                onChange={e => {
                                    setSearchClient(e.target.value);
                                    buscarClientes(e.target.value);
                                    if (selectedClient) setSelectedClient(null);
                                }}
                            />
                            {clients.length > 0 && !selectedClient && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                    {clients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedClient(c);
                                                setClients([]);
                                            }}
                                            className="w-full text-left px-4 py-4 hover:bg-brand-50 hover:text-brand-700 transition-all border-b border-slate-50 flex flex-col group last:border-0"
                                        >
                                            <span className="font-black text-slate-700">{c.nome}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-brand-400 tracking-widest">{c.telefone || "Sem celular"}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setShowNewClientModal(true)} className="flex-[0.8] py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <Plus size={18} /> Cadastrar Rápido
                            </button>
                            <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl flex items-center justify-center">
                                {selectedClient ? "Avançar para Adicionar Produtos" : "Consumidor Final (Avançar)"}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Passo 2: Seleção de Produtos */}
            {step === 2 && (
                <div className="flex gap-6 h-full min-h-0 animate-in fade-in slide-in-from-right-4">
                    {/* Lista Produtos */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                id="product-search"
                                className="input-glass pl-12 h-14 text-xl font-bold border-brand-200/50 shadow-sm w-full bg-white/80 backdrop-blur-md"
                                placeholder="[F2] Pesquisar por nome, código de barras..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 scrollbar-thin">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="glass-card h-36 animate-pulse bg-slate-50/50" />
                                ))
                            ) : products.length === 0 ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                                    <Package size={64} className="mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">Nenhum produto encontrado</p>
                                </div>
                            ) : (
                                products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={product.estoque_qtd <= 0}
                                        className={cn(
                                            "glass-card p-4 text-left hover:scale-[1.02] transition-all flex flex-col justify-between h-36 active:scale-95 group hover:border-brand-300 hover:shadow-xl",
                                            product.estoque_qtd <= 0 && "opacity-50 grayscale cursor-not-allowed hover:scale-100 hover:border-transparent hover:shadow-none"
                                        )}
                                    >
                                        <div>
                                            <h3 className="font-black text-slate-800 text-sm line-clamp-2 leading-tight group-hover:text-brand-700">{product.nome}</h3>
                                            <p className="text-[10px] font-mono text-slate-400 mt-1">{product.codigo_barras || product.imei || "S/ REF"}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50">
                                            <span className="text-brand-600 font-black text-lg">R$ {(product.preco_venda_centavos / 100).toLocaleString('pt-BR')}</span>
                                            <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded", product.estoque_qtd > 5 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                                                EST: {product.estoque_qtd}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Carrinho Resumo */}
                    <GlassCard className="w-[380px] flex flex-col p-5 bg-slate-50/80 backdrop-blur-xl border-white/60">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><ShoppingCart size={18} className="text-brand-500" /> Itens Adicionados</h3>
                            <span className="bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">{cart.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-thin pr-1">
                            {cart.length === 0 ? (
                                <p className="text-xs text-center font-bold text-slate-400 py-20 uppercase tracking-widest">Seu carrinho está vazio.</p>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative group animate-in fade-in zoom-in-95">
                                        <p className="text-xs font-black text-slate-800 line-clamp-1 pr-6">{item.nome}</p>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shadow-inner">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md text-slate-500 transition-colors"><Minus size={12} /></button>
                                                <span className="w-8 text-center text-xs font-black text-brand-600">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md text-slate-500 transition-colors"><Plus size={12} /></button>
                                            </div>
                                            <span className="text-sm font-black text-slate-700">R$ {((item.preco_venda_centavos * item.quantity) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1"><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-4">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal Calculado</span>
                                <span className="text-2xl font-black text-brand-600 tracking-tight">R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="w-14 h-14 flex items-center justify-center bg-white border-2 border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
                                    < Minus size={20} />
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={cart.length === 0}
                                    className="flex-1 h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                                >
                                    Ir para Pagamento
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Passo 3: Pagamento e Finalização */}
            {step === 3 && (
                <div className="flex-1 flex gap-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                        <GlassCard className="p-8 flex flex-col space-y-6 shadow-xl border-white/60">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-2 uppercase tracking-tight"><CreditCard size={20} className="text-brand-500" /> Forma de Pagamento Prevista</h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'dinheiro', icon: Banknote, label: 'Dinheiro', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                    { id: 'pix', icon: QrCode, label: 'PIX', color: 'text-teal-500', bg: 'bg-teal-50' },
                                    { id: 'debito', icon: CreditCard, label: 'Débito', color: 'text-blue-500', bg: 'bg-blue-50' },
                                    { id: 'credito', icon: CreditCard, label: 'Crédito', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                    { id: 'crediario', icon: History, label: 'Faturado', color: 'text-amber-500', bg: 'bg-amber-50' }
                                ].map(metodo => (
                                    <button
                                        key={metodo.id}
                                        onClick={() => setPaymentMethod(metodo.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all h-28 group",
                                            paymentMethod === metodo.id
                                                ? `border-brand-500 bg-brand-50 shadow-md scale-105`
                                                : "border-slate-100 hover:border-brand-200 bg-white hover:shadow-sm"
                                        )}
                                    >
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", paymentMethod === metodo.id ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-500')}>
                                            <metodo.icon size={20} />
                                        </div>
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", paymentMethod === metodo.id ? "text-brand-700" : "text-slate-500")}>
                                            {metodo.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'credito' && (
                                <div className="p-6 bg-slate-50 rounded-xl space-y-3 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Número de Parcelas</label>
                                    <div className="grid grid-cols-8 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 10, 12].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setParcelas(p)}
                                                className={cn(
                                                    "px-2 py-3 rounded-lg text-sm font-black transition-all border-2",
                                                    parcelas === p
                                                        ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-110"
                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                                )}
                                            >
                                                {p}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        <GlassCard className="p-8 space-y-6 shadow-xl border-white/60">
                            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-2 uppercase tracking-tight"><ClipboardList size={20} className="text-brand-500" /> Detalhes Extras</h2>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal de Origem</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
                                            { id: "telefone", icon: Phone, label: "Telefone" },
                                            { id: "instagram", icon: Instagram, label: "Instagram" },
                                            { id: "site", icon: Globe, label: "Site / Loja" },
                                        ].map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setCanalVenda(c.id)}
                                                className={cn(
                                                    "flex items-center p-3 rounded-xl border-2 transition-all gap-3 overflow-hidden",
                                                    canalVenda === c.id ? "border-brand-500 bg-brand-50 text-brand-700 font-bold shadow-md" : "border-slate-100 text-slate-500 hover:border-brand-200"
                                                )}
                                            >
                                                <div className={cn("p-1.5 rounded-md", canalVenda === c.id ? "bg-brand-500 text-white" : "bg-slate-100")}>
                                                    <c.icon size={16} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">{c.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações (Impressas no Pedido)</label>
                                    <textarea
                                        className="input-glass w-full min-h-[140px] p-4 text-sm resize-none bg-slate-50 focus:bg-white"
                                        placeholder="Ex: Entrega amanhã de manhã. Condições especiais tratadas por WhatsApp..."
                                        value={observacoes}
                                        onChange={e => setObservacoes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    <GlassCard className="w-[380px] flex flex-col p-8 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden h-fit sticky top-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px] mb-8">Resumo do Pedido</h3>

                        <div className="space-y-5 flex-1 relative z-10">
                            <div className="flex flex-col gap-1 border-b border-white/10 pb-4">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Cliente Associado</span>
                                <span className="font-bold text-white text-lg">{selectedClient?.nome || "Consumidor Final"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                                <span className="text-slate-400 font-bold">Itens do Pedido</span>
                                <span className="font-black bg-white/10 px-2 py-1 rounded text-white">{cart.length} selecionados</span>
                            </div>
                        </div>

                        <div className="pt-6 mt-6 space-y-6 relative z-10">
                            <div className="flex flex-col items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Total Calculado</span>
                                <span className="text-4xl font-black text-brand-400 tracking-tight">
                                    R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep(2)} className="w-14 h-14 flex items-center justify-center bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
                                    <Minus size={20} />
                                </button>
                                <button
                                    onClick={handleSalvarPedido}
                                    disabled={saving || cart.length === 0}
                                    className="flex-1 h-14 bg-brand-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : "CRIAR PEDIDO"}
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Passo 4: Concluído / Pós Venda */}
            {step === 4 && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Pedido Criado!</h2>
                    <p className="text-slate-500 mb-2 max-w-sm text-center font-medium">O rascunho de venda foi gerado com sucesso para controle e aprovação.</p>
                    <p className="font-mono bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg font-bold text-sm mb-10">
                        Nº {createdVenda?.id?.split('-')[0].toUpperCase()}
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
                        <button onClick={() => alert("Imprimindo 80mm...")} className="glass-card bg-white flex flex-col items-center justify-center p-8 gap-4 hover:border-brand-500 hover:text-brand-600 transition-all group scale-100 hover:scale-105 hover:shadow-2xl">
                            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors shadow-inner text-brand-500">
                                <Receipt size={32} />
                            </div>
                            <span className="font-black uppercase tracking-widest text-xs">Recibo 80mm</span>
                        </button>

                        <button onClick={() => alert("Imprimindo A4...")} className="glass-card bg-white flex flex-col items-center justify-center p-8 gap-4 hover:border-brand-500 hover:text-brand-600 transition-all group scale-100 hover:scale-105 hover:shadow-2xl">
                            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors shadow-inner text-brand-500">
                                <Printer size={32} />
                            </div>
                            <span className="font-black uppercase tracking-widest text-xs">Imprimir A4</span>
                        </button>

                        <button onClick={() => {
                            if (!selectedClient?.telefone) alert("Cliente não possui telefone cadastrado!");
                            else window.open(`https://wa.me/55${selectedClient.telefone.replace(/\D/g, "")}?text=Olá! O seu pedido de número ${createdVenda?.id?.split('-')[0].toUpperCase()} no valor de R$ ${(total / 100).toLocaleString('pt-BR')} acabou de ser gerado em nossa loja!`, "_blank");
                        }} className="glass-card bg-emerald-50/50 flex flex-col items-center justify-center p-8 gap-4 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all group scale-100 hover:scale-105 hover:shadow-2xl border-emerald-100">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors text-emerald-600 shadow-inner">
                                <MessageCircle size={32} fill="currentColor" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-xs">Enviar WhatsApp</span>
                        </button>
                    </div>

                    <div className="mt-14">
                        <button onClick={() => {
                            setStep(1);
                            setCart([]);
                            setSelectedClient(null);
                            setSearchClient("");
                        }} className="btn-secondary px-8 py-3 rounded-full font-black tracking-widest uppercase hover:scale-105 transition-all outline-none focus:ring-4 ring-slate-200 text-xs">
                            CRIAR NOVO PEDIDO
                        </button>
                    </div>
                </div>
            )}

            {showNewClientModal && (
                <CadastroCompletoClienteModal
                    onClose={() => setShowNewClientModal(false)}
                    initialName={searchClient}
                    onSuccess={(novoCliente) => {
                        setSelectedClient(novoCliente);
                        setSearchClient("");
                        setShowNewClientModal(false);
                    }}
                />
            )}
        </div>
    );
}
