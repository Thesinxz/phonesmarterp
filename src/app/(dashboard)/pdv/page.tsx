"use client";

import { useState, useEffect } from "react";
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    CreditCard,
    Banknote,
    QrCode,
    User,
    Package,
    CheckCircle2,
    Printer,
    History,
    Percent,
    Clock
} from "lucide-react";
import { getProdutos } from "@/services/estoque";
import { finalizarVenda } from "@/services/vendas";
import { getClientes } from "@/services/clientes";
import { notifyVenda } from "@/actions/notifications";
import { type Produto, type Cliente } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { FileCode2 } from "lucide-react";

interface CartItem extends Produto {
    quantity: number;
}

export default function PDVPage() {
    const { profile } = useAuth();
    const { defaultGateway } = useFinanceConfig();
    const [products, setProducts] = useState<Produto[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [finishing, setFinishing] = useState(false);

    // Client selection
    const [searchClient, setSearchClient] = useState("");
    const [clients, setClients] = useState<Cliente[]>([]);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<string>("dinheiro");
    const [parcelas, setParcelas] = useState<number>(1);
    const [descontoReais, setDescontoReais] = useState<number>(0);
    const [descontoPercentual, setDescontoPercentual] = useState<number>(0);
    const [valorRecebido, setValorRecebido] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault();
                document.getElementById("product-search")?.focus();
            }
            if (e.key === "F10" && cart.length > 0) {
                e.preventDefault();
                handleFinalizar();
            }
            if (e.key === "Escape") {
                setCart([]);
                setSearchTerm("");
                setSelectedClient(null);
                setPaymentMethod("dinheiro");
                setParcelas(1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cart, selectedClient, paymentMethod]);

    useEffect(() => {
        // Carga inicial rápida
        loadProducts();

        const supabase = createClient();
        const channelId = profile?.empresa_id ? `pdv-sync-${profile.empresa_id}` : 'pdv-sync-global';
        const filter = profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined;

        console.log("Realtime: PDV Stock Sync iniciando...", channelId);

        const channel = supabase
            .channel(channelId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "produtos",
                    filter: filter
                },
                (payload: any) => {
                    console.log("Realtime PDV:", payload.eventType, payload);
                    if (payload.eventType === 'UPDATE') {
                        // Atualiza instantaneamente o estoque disponível na tela do PDV
                        setProducts(current => current.map(p =>
                            p.id === payload.new.id ? { ...p, ...payload.new } : p
                        ));
                    } else {
                        // Para novos itens, recarregamos
                        loadProducts(searchTerm);
                    }
                }
            )
            .subscribe((status: any) => {
                console.log(`Realtime PDV Status [${channelId}]:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.empresa_id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQtd = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQtd };
            }
            return item;
        }));
    };

    // Cálculo Dinâmico de Totais
    const subtotal = cart.reduce((acc, item) => acc + (item.preco_venda_centavos * item.quantity), 0);
    const subtotalComDesconto = Math.max(0, subtotal - (descontoReais * 100));

    // Aplicar taxa do gateway selecionado
    let taxaGatewayCentavos = 0;
    if (defaultGateway && subtotalComDesconto > 0) {
        if (paymentMethod === 'debito' && defaultGateway.taxa_debito_pct > 0) {
            const totalComTaxa = Math.round(subtotalComDesconto / (1 - defaultGateway.taxa_debito_pct / 100));
            taxaGatewayCentavos = totalComTaxa - subtotalComDesconto;
        } else if (paymentMethod === 'credito') {
            const taxaList = defaultGateway.taxas_credito || [];
            const taxa = taxaList.find(t => t.parcela === parcelas)?.taxa || 0;
            if (taxa > 0) {
                const totalComTaxa = Math.round(subtotalComDesconto / (1 - taxa / 100));
                taxaGatewayCentavos = totalComTaxa - subtotalComDesconto;
            }
        }
    }

    const total = subtotalComDesconto + taxaGatewayCentavos;
    const troco = Math.max(0, (valorRecebido * 100) - total);

    const [createdVenda, setCreatedVenda] = useState<{ id: string, numero?: number } | null>(null);

    async function handleFinalizar() {
        if (!profile || cart.length === 0) return;

        setFinishing(true);
        try {
            const venda = await finalizarVenda({
                venda: {
                    empresa_id: profile.empresa_id,
                    cliente_id: selectedClient?.id || null,
                    total_centavos: total,
                    desconto_centavos: Math.round(descontoReais * 100),
                    forma_pagamento: ['credito', 'boleto', 'crediario'].includes(paymentMethod) ? `${paymentMethod}_${parcelas}x` : paymentMethod,
                    nfce_chave: null,
                    observacoes: taxaGatewayCentavos > 0 ? `Taxa Gateway: R$ ${(taxaGatewayCentavos / 100).toFixed(2)}` : "",
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
            // Notificar via WhatsApp (background)
            if (selectedClient?.telefone) {
                notifyVenda(venda.id).catch(e => console.error("WhatsApp error:", e));
            }
            setCart([]);
            setSelectedClient(null);
            setSearchClient("");
            setPaymentMethod("dinheiro");
            setParcelas(1);

        } catch (error: any) {
            console.error("Erro ao finalizar venda:", error);
            alert("Erro ao finalizar venda: " + (error.message || "Erro desconhecido"));
        } finally {
            setFinishing(false);
        }
    }

    async function handleEmitirNFCe() {
        if (!createdVenda) return;
        setFinishing(true);
        try {
            const res = await fetch("/api/nfe/emitir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendaId: createdVenda.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert("NFC-e emitida com sucesso! Chave: " + data.resposta?.retEnviNFe?.protNFe?.infProt?.chNFe);
        } catch (err: any) {
            alert("Erro ao emitir NFC-e: " + err.message + ". Tente novamente pelo Histórico de Vendas.");
        } finally {
            setFinishing(false);
        }
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-100px)] page-enter">
            {/* Products Side */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">PDV</h1>
                            <p className="text-slate-500 text-sm italic">Ambiente Presencial de Vendas</p>
                        </div>
                        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm animate-pulse">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            MODO CAIXA ATIVO
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/50 px-4 py-2 rounded-2xl border border-white/60">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Data/Hora de Operação</span>
                            <div className="flex items-center gap-2 text-slate-700 font-mono font-bold">
                                <Clock size={16} className="text-brand-500" />
                                {currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-all flex items-center gap-2 uppercase tracking-tight">
                            <Minus size={14} /> Sangria
                        </button>
                        <button className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-emerald-100 transition-all flex items-center gap-2 uppercase tracking-tight">
                            <Plus size={14} /> Suprimento
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        id="product-search"
                        className="input-glass pl-12 h-14 text-xl font-bold border-brand-200/50 shadow-sm"
                        placeholder="[F2] Pesquisar produto por nome, IMEI ou código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-3 gap-4 pb-4 scrollbar-thin">
                    {loading ? (
                        Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="glass-card h-32 animate-pulse bg-slate-50" />
                        ))
                    ) : products.length === 0 ? (
                        <div className="col-span-3 flex flex-col items-center justify-center text-slate-400 py-12">
                            <Package size={48} className="mb-4 opacity-20" />
                            <p>Nenhum produto encontrado</p>
                        </div>
                    ) : (
                        products.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                disabled={product.estoque_qtd <= 0}
                                className={cn(
                                    "glass-card p-4 text-left hover:scale-[1.02] transition-all flex flex-col justify-between group h-36 active:scale-95",
                                    product.estoque_qtd <= 0 && "opacity-50 grayscale cursor-not-allowed"
                                )}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">
                                            {product.nome}
                                        </h3>
                                        {product.grade && (
                                            <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">
                                                {product.grade}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        {product.imei || product.codigo_barras || "S/ REF"}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-brand-600 font-bold">
                                        R$ {(product.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className={cn(
                                        "text-[10px] font-bold",
                                        product.estoque_qtd <= 2 ? "text-amber-500" : "text-slate-400"
                                    )}>
                                        Esq: {product.estoque_qtd}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Cart Side */}
            <div className="w-[380px] flex flex-col gap-6">
                <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border-brand-100/30">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={18} className="text-brand-500" />
                            <h2 className="font-bold text-slate-700">Carrinho</h2>
                        </div>
                        <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {cart.length} ITENS
                        </span>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <ShoppingCart size={40} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">Carrinho vazio</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex gap-3 group">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-slate-700 leading-tight mb-1">{item.nome}</h4>
                                        <p className="text-[10px] text-slate-400 mb-2">
                                            un. R$ {(item.preco_venda_centavos / 100).toLocaleString('pt-BR')}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="p-1 hover:bg-white rounded-md transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="w-8 text-center text-xs font-bold text-slate-700">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="p-1 hover:bg-white rounded-md transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400">un. R$</span>
                                                <input
                                                    type="number"
                                                    className="w-14 bg-transparent border-b border-slate-200 text-[10px] font-bold text-slate-600 focus:outline-none focus:border-brand-500"
                                                    value={(item.preco_venda_centavos / 100)}
                                                    onChange={(e) => {
                                                        const newVal = Number(e.target.value) * 100;
                                                        setCart(prev => prev.map(p => p.id === item.id ? { ...p, preco_venda_centavos: newVal } : p));
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-800">
                                            R$ {((item.preco_venda_centavos * item.quantity) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer / Checkout */}
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-4">
                        {/* Client Select */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                className="input-glass pl-9 min-h-[36px] text-xs h-9"
                                placeholder="Venda sem cliente (consumidor)..."
                                value={selectedClient ? selectedClient.nome : searchClient}
                                onChange={e => {
                                    setSearchClient(e.target.value);
                                    buscarClientes(e.target.value);
                                    if (selectedClient) setSelectedClient(null);
                                }}
                            />
                            {clients.length > 0 && !selectedClient && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20">
                                    {clients.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedClient(c);
                                                setClients([]);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors"
                                        >
                                            <p className="font-bold text-slate-700">{c.nome}</p>
                                            <p className="text-[10px] text-slate-400">{c.telefone || c.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment Methods */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[
                                { id: "dinheiro", icon: Banknote, label: "Dinheiro" },
                                { id: "pix", icon: QrCode, label: "Pix" },
                                { id: "debito", icon: CreditCard, label: "Débito" },
                                { id: "credito", icon: CreditCard, label: "Crédito" },
                                { id: "crediario", icon: Banknote, label: "Fiado" },
                            ].map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => {
                                        setPaymentMethod(method.id);
                                        // Apenas para métodos que não suportam parcelamento, volta pra 1
                                        if (!['credito', 'boleto', 'crediario'].includes(method.id)) setParcelas(1);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1",
                                        paymentMethod === method.id
                                            ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <method.icon size={16} />
                                    <span className="text-[9px] font-bold uppercase">{method.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Seletor de Parcelas */}
                        {['credito', 'boleto', 'crediario'].includes(paymentMethod) && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                                    Número de Parcelas ({paymentMethod})
                                </label>
                                <select
                                    value={parcelas}
                                    onChange={e => setParcelas(Number(e.target.value))}
                                    className="w-full input-glass h-10 text-sm font-bold bg-white"
                                >
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const p = i + 1;
                                        const taxa = defaultGateway?.taxas_credito?.find(t => t.parcela === p)?.taxa || 0;
                                        // Preview do valor da parcela
                                        const totalPreview = taxa > 0 ? subtotalComDesconto / (1 - taxa / 100) : subtotalComDesconto;
                                        const parcelaPreview = totalPreview / p;

                                        return (
                                            <option key={p} value={p}>
                                                {p}x de {(parcelaPreview / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                {taxa > 0 ? ` (com taxa)` : ' (sem juros)'}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                            <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span>R$ {(subtotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Percent size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        placeholder="Desc. %"
                                        className="w-full pl-6 pr-2 py-1 bg-white border border-slate-100 rounded-md text-[10px] font-bold"
                                        value={descontoPercentual || ""}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setDescontoPercentual(val);
                                            setDescontoReais((subtotal * (val / 100)) / 100);
                                        }}
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                    <input
                                        type="number"
                                        placeholder="Desc. Valor"
                                        className="w-full pl-7 pr-2 py-1 bg-white border border-slate-100 rounded-md text-[10px] font-bold"
                                        value={descontoReais || ""}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setDescontoReais(val);
                                            setDescontoPercentual((val * 100) / (subtotal / 100));
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Mostrar Acréscimo do Gateway se houver */}
                            {taxaGatewayCentavos > 0 && (
                                <div className="flex justify-between text-xs font-bold text-amber-600 bg-amber-50/50 p-2 rounded-lg">
                                    <span>Taxa ({paymentMethod === 'credito' ? `${parcelas}x` : paymentMethod})</span>
                                    <span>+ R$ {(taxaGatewayCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}

                            <div className="bg-slate-900/5 p-3 rounded-xl border border-slate-900/10 mb-2 mt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido</span>
                                    <input
                                        type="number"
                                        className="bg-transparent text-right font-black text-slate-800 focus:outline-none w-24"
                                        placeholder="0,00"
                                        value={valorRecebido || ""}
                                        onChange={e => setValorRecebido(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-emerald-600 font-black">
                                    <span className="text-[10px] uppercase tracking-widest">Troco a devolver</span>
                                    <span className="text-base font-mono">
                                        R$ {troco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end pt-1">
                                <span className="text-sm font-black text-slate-600">Total Final</span>
                                <span className="text-3xl font-black text-brand-600">
                                    R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Finalize Button */}
                        <button
                            disabled={cart.length === 0 || finishing}
                            onClick={handleFinalizar}
                            className="w-full h-12 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:grayscale text-white rounded-xl font-bold shadow-brand-glow flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {finishing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />
                                    FINALIZAR VENDA
                                </>
                            )}
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Success Modal */}
            {createdVenda && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm page-enter p-4">
                    <GlassCard className="w-full max-w-md p-8 text-center animate-in zoom-in-95 border-emerald-100 shadow-2xl">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 size={48} className="text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">
                            Venda #{createdVenda.numero ? String(createdVenda.numero).padStart(5, '0') : createdVenda.id.substring(0, 8)} Finalizada!
                        </h2>
                        <p className="text-slate-500 mb-8 text-sm">O estoque foi atualizado e o financeiro registrado.</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.open(`/print/venda/${createdVenda.id}`, '_blank')}
                                className="bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] flex items-center justify-center gap-3 transition-all"
                            >
                                <Printer size={20} />
                                IMPRIMIR COMPROVANTE
                            </button>

                            <button
                                onClick={handleEmitirNFCe}
                                disabled={finishing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                <QrCode size={18} />
                                EMITIR NFC-e
                            </button>

                            <button
                                onClick={() => {
                                    setCreatedVenda(null);
                                    setCart([]);
                                }}
                                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-2"
                            >
                                <Plus size={18} />
                                Próxima Venda
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
