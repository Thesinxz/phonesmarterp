"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    Filter,
    LayoutGrid,
    List,
    MoreHorizontal,
    ArrowRight,
    Calendar,
    User as UserIcon,
    DollarSign
} from "lucide-react";
import Link from "next/link";
import { getOrdensServico, updateOSStatus } from "@/services/os";
import { createClient } from "@/lib/supabase/client";
import { type OrdemServico, type OsStatus } from "@/types/database";
import { OSKanbanCard } from "@/components/os/OSKanbanCard";
import { notifyOSStatusChange } from "@/actions/notifications";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

const STAGES: { label: string; status: OsStatus; color: string }[] = [
    { label: "Abertas", status: "aberta", color: "bg-slate-500" },
    { label: "Em Análise", status: "em_analise", color: "bg-blue-500" },
    { label: "Aguardando Peça", status: "aguardando_peca", color: "bg-amber-500" },
    { label: "Em Execução", status: "em_execucao", color: "bg-purple-500" },
    { label: "Finalizadas", status: "finalizada", color: "bg-emerald-500" },
    { label: "Canceladas", status: "cancelada", color: "bg-red-500" },
];

export default function OSPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

    // Search and Filters
    const [search, setSearch] = useState("");
    const [filterTecnico, setFilterTecnico] = useState("");
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadOS();
    }, [profile?.empresa_id, currentPage, viewMode, filterTecnico, filterStart, filterEnd]);

    // Busca com debounce simples
    useEffect(() => {
        const timer = setTimeout(() => {
            if (profile?.empresa_id) loadOS();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadTecnicos();
        }
    }, [profile?.empresa_id]);

    async function loadTecnicos() {
        if (!profile?.empresa_id) return;
        const supabase = createClient();
        const { data } = await supabase.from('usuarios').select('id, nome').eq('empresa_id', profile.empresa_id);
        setTecnicos(data || []);
    }

    useRealtimeSubscription({
        table: "ordens_servico",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: (payload: any) => {
            console.log("Realtime OS:", payload.eventType, payload);
            const supabase = createClient();

            if (payload.eventType === 'INSERT') {
                supabase
                    .from('ordens_servico')
                    .select('*, cliente:clientes(nome), equipamento:equipamentos(marca, modelo), tecnico:usuarios(nome)')
                    .eq('id', payload.new.id)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setOrders(current => {
                                if (current.some(o => o.id === (data as any).id)) return current;
                                return [data, ...current];
                            });
                        }
                    });
            } else if (payload.eventType === 'UPDATE') {
                setOrders(current => current.map(os =>
                    os.id === payload.new.id ? { ...os, ...payload.new } : os
                ));

                supabase
                    .from('ordens_servico')
                    .select('*, cliente:clientes(nome), equipamento:equipamentos(marca, modelo), tecnico:usuarios(nome)')
                    .eq('id', payload.new.id)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            setOrders(current => current.map(os =>
                                os.id === (data as any).id ? data : os
                            ));
                        }
                    });
            } else if (payload.eventType === 'DELETE') {
                setOrders(current => current.filter(os => os.id !== payload.old.id));
            }
        }
    });

    async function loadOS() {
        setLoading(true);
        try {
            const limit = viewMode === "kanban" ? 100 : 20;
            const filters = {
                search: search || undefined,
                tecnico_id: filterTecnico || undefined,
                startDate: filterStart || undefined,
                endDate: filterEnd || undefined
            };
            const response = await getOrdensServico(currentPage, limit, filters);
            setOrders(response.data);
            setTotalPages(response.totalPages);
            setTotalItems(response.count);
        } catch (error) {
            console.error("Erro ao carregar OS:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleMoveStatus(osId: string, nextStatus: OsStatus) {
        if (!profile) return;
        try {
            await updateOSStatus(osId, nextStatus, profile.id, profile.empresa_id);

            // Enviar notificação em background
            notifyOSStatusChange(osId, nextStatus).catch((err: any) => console.error("Falha notificação:", err));

            loadOS();
        } catch (error) {
            console.error("Erro ao mover OS:", error);
        }
    }

    return (
        <div className="space-y-6 page-enter h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ordens de Serviço</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Gerencie o fluxo de manutenção</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white/60 p-1 rounded-xl border border-white/60 flex h-10 shadow-sm">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`px-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={16} />
                            Kanban
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} />
                            Lista
                        </button>
                    </div>
                    <Link href="/os/nova" className="btn-primary">
                        <Plus size={18} />
                        Nova OS
                    </Link>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/60 shadow-sm">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        placeholder="Buscar por cliente, equipamento, IMEI..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterTecnico}
                            onChange={(e) => setFilterTecnico(e.target.value)}
                            className="bg-white/60 border border-slate-200/60 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold uppercase tracking-tight text-slate-600 focus:outline-none appearance-none cursor-pointer hover:bg-white transition-all"
                        >
                            <option value="">Todos Técnicos</option>
                            {tecnicos.map(t => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 bg-white/60 border border-slate-200/60 rounded-xl px-2 py-0.5">
                        <Calendar size={14} className="text-slate-400 ml-1" />
                        <input
                            type="date"
                            value={filterStart}
                            onChange={(e) => setFilterStart(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none py-1.5"
                        />
                        <span className="text-slate-300">|</span>
                        <input
                            type="date"
                            value={filterEnd}
                            onChange={(e) => setFilterEnd(e.target.value)}
                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none py-1.5"
                        />
                    </div>
                </div>

                <button
                    onClick={() => {
                        setSearch("");
                        setFilterTecnico("");
                        setFilterStart("");
                        setFilterEnd("");
                    }}
                    className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors px-2"
                >
                    Limpar
                </button>
            </div>

            {/* Kanban Content */}
            {/* Kanban Content */}
            {viewMode === "kanban" ? (
                <div className="flex-1 overflow-x-auto pb-6 scrollbar-thin">
                    <div className="flex gap-6 min-w-max h-full">
                        {STAGES.map((stage) => (
                            <div
                                key={stage.status}
                                className="w-72 flex flex-col h-full group"
                                onDragOver={(e) => {
                                    e.preventDefault(); // Necessário para permitir o drop
                                    e.currentTarget.querySelector('.drop-zone')?.classList.add('bg-slate-200/50');
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.querySelector('.drop-zone')?.classList.remove('bg-slate-200/50');
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.querySelector('.drop-zone')?.classList.remove('bg-slate-200/50');
                                    const osId = e.dataTransfer.getData("text/plain");
                                    if (osId) {
                                        handleMoveStatus(osId, stage.status);
                                        // Update UI optimistically
                                        setOrders(prev => prev.map(o => o.id === osId ? { ...o, status: stage.status } : o));
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
                                            {stage.label}
                                        </h3>
                                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                            {orders.filter(o => o.status === stage.status).length}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-brand-600 flex items-center gap-1">
                                            <DollarSign size={10} />
                                            {(orders.filter(o => o.status === stage.status).reduce((acc, curr) => acc + (curr.valor_total_centavos || 0), 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>

                                <div className="drop-zone flex-1 bg-slate-100/50 rounded-2xl p-2 border-2 border-dashed border-transparent group-hover:border-slate-200 transition-all overflow-y-auto scrollbar-none min-h-[150px]">
                                    {orders
                                        .filter(o => o.status === stage.status)
                                        .map(os => (
                                            <OSKanbanCard
                                                key={os.id}
                                                os={os}
                                                onClick={() => router.push(`/os/${os.id}`)}
                                                onMoveStatus={(id, status) => handleMoveStatus(id, status as OsStatus)}
                                            />
                                        ))
                                    }

                                    {orders.filter(o => o.status === stage.status).length === 0 && (
                                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                                            Nenhuma OS aqui
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="glass-card overflow-hidden p-0 flex flex-col h-full">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold">OS / Data</th>
                                    <th className="px-6 py-4 font-bold">Cliente</th>
                                    <th className="px-6 py-4 font-bold">Aparelho</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Valor</th>
                                    <th className="px-6 py-4 font-bold text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && orders.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Carregando...</td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhuma OS encontrada.</td></tr>
                                ) : (
                                    orders.map((os) => (
                                        <tr key={os.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4" onClick={() => router.push(`/os/${os.id}`)}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 flex items-center gap-2">#{os.numero ? String(os.numero).padStart(5, '0') : os.id.substring(0, 6)}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(os.created_at).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700" onClick={() => router.push(`/os/${os.id}`)}>{os.cliente?.nome || "-"}</td>
                                            <td className="px-6 py-4 text-slate-600" onClick={() => router.push(`/os/${os.id}`)}>{os.equipamento?.marca} {os.equipamento?.modelo}</td>
                                            <td className="px-6 py-4" onClick={() => router.push(`/os/${os.id}`)}>
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white ${STAGES.find(s => s.status === os.status)?.color || 'bg-slate-500'}`}>
                                                    {STAGES.find(s => s.status === os.status)?.label || os.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700" onClick={() => router.push(`/os/${os.id}`)}>
                                                {(os.valor_total_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {os.status === 'aberta' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStatus(os.id, 'em_analise'); }}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                            title="Iniciar Análise"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                    {os.status === 'em_analise' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStatus(os.id, 'em_execucao'); }}
                                                            className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                                                            title="Iniciar Execução"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                    {(os.status === 'em_execucao' || os.status === 'aguardando_peca') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleMoveStatus(os.id, 'finalizada'); }}
                                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                            title="Finalizar"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 mt-auto bg-slate-50/30">
                            <span className="text-sm text-slate-500">
                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (Total de {totalItems} OS)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
