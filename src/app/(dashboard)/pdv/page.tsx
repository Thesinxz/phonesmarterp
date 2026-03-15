"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, User, Package, CheckCircle2, Printer, History, Percent, Clock, Lock, DollarSign, LogOut, FileCode2, Receipt, Smartphone, RefreshCw, Keyboard } from "lucide-react";
import { finalizarVenda } from "@/services/vendas";
import { getCatalogItems } from "@/services/catalog";
import { getClientes } from "@/services/clientes";
import { getMembrosEquipe, type Usuario } from "@/services/equipe";
import { notifyVenda } from "@/actions/notifications";
import { getCaixaAberto, abrirCaixa, fecharCaixa, registrarMovimentacaoCaixa, getMovimentacoesCaixa } from "@/services/caixa";
import { type Cliente, type Caixa, type CatalogItem } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { CrediarioModal } from "@/components/financeiro/CrediarioModal";
import { CadastroRapidoClienteModal } from "@/components/clientes/CadastroRapidoClienteModal";
import { SaleProductSearch } from "@/components/sales/SaleProductSearch";
import { TradeInModal } from "@/components/sales/TradeInModal";
import { confirmTradeIn } from "@/app/actions/trade-in";

interface CartItem extends CatalogItem {
    quantity: number;
    imei_id: string | null;
    imei: string | null;
}

