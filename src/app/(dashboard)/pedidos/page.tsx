"use client";

import { useState, useEffect } from "react";
import {
    ClipboardCheck,
    Search,
    Plus,
    Filter,
    MoreHorizontal,
    Calendar,
    User,
    Package,
    ArrowRight,
    Loader2
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getVendas, atualizarStatusPedido } from "@/services/vendas";
import { notifyPedidoStatus } from "@/actions/notifications";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PedidoMenuDropdown } from "@/components/pedidos/PedidoMenuDropdown";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

const STATUS_CONFIG = {
    rascunho: { label: "Rascunho", color: "bg-slate-100 text-slate-600" },
    aguardando_aprovacao: { label: "Aguar. Aprovação", color: "bg-amber-100 text-amber-700" },
    aprovado: { label: "Aprovado", color: "bg-blue-100 text-blue-700" },
    separando: { label: "Separando", color: "bg-purple-100 text-purple-700" },
    enviado: { label: "Enviado", color: "bg-indigo-100 text-indigo-700" },
    entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-700" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" }
};

export default function PedidosPage() {
    const { profile } = useAuth();
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("todos");
    const [searchTerm, setSearchTerm] = useState("");

    useRealtimeSubscription({
        table: 'vendas',
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: () => loadData()
    });

    useEffect(() => {
        if (!profile?.empresa_id) return;
        const timer = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, [activeTab, searchTerm, profile?.empresa_id]);

    async function loadData() {
        setLoading(true);
        try {
            const response = await getVendas(1, 50, {
                tipo: "pedido",
                status: activeTab === "todos" ? undefined : activeTab,
                search: searchTerm
            });
            setPedidos(response.data || []);
        } catch (error) {
            console.error("Erro ao carregar pedidos:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(id: string, newStatus: string) {
        if (!profile) return;
        try {
            await atualizarStatusPedido(id, newStatus as any, profile.id);
            // Notifica via WhatsApp (background)
            notifyPedidoStatus(id, newStatus).catch(e => console.error("WhastApp Notify Error:", e));
            loadData();
        } catch (error) {
            alert("Erro ao atualizar status");
        }
    }

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800">Pedidos de Venda</h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-0.5">Gerencie orçamentos e vendas remotas</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Link href="/pedidos/novo" className="btn-primary flex items-center gap-2 flex-1 sm:flex-initial justify-center">
                        <Plus size={18} />
                        <span className="whitespace-nowrap">Novo Pedido</span>
                    </Link>
                </div>
            </div>

            {/* Quick Stats / Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {["todos", "rascunho", "aguardando_aprovacao", "aprovado", "separando", "entregue", "cancelado"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-2",
                            activeTab === tab
                                ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                : "bg-white border-white text-slate-500 hover:border-slate-200"
                        )}
                    >
                        {tab === "todos" ? "Todos os Pedidos" : STATUS_CONFIG[tab as keyof typeof STATUS_CONFIG]?.label || tab}
                    </button>
                ))}
            </div>

            {/* Search and List */}
            <div className="grid grid-cols-1 gap-6">
                <GlassCard className="p-4 flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            className="input-glass pl-10"
                            placeholder="Buscar pedido por cliente, id ou canal..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn-secondary px-4 py-2 flex items-center gap-2">
                        <Filter size={16} /> Filtros
                    </button>
                </GlassCard>

                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                        <Loader2 className="animate-spin" size={32} />
                        <p className="font-medium">Carregando seus pedidos...</p>
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="glass-card py-20 flex flex-col items-center gap-4 text-slate-300 border-dashed border-2 border-slate-200">
                        <ClipboardCheck size={64} className="opacity-10" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum pedido encontrado nesta fase</p>
                        <Link href="/pedidos/novo" className="text-brand-600 font-bold hover:underline">Criar primeiro pedido</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pedidos.map((pedido) => (
                            <div key={pedido.id} className="glass-card p-0 flex flex-col group hover:shadow-glass-lg transition-all overflow-visible border-brand-100/20">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-[10px] font-bold text-slate-400">#{pedido.id.substring(0, 8)}</span>
                                            <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter", STATUS_CONFIG[pedido.status_pedido as keyof typeof STATUS_CONFIG]?.color)}>
                                                {STATUS_CONFIG[pedido.status_pedido as keyof typeof STATUS_CONFIG]?.label}
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <User size={14} className="text-slate-400" />
                                            {pedido.cliente?.nome || "Consumidor Final"}
                                        </h3>
                                    </div>
                                    <PedidoMenuDropdown
                                        pedidoId={pedido.id}
                                        telefoneCliente={pedido.cliente?.telefone}
                                        onCancel={(id) => handleStatusChange(id, "cancelado")}
                                    />
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal / Data</p>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{pedido.canal_venda || "Balcão"}</span>
                                                <Calendar size={12} /> {formatDate(pedido.created_at)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                            <p className="text-xl font-black text-brand-600">R$ {(pedido.total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* Action Pipeline */}
                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
                                        {pedido.status_pedido === "rascunho" && (
                                            <button
                                                onClick={() => handleStatusChange(pedido.id, "aguardando_aprovacao")}
                                                className="w-full btn-primary text-[10px] justify-center"
                                            >
                                                ENVIAR P/ APROVAÇÃO <ArrowRight size={12} />
                                            </button>
                                        )}
                                        {pedido.status_pedido === "aguardando_aprovacao" && (
                                            <button
                                                onClick={() => handleStatusChange(pedido.id, "aprovado")}
                                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-tight shadow-emerald- glow"
                                            >
                                                APROVAR PEDIDO
                                            </button>
                                        )}
                                        {pedido.status_pedido === "aprovado" && (
                                            <button
                                                onClick={() => handleStatusChange(pedido.id, "separando")}
                                                className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl py-2.5 text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-tight shadow-purple-glow"
                                            >
                                                <Package size={14} /> INICIAR SEPARAÇÃO
                                            </button>
                                        )}
                                        {pedido.status_pedido === "separando" && (
                                            <button
                                                onClick={() => handleStatusChange(pedido.id, "entregue")}
                                                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-[10px] font-black flex items-center justify-center gap-2 uppercase tracking-tight shadow-indigo-glow"
                                            >
                                                MARCAR ENTREGA
                                            </button>
                                        )}
                                        {pedido.status_pedido === "entregue" && (
                                            <div className="w-full text-center text-[10px] font-black text-emerald-600 py-2.5 bg-emerald-50 rounded-xl uppercase tracking-widest">
                                                CONCLUÍDO E ENTREGUE
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
