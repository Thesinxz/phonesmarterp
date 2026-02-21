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
    const [filter, setFilter] = useState<Solicitacao["status"] | "todas">("todas");
    const [categoryFilter, setCategoryFilter] = useState<Solicitacao["categoria"] | "todas">("todas");
    const [search, setSearch] = useState("");
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

    const filteredSolicitacoes = solicitacoes.filter(s => {
        const matchesStatus = filter === "todas" || s.status === filter;
        const matchesCategory = categoryFilter === "todas" || s.categoria === categoryFilter;
        const matchesSearch = s.titulo.toLowerCase().includes(search.toLowerCase()) ||
            s.descricao?.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesCategory && matchesSearch;
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative col-span-1 md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                    />
                </div>
                <div>
                    <select
                        value={filter}
                        onChange={(e: any) => setFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none"
                    >
                        <option value="todas">Todos os Status</option>
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
                        <option value="todas">Todas as Categorias</option>
                        <option value="pedido">Pedidos Internos</option>
                        <option value="aviso_cliente">Avisos a Clientes</option>
                        <option value="lembrete">Lembretes</option>
                        <option value="outro">Outros</option>
                    </select>
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSolicitacoes.map((s) => (
                        <div key={s.id} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                            <div className="p-5 flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                        getPriorityColor(s.prioridade)
                                    )}>
                                        {s.prioridade}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                                        {getStatusIcon(s.status)}
                                        <span className="capitalize">{s.status.replace('_', ' ')}</span>
                                    </div>
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
                                        <p className="text-slate-500 text-sm line-clamp-3">{s.descricao}</p>
                                    )}
                                </div>


                                {s.telefone_contato && (
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

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-1">Criado por</p>
                                            <p className="text-xs font-bold text-slate-700 truncate">{s.usuario?.nome || 'Sistema'}</p>
                                        </div>
                                    </div>

                                    {s.atribuido?.nome && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-brand-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-brand-400 leading-none mb-1">Para</p>
                                                <p className="text-xs font-semibold text-slate-700 truncate">{s.atribuido.nome}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-xs">{format(new Date(s.created_at), "dd 'de' MMM", { locale: ptBR })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {s.status === 'pendente' && (
                                        <button
                                            onClick={() => handleUpdateStatus(s.id, 'em_andamento')}
                                            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 transition-colors"
                                        >
                                            Iniciar
                                        </button>
                                    )}
                                    {s.status === 'em_andamento' && (
                                        <button
                                            onClick={() => handleUpdateStatus(s.id, 'concluido')}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-colors"
                                        >
                                            Concluir
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
                    ))}
                </div>
            )}
        </div>
    );
}