export default function PDVPage() {
    const { profile } = useAuth();
    const { defaultGateway } = useFinanceConfig();
    const [products, setProducts] = useState<CatalogItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [step, setStep] = useState(1);

    // Client selection
    const [searchClient, setSearchClient] = useState("");
    const [clients, setClients] = useState<Cliente[]>([]);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [showNewClientModal, setShowNewClientModal] = useState(false);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<string>("dinheiro");
    const [parcelas, setParcelas] = useState<number>(1);
    const [showCrediarioModal, setShowCrediarioModal] = useState<{ id: string, total: number, clienteId: string } | null>(null);
    const [descontoReais, setDescontoReais] = useState<number>(0);
    const [descontoPercentual, setDescontoPercentual] = useState<number>(0);
    const [valorRecebido, setValorRecebido] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [emitirNfce, setEmitirNfce] = useState(false);

    // Vendedor (Metas)
    const [membros, setMembros] = useState<Usuario[]>([]);
    const [selectedVendedor, setSelectedVendedor] = useState<string>("");

    // Caixa integration
    const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
    const [caixaLoading, setCaixaLoading] = useState(true);
    const [saldoInicialInput, setSaldoInicialInput] = useState("");
    const [showFecharCaixa, setShowFecharCaixa] = useState(false);
    const [saldoFinalInput, setSaldoFinalInput] = useState("");

    // Trade-in
    const [showTradeInModal, setShowTradeInModal] = useState(false);
    const [tradeIn, setTradeIn] = useState<{ 
        id: string, 
        device_name: string, 
        device_imei?: string, 
        applied_value: number, 
        condition: string 
    } | null>(null);

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

    // Realtime Sync
    useRealtimeSubscription({
        table: "catalog_items",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: (payload: any) => {
            if (payload.eventType === 'UPDATE') {
                setProducts(current => current.map(p =>
                    p.id === payload.new.id ? { ...p, ...payload.new } : p
                ));
            } else {
                loadProducts(searchTerm, true);
            }
        }
    });

    useEffect(() => {
        if (!profile?.empresa_id) {
            setLoading(false);
            setCaixaLoading(false);
            return;
        }
        loadProducts();
        checkCaixa();
        loadMembros();
    }, [profile?.empresa_id]);

    async function loadMembros() {
        if (!profile?.empresa_id) return;
        try {
            const data = await getMembrosEquipe(profile.empresa_id);
            setMembros(data);
            if (profile?.id) setSelectedVendedor(profile.id);
        } catch (error) {
            console.error("Erro ao carregar equipe:", error);
        }
    }

    async function checkCaixa() {
        if (!profile?.empresa_id) return;
        setCaixaLoading(true);
        try {
            const caixa = await getCaixaAberto(profile.empresa_id);
            setCaixaAberto(caixa);
        } catch (e) {
            console.error("Erro ao verificar caixa:", e);
        } finally {
            setCaixaLoading(false);
        }
    }

    async function handleAbrirCaixaPDV() {
        if (!profile) return;
        const valor = parseFloat(saldoInicialInput.replace(',', '.'));
        try {
            const caixa = await abrirCaixa(profile.empresa_id, profile.id, Math.round((valor || 0) * 100));
            setCaixaAberto(caixa);
            toast.success("Caixa aberto com sucesso!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao abrir caixa");
        }
    }

    async function handleFecharCaixaPDV() {
        if (!profile || !caixaAberto) return;
        const saldoFinal = Math.round(parseFloat(saldoFinalInput.replace(',', '.') || '0') * 100);
        const movs = await getMovimentacoesCaixa(caixaAberto.id);
        const totalEntradas = movs.filter((m: any) => m.tipo === 'entrada' || m.tipo === 'venda').reduce((s: number, m: any) => s + m.valor_centavos, 0);
        const totalSaidas = movs.filter((m: any) => m.tipo === 'saida' || m.tipo === 'sangria').reduce((s: number, m: any) => s + m.valor_centavos, 0);
        const esperado = (caixaAberto as any).saldo_inicial + totalEntradas - totalSaidas;
        const diferenca = saldoFinal - esperado;
        try {
            await fecharCaixa(caixaAberto.id, profile.id, saldoFinal, diferenca);
            setCaixaAberto(null);
            setShowFecharCaixa(false);
            toast.success("Caixa fechado com sucesso!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao fechar caixa");
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    async function loadProducts(search?: string, background = false) {
        if (!profile?.empresa_id) return;
        if (!background) setLoading(true);
        try {
            const data = await getCatalogItems(profile.empresa_id, { search, stock_status: 'in_stock' });
            setProducts(data);
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
        } finally {
            if (!background) setLoading(false);
        }
    }

    async function buscarClientes(term: string) {
        if (!profile?.empresa_id) return;
        if (term.length < 2) {
            setClients([]);
            return;
        }
        try {
            const { data } = await getClientes(1, 10, { search: term, empresa_id: profile.empresa_id });
            setClients(data);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
        }
    }

    const addToCart = (product: any) => {
        // Se for IMEI, a quantidade é sempre 1 e o ID deve ser único (pode ter vários do mesmo catalog_item mas IMEIs diferentes)
        const cartId = product.imeiId || product.id;

        setCart(prev => {
            const existing = prev.find(item => (item.imei_id || item.id) === cartId);
            
            if (existing) {
                if (product.imei) {
                    toast.error("Este aparelho (IMEI) já está no carrinho.");
                    return prev;
                }
                
                if (existing.quantity >= (product.stockQty || product.stock_qty)) {
                    toast.error(`Apenas ${product.stockQty || product.stock_qty} unidades disponíveis.`);
                    return prev;
                }
                
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            
            return [...prev, { 
                ...product, 
                id: product.id, // catalog_item_id
                sale_price: product.salePrice || product.sale_price,
                quantity: 1,
                imei_id: product.imeiId ?? null,
                imei: product.imei ?? null
            } as CartItem];
        });
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(item => (item.imei_id || item.id) !== cartId));
    };

    const updateQuantity = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if ((item.imei_id || item.id) === cartId) {
                if (item.imei_id) return item; // IMEI é sempre 1

                const maxStock = item.stock_qty;
                const newQtd = Math.max(1, item.quantity + delta);

                if (newQtd > maxStock) {
                    toast.error(`Apenas ${maxStock} unidades disponíveis.`);
                    return item;
                }

                return { ...item, quantity: newQtd };
            }
            return item;
        }));
    };

    // Cálculo Dinâmico de Totais
    const subtotal = cart.reduce((acc, item) => acc + (item.sale_price * item.quantity), 0);
    const tradeInValue = tradeIn ? tradeIn.applied_value : 0;
    const subtotalComDesconto = Math.max(0, subtotal - (descontoReais * 100) - tradeInValue);

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
                    nfce_chave: emitirNfce ? "PENDENTE" : null,
                    observacoes: taxaGatewayCentavos > 0 ? `Taxa Gateway: R$ ${(taxaGatewayCentavos / 100).toFixed(2)}` : "",
                    vendedor_id: selectedVendedor || profile.id,
                    canal_origem: "pdv",
                },
                itens: cart.map(item => ({
                    empresa_id: profile.empresa_id,
                    produto_id: item.id,
                    quantidade: item.quantity,
                    preco_unitario_centavos: item.sale_price,
                    total_centavos: item.sale_price * item.quantity,
                    imei_id: item.imei_id,
                    imei: item.imei
                })),
                usuarioId: profile.id
            });

            // Se houver trade-in, confirmar agora vinculado a esta venda
            if (tradeIn) {
                try {
                    await confirmTradeIn({
                        tenantId: profile.empresa_id,
                        tradeInId: tradeIn.id,
                        saleId: venda.id,
                        unitId: profile.unit_id || "matriz",
                        confirmedBy: profile.id
                    });
                } catch (e) {
                    console.error("Erro ao confirmar trade-in:", e);
                    toast.error("Venda realizada, mas houve um erro ao processar a entrada do aparelho de trade-in.");
                }
            }

            setCreatedVenda({ id: venda.id, numero: venda.numero });

            // Registrar movimentação no caixa
            if (caixaAberto && paymentMethod !== 'crediario') {
                try {
                    await registrarMovimentacaoCaixa({
                        caixa_id: caixaAberto.id,
                        empresa_id: profile.empresa_id,
                        usuario_id: profile.id,
                        tipo: 'venda',
                        valor_centavos: total,
                        observacao: `Venda #${venda.numero || venda.id.substring(0, 6)} - ${paymentMethod}`,
                        forma_pagamento: paymentMethod,
                        vendedor_id: selectedVendedor || profile.id,
                        origem_id: venda.id,
                    });
                } catch (e) {
                    console.error("Erro ao registrar movimentação:", e);
                }
            }

            // Notificar via WhatsApp (background)
            if (selectedClient?.telefone) {
                notifyVenda(venda.id).catch(e => console.error("WhatsApp error:", e));
            }
            if (paymentMethod === 'crediario') {
                // Ao invés de exibir modal de sucesso agora, exibe modal de parcelamento
                setShowCrediarioModal({
                    id: venda.id,
                    total: total,
                    clienteId: selectedClient?.id || "",
                });
                return; // para não limpar o carrinho ainda
            } else {
                setCreatedVenda({ id: venda.id, numero: venda.numero });
            }

            setCart([]);
            setSelectedClient(null);
            setSearchClient("");
            setPaymentMethod("dinheiro");
            setParcelas(1);
            setTradeIn(null);
            setDescontoReais(0);

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

    // === Tela de bloqueio se caixa não está aberto ===
    if (caixaLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!caixaAberto) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)] page-enter">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Caixa Fechado</h2>
                    <p className="text-slate-500 text-sm mb-8">Para iniciar as vendas, abra o caixa informando o saldo inicial.</p>
                    <GlassCard className="p-6 text-left">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Saldo Inicial (R$)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={saldoInicialInput}
                            onChange={e => setSaldoInicialInput(e.target.value)}
                            placeholder="0,00"
                            className="w-full text-center text-3xl font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 mb-4"
                            onKeyDown={e => e.key === 'Enter' && handleAbrirCaixaPDV()}
                        />
                        <button
                            onClick={handleAbrirCaixaPDV}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <DollarSign size={18} />
                            Abrir Caixa e Iniciar Vendas
                        </button>
                    </GlassCard>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-100px)] page-enter">
            {/* Header com os Passos */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex gap-4 items-center">
                    <h1 className="text-2xl font-bold text-slate-800">PDV</h1>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-brand-500 text-white' : step > s ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                                {s}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowFecharCaixa(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100">
                        <LogOut size={14} /> Fechar Caixa
                    </button>
                    <div className="flex flex-col items-end bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Operação</span>
                        <div className="flex items-center gap-2 text-slate-700 font-mono font-bold text-xs">
                            <Clock size={12} className="text-brand-500" />
                            {currentTime.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Passo 1: Informar Cliente */}
            {step === 1 && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <GlassCard className="w-full max-w-4xl p-8 flex flex-col gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">1. Identificação do Cliente</h2>
                            <p className="text-slate-500">Busque ou cadastre um cliente, ou prossiga como consumidor final.</p>
                        </div>

                        <div className="relative z-50">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                className="input-glass pl-12 h-14 text-lg font-bold w-full"
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
                                            className="w-full text-left px-4 py-3 hover:bg-brand-50 hover:text-brand-700 transition-all border-b border-slate-50 flex flex-col group"
                                        >
                                            <span className="font-bold">{c.nome}</span>
                                            <span className="text-[10px] text-slate-400 group-hover:text-brand-400">{c.telefone || "Sem celular"}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setShowNewClientModal(true)} className="flex-1 py-4 btn-secondary flex items-center justify-center gap-2">
                                <Plus size={18} /> Novo Cliente
                            </button>
                            <button onClick={() => setStep(2)} className="flex-1 py-4 btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30">
                                {selectedClient ? "Avançar para Produtos" : "Consumidor Final (Avançar)"}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Passo 2: Seleção de Produtos */}
            {step === 2 && (
                <div className="flex gap-6 h-full min-h-0">
                    {/* Busca Unificada e Lista de Produtos */}
                    <div className="flex-1 flex flex-col gap-6">
                        <SaleProductSearch 
                            tenantId={profile?.empresa_id || ""}
                            unitId={profile?.unit_id || "matriz"}
                            userRole={(profile?.papel as string) === 'admin' ? 'owner' : (profile?.papel as string) === 'admin' ? 'admin' : 'attendant'}
                            onProductSelected={addToCart}
                        />

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowTradeInModal(true)}
                                className={cn(
                                    "flex-1 h-14 flex items-center justify-center gap-3 rounded-2xl border-2 transition-all font-bold",
                                    tradeIn 
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                        : "border-slate-100 bg-white hover:border-brand-200 text-slate-600"
                                )}
                            >
                                <RefreshCw size={20} className={tradeIn ? "text-emerald-500 animate-spin-slow" : "text-slate-400"} />
                                {tradeIn ? "Trade-in Adicionado" : "Adicionar Trade-in (Entrada)"}
                            </button>
                        </div>
                        
                        {/* Texto de Ajuda */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-2">
                                <Keyboard size={14} className="text-slate-300" />
                                [F2] FOCO NA BUSCA
                            </span>
                            <span className="flex items-center gap-2">
                                <Plus size={14} className="text-slate-300" />
                                ADICIONE ITENS ESCANEANDO OU BUSCANDO
                            </span>
                        </div>
                    </div>

                    {/* Carrinho Resumo */}
                    <GlassCard className="w-[350px] flex flex-col p-4 bg-slate-50">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-brand-500" /> Carrinho ({cart.length})</h3>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin">
                            {cart.length === 0 ? (
                                <p className="text-xs text-center text-slate-400 py-10">Use a lista ao lado para adicionar produtos.</p>
                            ) : (
                                cart.map(item => (
                                    <div key={item.imei_id || item.id} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative group">
                                        <div className="flex items-start gap-2 pr-6">
                                            {item.imei_id && <Smartphone size={14} className="text-brand-500 mt-1 shrink-0" />}
                                            <div className="flex flex-col">
                                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</p>
                                                {item.imei && <p className="text-[9px] font-mono text-slate-400">IMEI: {item.imei}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                {!item.imei_id ? (
                                                    <>
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md text-slate-500"><Minus size={12} /></button>
                                                        <span className="w-8 text-center text-xs font-black text-slate-700">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md text-slate-500"><Plus size={12} /></button>
                                                    </>
                                                ) : (
                                                    <span className="px-2 text-[10px] font-black text-slate-400">QTD: 1</span>
                                                )}
                                            </div>
                                            <span className="text-sm font-black text-slate-700">R$ {((item.sale_price * item.quantity) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button onClick={() => removeFromCart(item.imei_id || item.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}

                            {tradeIn && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 relative group animate-in slide-in-from-right-2">
                                    <div className="flex items-start gap-2 pr-6">
                                        <RefreshCw size={14} className="text-emerald-600 mt-1 shrink-0" />
                                        <div className="flex flex-col">
                                            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">Entrada (Trade-in)</p>
                                            <p className="text-xs font-bold text-emerald-900 line-clamp-1">{tradeIn.device_name}</p>
                                            {tradeIn.device_imei && <p className="text-[9px] font-mono text-emerald-600">IMEI: {tradeIn.device_imei}</p>}
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-1">
                                        <span className="text-sm font-black text-emerald-700">- R$ {(tradeIn.applied_value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <button onClick={() => setTradeIn(null)} className="absolute top-2 right-2 text-emerald-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-slate-200 pt-4 space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Subtotal</span>
                                <span className="text-2xl font-black text-brand-600">R$ {(subtotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="w-12 h-12 flex items-center justify-center btn-secondary rounded-xl text-slate-400 hover:text-slate-600">
                                    Voltar
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={cart.length === 0}
                                    className="flex-1 h-12 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-black transition-all shadow-xl"
                                >
                                    Ir para Pagamento (F10)
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Passo 3: Pagamento */}
            {step === 3 && (
                <div className="flex-1 flex gap-6">
                    <div className="flex-1">
                        <GlassCard className="h-full p-6 flex flex-col space-y-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2"><CreditCard size={20} className="text-brand-500" /> 3. Forma de Pagamento</h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'dinheiro', icon: Banknote, label: 'Dinheiro', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                    { id: 'pix', icon: QrCode, label: 'PIX', color: 'text-teal-500', bg: 'bg-teal-50' },
                                    { id: 'debito', icon: CreditCard, label: 'Débito', color: 'text-blue-500', bg: 'bg-blue-50' },
                                    { id: 'credito', icon: CreditCard, label: 'Crédito', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                    { id: 'crediario', icon: History, label: 'Crediário (Fiado)', color: 'text-amber-500', bg: 'bg-amber-50' }
                                ].map(metodo => (
                                    <button
                                        key={metodo.id}
                                        onClick={() => setPaymentMethod(metodo.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all h-24",
                                            paymentMethod === metodo.id
                                                ? `border-brand-500 bg-brand-50 shadow-sm`
                                                : "border-slate-100 hover:border-brand-200 bg-white"
                                        )}
                                    >
                                        <metodo.icon size={28} className={paymentMethod === metodo.id ? "text-brand-600" : "text-slate-400"} />
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", paymentMethod === metodo.id ? "text-brand-700" : "text-slate-500")}>
                                            {metodo.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'credito' && (
                                <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número de Parcelas</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 10, 12].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setParcelas(p)}
                                                className={cn(
                                                    "px-2 py-3 rounded-lg text-sm font-black transition-all border",
                                                    parcelas === p
                                                        ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}
                                            >
                                                {p}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><Percent size={12} /> Desconto em R$</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={descontoReais || ""}
                                        onChange={e => setDescontoReais(parseFloat(e.target.value) || 0)}
                                        className="input-glass w-full h-12 text-lg font-bold"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-brand-50 hover:border-brand-200 transition-colors group">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-slate-700 group-hover:text-brand-700">Emitir NFC-e Automaticamente</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Deixa a NFC-e pronta na finalização</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                            checked={emitirNfce}
                                            onChange={e => setEmitirNfce(e.target.checked)}
                                        />
                                    </label>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    <GlassCard className="w-[350px] flex flex-col p-6 bg-slate-900 text-white border-none shadow-2xl">
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-8">Resumo da Compra</h3>

                        <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Cliente</span>
                                <span className="font-bold text-slate-100">{selectedClient?.nome || "Consumidor Final"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Subtotal ({cart.length} itens)</span>
                                <span className="font-bold text-slate-100">R$ {(subtotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {descontoReais > 0 && (
                                <div className="flex justify-between items-center text-sm text-red-400 font-bold">
                                    <span>Desconto</span>
                                    <span>- R$ {descontoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {tradeIn && (
                                <div className="flex justify-between items-center text-sm text-emerald-400 font-bold">
                                    <span>Trade-in ({tradeIn.device_name})</span>
                                    <span>- R$ {(tradeIn.applied_value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {taxaGatewayCentavos > 0 && (
                                <div className="flex justify-between items-center text-sm text-amber-400 font-bold">
                                    <span>Taxa ({paymentMethod})</span>
                                    <span>+ R$ {(taxaGatewayCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-700 pt-6 mt-6 space-y-4">
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-400 uppercase tracking-widest font-black mb-1">Total a Pagar</span>
                                <span className="text-4xl font-black text-emerald-400">
                                    R$ {(total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            {paymentMethod === 'dinheiro' && (
                                <div className="space-y-2 mt-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Recebido do Cliente (R$)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={valorRecebido || ""}
                                        onChange={e => setValorRecebido(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg h-10 px-3 text-sm font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                        placeholder="0.00"
                                    />
                                    {troco > 0 && (
                                        <div className="flex justify-between items-center mt-2 text-sm bg-emerald-900/40 p-2 rounded-lg border border-emerald-500/20">
                                            <span className="text-emerald-400 font-bold">Troco</span>
                                            <span className="text-emerald-300 font-black">R$ {(troco / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all">
                                    Voltar
                                </button>
                                <button
                                    onClick={async () => {
                                        await handleFinalizar();
                                        if (paymentMethod !== 'crediario') setStep(4);
                                    }}
                                    disabled={finishing || cart.length === 0}
                                    className="flex-[2] py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {finishing ? "SALVANDO..." : "CONCLUIR"}
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
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Venda Concluída!</h2>
                    <p className="text-slate-500 mb-8 max-w-sm text-center">Tudo certo com o pedido. O que você deseja fazer agora?</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-6xl">
                        <button className="glass-card flex flex-col items-center justify-center p-6 gap-3 hover:border-brand-500 hover:text-brand-600 transition-all group">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                                <Receipt size={24} />
                            </div>
                            <span className="font-bold text-sm">Recibo 80mm</span>
                        </button>

                        <button className="glass-card flex flex-col items-center justify-center p-6 gap-3 hover:border-brand-500 hover:text-brand-600 transition-all group">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                                <Printer size={24} />
                            </div>
                            <span className="font-bold text-sm">Imprimir A4</span>
                        </button>

                        <button onClick={() => {
                            if (!selectedClient?.telefone) alert("Cliente sem telefone!");
                            else window.open(`https://wa.me/55${selectedClient.telefone.replace(/\D/g, "")}?text=Olá! Segue o recibo da sua compra...`, "_blank");
                        }} className="glass-card flex flex-col items-center justify-center p-6 gap-3 hover:border-emerald-500 hover:text-emerald-600 transition-all group">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors text-slate-500">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                            </div>
                            <span className="font-bold text-sm">WhatsApp</span>
                        </button>

                        <button onClick={handleEmitirNFCe} disabled={finishing} className="glass-card flex flex-col items-center justify-center p-6 gap-3 hover:border-amber-500 hover:text-amber-600 transition-all group disabled:opacity-50">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                                <FileCode2 size={24} />
                            </div>
                            <span className="font-bold text-sm">Emitir NFC-e</span>
                        </button>
                    </div>

                    <div className="mt-10">
                        <button onClick={() => {
                            setStep(1);
                        }} className="btn-primary px-10 py-4 rounded-full font-black tracking-widest uppercase shadow-xl hover:scale-105 transition-all">
                            INICIAR NOVA VENDA (ESC)
                        </button>
                    </div>
                </div>
            )}

            {/* Modals Originais */}
            {showFecharCaixa && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Fechar Caixa Diário</h2>
                        <input
                            type="text"
                            value={saldoFinalInput}
                            onChange={e => setSaldoFinalInput(e.target.value)}
                            placeholder="Saldo em Gaveta (R$)"
                            className="input-glass mb-4 text-center font-bold text-lg h-12"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowFecharCaixa(false)} className="flex-1 h-12 rounded-xl text-slate-500 hover:bg-slate-100 font-bold">
                                Cancelar
                            </button>
                            <button onClick={handleFecharCaixaPDV} className="flex-1 h-12 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20">
                                Fechar Caixa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCrediarioModal && (
                <CrediarioModal
                    vendaId={showCrediarioModal.id}
                    valorInicial={showCrediarioModal.total}
                    clienteInicial={showCrediarioModal.clienteId}
                    onClose={() => setShowCrediarioModal(null)}
                    onCreated={() => {
                        setShowCrediarioModal(null);
                        setStep(4);
                    }}
                />
            )}

            {showNewClientModal && (
                <CadastroRapidoClienteModal
                    onClose={() => setShowNewClientModal(false)}
                    initialName={searchClient}
                    onSuccess={(novoCliente) => {
                        setSelectedClient(novoCliente);
                        setSearchClient("");
                        setShowNewClientModal(false);
                    }}
                />
            )}

            {showTradeInModal && profile && (
                <TradeInModal 
                    tenantId={profile.empresa_id}
                    unitId={profile.unit_id || "matriz"}
                    clienteId={selectedClient?.id}
                    onClose={() => setShowTradeInModal(false)}
                    onApplied={(data) => {
                        setTradeIn(data);
                        setShowTradeInModal(false);
                    }}
                />
            )}
        </div>
    );

}
