"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Clock,
    User,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    MessageSquare,
    Package,
    ArrowRight,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSolicitacoes, criarSolicitacao, atualizarStatusSolicitacao, deletarSolicitacao } from "@/services/solicitacoes";
import { type Solicitacao } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import SolicitacaoModal from "@/components/solicitacoes/SolicitacaoModal";

export default function SolicitacoesPage() {
    const { profile } = useAuth();
    const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<Solicitacao["status"] | "todas">("todas");
    const [categoryFilter, setCategoryFilter] = useState<Solicitacao["categoria"] | "todas">("todas");
    const [priorityFilter, setPriorityFilter] = useState<Solicitacao["prioridade"] | "todas">("todas");
    const [sortBy, setSortBy] = useState<"created_at" | "data_vencimento" | "prioridade">("created_at");
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "kanban">("grid");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSolicitacoes();
            setSolicitacoes(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar solicitações");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useRealtimeSubscription({
        table: 'solicitacoes',
        callback: () => loadData()
    });

    const filteredSolicitacoes = solicitacoes
        .filter(s => {
            const matchesStatus = statusFilter === "todas" || s.status === statusFilter;
            const matchesCategory = categoryFilter === "todas" || s.categoria === categoryFilter;
            const matchesPriority = priorityFilter === "todas" || s.prioridade === priorityFilter;
            const matchesSearch = s.titulo.toLowerCase().includes(search.toLowerCase()) ||
                s.descricao?.toLowerCase().includes(search.toLowerCase()) ||
                s.nome_cliente?.toLowerCase().includes(search.toLowerCase());
            return matchesStatus && matchesCategory && matchesSearch && matchesPriority;
        })
        .sort((a, b) => {
            if (sortBy === "data_vencimento") {
                if (!a.data_vencimento) return 1;
                if (!b.data_vencimento) return -1;
                return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
            }
            if (sortBy === "prioridade") {
                const pMap: any = { urgente: 0, alta: 1, media: 2, baixa: 3 };
                return pMap[a.prioridade] - pMap[b.prioridade];
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    const handleUpdateStatus = async (id: string, newStatus: Solicitacao["status"]) => {
        try {
            await atualizarStatusSolicitacao(id, newStatus);
            toast.success("Status atualizado");
            loadData();
        } catch (error) {
            toast.error("Erro ao atualizar status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
        try {
            await deletarSolicitacao(id);
            toast.success("Solicitação excluída");
            loadData();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case "urgente": return "text-red-500 bg-red-500/10 border-red-500/20";
            case "alta": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
            case "media": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
            default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "concluido": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "em_andamento": return <Clock className="w-4 h-4 text-blue-500" />;
            case "arquivado": return <Package className="w-4 h-4 text-slate-400" />;
            default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Solicitações e Lembretes</h1>
                    <p className="text-slate-500 text-sm">Gerencie pedidos e avisos para evitar esquecimentos.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 transition-all font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Nova Solicitação
                </button>
            </div>

            <SolicitacaoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
            />

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative col-span-1 md:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                    />
                </div>
                <div>
                    <select
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none"
                    >
                        <option value="todas">Status: Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="arquivado">Arquivado</option>
                    </select>
                </div>
                <div>
                    <select
                        value={categoryFilter}
                        onChange={(e: any) => setCategoryFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none"
                    >
                        <option value="todas">Categoria: Todas</option>
                        <option value="pedido">Pedidos Internos</option>
                        <option value="aviso_cliente">Avisos a Clientes</option>
                        <option value="lembrete">Lembretes</option>
                        <option value="outro">Outros</option>
                    </select>
                </div>
                <div>
                    <select
                        value={priorityFilter}
                        onChange={(e: any) => setPriorityFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none font-medium"
                    >
                        <option value="todas">Prioridade: Todas</option>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">🔥 Urgente</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-[11px] font-bold uppercase tracking-tight appearance-none text-slate-600"
                    >
                        <option value="created_at">Ordenar: Recentes</option>
                        <option value="prioridade">Ordenar: Urgência</option>
                        <option value="data_vencimento">Ordenar: Vencimento</option>
                    </select>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                viewMode === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Quadro
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de Solicitações */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-slate-500 animate-pulse">Carregando solicitações...</p>
                </div>
            ) : filteredSolicitacoes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-900 font-medium">Nenhuma solicitação encontrada</p>
                    <p className="text-slate-500 text-sm mt-1">Crie uma nova para começar a organizar sua equipe.</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSolicitacoes.map((s) => (
                        <SolicitacaoCard
                            key={s.id}
                            s={s}
                            getStatusIcon={getStatusIcon}
                            getPriorityColor={getPriorityColor}
                            handleUpdateStatus={handleUpdateStatus}
                            handleDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] scrollbar-hide">
                    {["pendente", "em_andamento", "concluido", "arquivado"].map((status) => (
                        <div key={status} className="flex-none w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        status === 'pendente' ? "bg-amber-500" :
                                            status === 'em_andamento' ? "bg-blue-500" :
                                                status === 'concluido' ? "bg-emerald-500" : "bg-slate-400"
                                    )} />
                                    {status.replace('_', ' ')}
                                    <span className="text-slate-400 font-medium text-xs">
                                        ({filteredSolicitacoes.filter(sol => sol.status === status).length})
                                    </span>
                                </h3>
                            </div>

                            <div className="flex-1 space-y-4 p-2 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 min-h-[200px]">
                                {filteredSolicitacoes
                                    .filter(sol => sol.status === status)
                                    .map(s => (
                                        <SolicitacaoCard
                                            key={s.id}
                                            s={s}
                                            isCompact
                                            getStatusIcon={getStatusIcon}
                                            getPriorityColor={getPriorityColor}
                                            handleUpdateStatus={handleUpdateStatus}
                                            handleDelete={handleDelete}
                                        />
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SolicitacaoCard({ s, isCompact, getStatusIcon, getPriorityColor, handleUpdateStatus, handleDelete }: any) {
    return (
        <div key={s.id} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
            <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                    <div className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                        getPriorityColor(s.prioridade)
                    )}>
                        {s.prioridade}
                    </div>
                    {!isCompact && (
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                            {getStatusIcon(s.status)}
                            <span className="capitalize">{s.status.replace('_', ' ')}</span>
                        </div>
                    )}
                </div>

                <div>
                    {s.nome_cliente && (
                        <div className="flex items-center gap-1.5 text-brand-600 mb-1">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{s.nome_cliente}</span>
                        </div>
                    )}
                    <h3 className="font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors uppercase leading-tight">
                        {s.titulo}
                    </h3>
                    {s.descricao && (
                        <p className={cn(
                            "text-slate-500 text-sm",
                            isCompact ? "line-clamp-2 text-xs" : "line-clamp-3"
                        )}>{s.descricao}</p>
                    )}
                </div>

                {s.data_vencimento && (
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-medium",
                        new Date(s.data_vencimento) < new Date() && s.status !== 'concluido'
                            ? "bg-red-50 border-red-100 text-red-600"
                            : "bg-slate-50 border-slate-100 text-slate-600"
                    )}>
                        <Clock className="w-3 h-3" />
                        <span>
                            {new Date(s.data_vencimento) < new Date() && s.status !== 'concluido' ? 'Atrasado: ' : 'Vence: '}
                            {format(new Date(s.data_vencimento), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                    </div>
                )}


                {s.telefone_contato && !isCompact && (
                    <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold">{s.telefone_contato}</span>
                        </div>
                        <a
                            href={`https://wa.me/${s.telefone_contato.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Estou entrando em contato sobre: *${s.titulo}*\n\n${s.descricao || ''}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <ArrowRight className="w-3 h-3" />
                            WhatsApp
                        </a>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                            <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-1">Por</p>
                            <p className="text-xs font-bold text-slate-700 truncate">{s.usuario?.nome?.split(' ')[0] || 'Sistema'}</p>
                        </div>
                    </div>

                    {s.atribuido?.nome && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-brand-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-brand-400 leading-none mb-1 font-bold uppercase tracking-tight">Para</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{s.atribuido.nome.split(' ')[0]}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50/80 border-t border-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px]">{format(new Date(s.created_at), "dd/MM", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-1">
                    {s.status === 'pendente' && (
                        <button
                            onClick={() => handleUpdateStatus(s.id, 'em_andamento')}
                            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 transition-shadow shadow-sm"
                        >
                            Iniciar
                        </button>
                    )}
                    {s.status === 'em_andamento' && (
                        <button
                            onClick={() => handleUpdateStatus(s.id, 'concluido')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-shadow shadow-sm"
                        >
                            Concluir
                        </button>
                    )}
                    {s.status === 'concluido' && (
                        <button
                            onClick={() => handleUpdateStatus(s.id, 'arquivado')}
                            className="px-3 py-1.5 rounded-lg bg-slate-400 text-white text-[10px] font-bold hover:bg-slate-500 transition-shadow shadow-sm"
                        >
                            Arquivar
                        </button>
                    )}
                    <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
