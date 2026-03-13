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
    DollarSign,
    Edit3,
    Trash2
} from "lucide-react";
import Link from "next/link";
import { getOrdensServico, updateOSStatus, deleteOS } from "@/services/os";
import { createClient } from "@/lib/supabase/client";
import { type OrdemServico, type OsStatus } from "@/types/database";
import { OSKanbanCard } from "@/components/os/OSKanbanCard";
import { EditOSModal } from "@/components/os/EditOSModal";
import { notifyOSStatusChange } from "@/actions/notifications";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

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
    const [selectedOS, setSelectedOS] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

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
        callback: () => {
            loadOS(true);
        }
    });

    const loadOS = async (background = false) => {
        if (!background) setLoading(true);
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
            if (!background) setLoading(false);
        }
    };

    async function handleDeleteOS(id: string) {
        try {
            await deleteOS(id);
            toast.success("OS excluída com sucesso.");
            loadOS();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir OS.");
        }
    }

    const handleEditOS = (os: any) => {
        setSelectedOS(os);
        setShowEditModal(true);
    };

    async function handleMoveStatus(osId: string, nextStatus: OsStatus) {
        if (!profile) return;
        try {
            await updateOSStatus(osId, nextStatus, profile.id, profile.empresa_id);
            notifyOSStatusChange(osId, nextStatus).catch(e => console.error("WhatsApp error:", e));
            loadOS();
            toast.success("Status atualizado!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar status.");
        }
    }

    return (
        <div className="space-y-6 page-enter pb-10">
            {/* Header com ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Ordens de Serviço</h1>
                    <p className="text-slate-500 text-xs md:text-sm">Gerencie todos os consertos e manutenções.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <Link
                        href="/os/nova"
                        className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex-1 sm:flex-initial"
                    >
                        <Plus size={20} />
                        <span className="whitespace-nowrap">Nova OS</span>
                    </Link>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={filterTecnico}
                            onChange={(e) => setFilterTecnico(e.target.value)}
                            className="w-full h-12 pl-10 pr-8 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-600 appearance-none"
                        >
                            <option value="">Técnicos</option>
                            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px] overflow-x-auto scrollbar-none bg-white rounded-2xl border border-slate-100 shadow-sm px-2">
                        <DateRangeFilter
                            onChange={(start, end) => {
                                setFilterStart(start || "");
                                setFilterEnd(end || "");
                            }}
                        />
                    </div>

                    <div className="flex h-12 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-auto ml-auto">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={cn(
                                "flex-1 sm:px-4 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all",
                                viewMode === "kanban" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <LayoutGrid size={16} /> <span className="hidden xs:inline">Kanban</span>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "flex-1 sm:px-4 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all",
                                viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <List size={16} /> <span className="hidden xs:inline">Lista</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            {loading ? (
                <div className="h-96 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : viewMode === "kanban" ? (
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
                    {STAGES.map((stage) => (
                        <div key={stage.status} className="flex-shrink-0 w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-6 rounded-full", stage.color)} />
                                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-tighter">{stage.label}</h3>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200">
                                        {orders.filter(o => o.status === stage.status).length}
                                    </span>
                                </div>
                            </div>

                            <div
                                className="flex-1 bg-slate-50/50 rounded-3xl p-3 border border-dashed border-slate-200 min-h-[500px]"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const osId = e.dataTransfer.getData("text/plain");
                                    if (osId) handleMoveStatus(osId, stage.status);
                                }}
                            >
                                {orders
                                    .filter(o => o.status === stage.status)
                                    .map(os => (
                                        <OSKanbanCard
                                            key={os.id}
                                            os={os}
                                            onClick={() => router.push(`/os/${os.id}`)}
                                            onMoveStatus={(id, status) => handleMoveStatus(id, status as OsStatus)}
                                            onDelete={handleDeleteOS}
                                            onEdit={() => handleEditOS(os)}
                                        />
                                    ))
                                }
                                {orders.filter(o => o.status === stage.status).length === 0 && (
                                    <div className="h-full flex items-center justify-center py-10 opacity-40">
                                        <p className="text-[10px] uppercase font-black text-slate-400">Vazio</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Número</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Equipamento</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Criada em</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Valor</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orders.map(os => {
                                const stage = STAGES.find(s => s.status === os.status);
                                return (
                                    <tr
                                        key={os.id}
                                        onClick={() => router.push(`/os/${os.id}`)}
                                        className="hover:bg-slate-50/80 cursor-pointer transition-all group"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">#{String(os.numero).padStart(4, '0')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 leading-none mb-1">{os.cliente?.nome}</span>
                                                <span className="text-[10px] text-slate-400">{os.cliente?.telefone || "Sem telefone"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 leading-none mb-1">{os.equipamento?.marca} {os.equipamento?.modelo}</span>
                                                <span className="text-[10px] text-slate-400">{os.problema_relatado?.substring(0, 30)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter", stage ? stage.color.replace('bg-', 'text-').replace('500', '700') + " " + stage.color.replace('500', '100') : "bg-slate-100 text-slate-700")}>
                                                {stage?.label || os.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar size={12} className="text-slate-300" />
                                                {new Date(os.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-sm font-black text-slate-800">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">R$</span>
                                                {(os.valor_total_centavos / 100).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditOS(os);
                                                    }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("Deseja excluir permanentemente esta OS?")) {
                                                            handleDeleteOS(os.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-all">
                                                    <ArrowRight size={18} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {orders.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center justify-center bg-slate-50/20">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <Search className="text-slate-200" size={32} />
                            </div>
                            <h3 className="text-slate-800 font-bold">Nenhuma OS encontrada</h3>
                            <p className="text-slate-400 text-sm">Tente ajustar sua busca ou filtros.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Edição */}
            {showEditModal && selectedOS && (
                <EditOSModal
                    os={selectedOS}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedOS(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedOS(null);
                        loadOS();
                    }}
                />
            )}
        </div>
    );
}
