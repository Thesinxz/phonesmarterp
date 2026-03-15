"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus,
    Search,
    Filter,
    User,
    MoreVertical,
    Shield,
    CheckCircle2,
    XCircle,
    Mail,
    Phone,
    Settings2,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMembrosEquipe, type Usuario } from "@/services/equipe";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import MembroModal from "@/components/equipe/MembroModal";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function EquipePage() {
    const { profile } = useAuth();
    // ... rest of state
    const [membros, setMembros] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("todos");
    const [statusFilter, setStatusFilter] = useState<string>("todos");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMembro, setSelectedMembro] = useState<Usuario | null>(null);

    const loadData = useCallback(async (background = false) => {
        if (!profile?.empresa_id) return;
        try {
            if (!background) setLoading(true);
            const data = await getMembrosEquipe(profile.empresa_id);
            setMembros(data);
        } catch (error) {
            toast.error("Erro ao carregar equipe");
        } finally {
            if (!background) setLoading(false);
        }
    }, [profile?.empresa_id]);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [loadData, profile?.empresa_id]);

    useRealtimeSubscription({
        table: "usuarios",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: () => loadData(true)
    });

    const filteredMembros = membros.filter(m => {
        const matchesSearch = m.nome.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === "todos" || m.papel === roleFilter;
        const matchesStatus = statusFilter === "todos" ||
            (statusFilter === "ativo" ? m.ativo : !m.ativo);

        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin": return "text-red-600 bg-red-50 border-red-100";
            case "gerente": return "text-blue-600 bg-blue-50 border-blue-100";
            case "tecnico": return "text-amber-600 bg-amber-50 border-amber-100";
            case "financeiro": return "text-emerald-600 bg-emerald-50 border-emerald-100";
            default: return "text-slate-600 bg-slate-50 border-slate-100";
        }
    };

    return (
        <PermissionGuard modulo="equipe" fallback="error">
            <FeatureGate feature="gestao_equipe" featureName="Gestão de Equipe">
                <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Gestão de Equipe</h1>
                        <p className="text-slate-500 text-[10px] md:text-sm">Gerencie funcionários, papéis e permissões de acesso.</p>
                    </div>
                    {profile?.papel === "admin" && (
                        <button
                            onClick={() => {
                                setSelectedMembro(null);
                                setIsModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/20 transition-all font-medium w-full sm:w-auto text-sm"
                        >
                            <Plus size={20} />
                            Novo Membro
                        </button>
                    )}
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:grid sm:grid-cols-4 gap-4">
                    <div className="relative col-span-1 sm:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none"
                        >
                            <option value="todos">Cargos</option>
                            <option value="admin">Admin</option>
                            <option value="gerente">Gerente</option>
                            <option value="tecnico">Técnico</option>
                            <option value="financeiro">Financeiro</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all text-sm appearance-none"
                        >
                            <option value="todos">Status</option>
                            <option value="ativo">Ativos</option>
                            <option value="inativo">Inativos</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                        <p className="text-slate-500 animate-pulse">Carregando membros da equipe...</p>
                    </div>
                ) : filteredMembros.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-900 font-medium">Nenhum membro encontrado</p>
                        <p className="text-slate-500 text-sm mt-1">Tente ajustar seus filtros de busca.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMembros.map((m) => (
                            <div key={m.id} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group relative">
                                <div className="p-6 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shrink-0 border border-brand-100">
                                                <User className="w-6 h-6 text-brand-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 truncate leading-tight group-hover:text-brand-600 transition-colors uppercase">
                                                    {m.nome}
                                                </h3>
                                                <div className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 border",
                                                    getRoleBadge(m.papel)
                                                )}>
                                                    {m.papel}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                                            <Mail size={14} />
                                            <span className="truncate">{m.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                                            {m.ativo ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <XCircle size={14} className="text-red-400" />
                                            )}
                                            <span>Status: {m.ativo ? "Ativo" : "Inativo"}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedMembro(m);
                                                setIsModalOpen(true);
                                            }}
                                            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-200/60"
                                        >
                                            <Settings2 size={14} />
                                            Configurar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <MembroModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={loadData}
                    membro={selectedMembro}
                />
                </div>
            </FeatureGate>
        </PermissionGuard>
    );
}
