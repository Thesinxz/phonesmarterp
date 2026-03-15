"use client";

import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
    TrendingUp, 
    MessageSquare, 
    Calendar, 
    Building2, 
    User as UserIcon,
    CheckCircle2,
    Clock,
    XCircle,
    Phone,
    Loader2,
    Layout
} from "lucide-react";
import { useState, useEffect } from "react";
import { getUpgradeInterests, updateInterestStatus } from "@/app/actions/plans";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { PLAN_NAMES, Plan } from "@/lib/plans/features";

export default function AdminUpgradeInterestsPage() {
    const { profile } = useAuth();
    const [interests, setInterests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Proteção de acesso (super-admin apenas)
    const isAdmin = profile?.papel === 'admin';

    useEffect(() => {
        if (isAdmin) loadData();
    }, [isAdmin]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await getUpgradeInterests();
            setInterests(data);
        } catch (error) {
            toast.error("Erro ao carregar interesses.");
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await updateInterestStatus(id, newStatus);
            toast.success(`Status atualizado para ${newStatus}`);
            loadData();
        } catch (error) {
            toast.error("Erro ao atualizar status.");
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <GlassCard className="p-8 text-center max-w-sm">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Acesso Negado</h2>
                    <p className="text-slate-500 mt-2 text-sm">Apenas administradores podem acessar esta página.</p>
                </GlassCard>
            </div>
        );
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pendente': return "bg-amber-100 text-amber-700";
            case 'contactado': return "bg-blue-100 text-blue-700";
            case 'convertido': return "bg-emerald-100 text-emerald-700";
            case 'cancelado': return "bg-slate-100 text-slate-500";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pendente': return <Clock size={12} />;
            case 'contactado': return <MessageSquare size={12} />;
            case 'convertido': return <CheckCircle2 size={12} />;
            case 'cancelado': return <XCircle size={12} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 page-enter pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        Interesses em Upgrade
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 ml-[52px]">Gerencie leads e solicitações de novos planos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <GlassCard className="p-4 bg-amber-50/30">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pendentes</p>
                    <p className="text-2xl font-black text-amber-900">{interests.filter(i => i.status === 'pendente').length}</p>
                </GlassCard>
                <GlassCard className="p-4 bg-emerald-50/30">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Convertidos</p>
                    <p className="text-2xl font-black text-emerald-900">{interests.filter(i => i.status === 'convertido').length}</p>
                </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-brand-500 mb-4" />
                        <p className="text-sm text-slate-500">Buscando solicitações...</p>
                    </div>
                ) : interests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Layout className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-500 font-bold">Nenhum interesse registrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Empresa / Usuário</th>
                                    <th className="px-6 py-4">Plano Desejado</th>
                                    <th className="px-6 py-4">Contato</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {interests.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 flex items-center gap-1.5 leading-none mb-1">
                                                    <Building2 size={12} className="text-slate-400" />
                                                    {item.empresa_nome || "N/A"}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 leading-none">
                                                    <UserIcon size={12} className="text-slate-400" />
                                                    {item.user?.email || "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-600">
                                                {PLAN_NAMES[item.plano_desejado as Plan] || item.plano_desejado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a 
                                                href={`https://wa.me/55${item.telefone.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                className="flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
                                            >
                                                <Phone size={14} />
                                                {item.telefone}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                                                getStatusStyle(item.status)
                                            )}>
                                                {getStatusIcon(item.status)}
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.status === 'pendente' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(item.id, 'contactado')}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                                        title="Marcar como contactado"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                )}
                                                {['pendente', 'contactado'].includes(item.status) && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(item.id, 'convertido')}
                                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                                        title="Marcar como convertido"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                )}
                                                {item.status !== 'cancelado' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(item.id, 'cancelado')}
                                                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                                        title="Cancelar/Ignorar"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
