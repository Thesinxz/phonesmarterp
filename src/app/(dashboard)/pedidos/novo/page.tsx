"use client";

import { useState, useEffect } from "react";
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    User,
    Package,
    CheckCircle2,
    ClipboardList,
    Smartphone,
    MessageCircle,
    Phone,
    Globe,
    Instagram,
    Loader2
} from "lucide-react";
import { getProdutos } from "@/services/estoque";
import { criarPedido } from "@/services/vendas";
import { getClientes } from "@/services/clientes";
import { type Produto, type Cliente } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";

interface CartItem extends Produto {
    quantity: number;
}

export default function NovoPedidoPage() {
    const { profile } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<Produto[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Client selection
    const [searchClient, setSearchClient] = useState("");
    const [clients, setClients] = useState<Cliente[]>([]);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

    // Order Meta
    const [canalVenda, setCanalVenda] = useState<string>("whatsapp");
    const [observacoes, setObservacoes] = useState("");

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    async function loadProducts(search?: string) {
        setLoading(true);
        try {
            const data = await getProdutos({ search });
            setProducts(data);
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

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQtd = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQtd };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.preco_venda_centavos * item.quantity), 0);

    async function handleSalvarPedido() {
        if (!profile || cart.length === 0) return;

        setSaving(true);
        try {
            await criarPedido({
                venda: {
                    empresa_id: profile.empresa_id,
                    cliente_id: selectedClient?.id || null,
                    total_centavos: total,
                    desconto_centavos: 0,
                    forma_pagamento: "faturado",
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

            router.push("/pedidos");
        } catch (error: any) {
            alert("Erro ao salvar pedido: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-100px)] page-enter">
            {/* Products Side */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Novo Pedido de Venda</h1>
                        <p className="text-slate-500 text-sm italic">Crie orçamentos e vendas remotas</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        className="input-glass pl-12 h-14 text-xl font-bold border-brand-200/50"
                        placeholder="Pesquisar produto por nome, IMEI ou código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4 scrollbar-thin">
                    {loading ? (
                        Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="glass-card h-32 animate-pulse bg-slate-50" />
                        ))
                    ) : (
                        products.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="glass-card p-4 text-left hover:scale-[1.02] transition-all flex flex-col justify-between h-32 active:scale-95"
                            >
                                <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{product.nome}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-brand-600 font-bold">R$ {(product.preco_venda_centavos / 100).toLocaleString('pt-BR')}</span>
                                    <span className="text-[10px] font-bold text-slate-400">Est: {product.estoque_qtd}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Config Side */}
            <div className="w-[400px] flex flex-col gap-6">
                <GlassCard className="flex-1 flex flex-col p-6 overflow-hidden">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <ClipboardList className="text-brand-500" size={20} />
                        <h2 className="font-black text-slate-800 uppercase tracking-tight">Detalhes do Pedido</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 scrollbar-none">
                        {/* Client */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    className="input-glass pl-10 h-11 text-sm font-bold"
                                    placeholder="Buscar cliente..."
                                    value={selectedClient ? selectedClient.nome : searchClient}
                                    onChange={e => {
                                        setSearchClient(e.target.value);
                                        buscarClientes(e.target.value);
                                        if (selectedClient) setSelectedClient(null);
                                    }}
                                />
                                {clients.length > 0 && !selectedClient && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50">
                                        {clients.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedClient(c);
                                                    setClients([]);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm transition-all"
                                            >
                                                <p className="font-bold text-slate-700">{c.nome}</p>
                                                <p className="text-[10px] text-slate-400">{c.telefone}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Canal */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal de Origem</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: "whatsapp", icon: MessageCircle, label: "Zap" },
                                    { id: "telefone", icon: Phone, label: "Tel" },
                                    { id: "instagram", icon: Instagram, label: "Insta" },
                                    { id: "site", icon: Globe, label: "Site" },
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setCanalVenda(c.id)}
                                        className={cn(
                                            "flex flex-col items-center p-2 rounded-xl border-2 transition-all gap-1",
                                            canalVenda === c.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-100 text-slate-400"
                                        )}
                                    >
                                        <c.icon size={16} />
                                        <span className="text-[9px] font-bold">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Items Preview */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens ({cart.length})</label>
                            <div className="space-y-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 transition-all hover:border-slate-200">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className="text-xs font-bold text-slate-700 truncate">{item.nome}</p>
                                            <p className="text-[10px] text-slate-400">R$ {(item.preco_venda_centavos / 100).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-slate-600"><Minus size={12} /></button>
                                            <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-slate-600"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Obs */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Internas</label>
                            <textarea
                                className="input-glass min-h-[80px] py-3 text-xs"
                                placeholder="Notas sobre entrega, reserva ou condições..."
                                value={observacoes}
                                onChange={e => setObservacoes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-black text-slate-400">Total do Pedido</span>
                            <span className="text-2xl font-black text-brand-600">R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <button
                            onClick={handleSalvarPedido}
                            disabled={cart.length === 0 || saving}
                            className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <><Smartphone size={18} /> SALVAR COMO RASCUNHO</>}
                        </button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
