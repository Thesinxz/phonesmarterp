"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    ShieldCheck, Search, Clock, CheckCircle2,
    AlertTriangle, XCircle, Smartphone, User, Calendar
} from "lucide-react";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

const supabase = createClient();

interface GarantiaOS {
    id: string;
    numero: number;
    cliente_nome: string;
    equipamento: string;
    marca: string;
    modelo: string;
    data_conclusao: string;
    status: string;
    servico_descricao: string;
}

export default function GarantiasPage() {
    const { profile } = useAuth();
    const [ordens, setOrdens] = useState<GarantiaOS[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [diasGarantia, setDiasGarantia] = useState(90);

    useEffect(() => {
        if (profile?.empresa_id) loadData();
    }, [profile?.empresa_id, diasGarantia]);

    async function loadData() {
        setLoading(true);
        try {
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - diasGarantia);

            const { data, error } = await supabase
                .from("ordens_servico")
                .select("id, numero, tipo_equipamento, marca_equipamento, modelo_equipamento, status, observacoes_internas, updated_at, clientes(nome)")
                .eq("empresa_id", profile!.empresa_id)
                .eq("status", "finalizada")
                .gte("updated_at", dataLimite.toISOString())
                .order("updated_at", { ascending: false });

            if (error) throw error;

            setOrdens((data || []).map((os: any) => ({
                id: os.id,
                numero: os.numero,
                cliente_nome: os.clientes?.nome || "—",
                equipamento: os.tipo_equipamento || "—",
                marca: os.marca_equipamento || "—",
                modelo: os.modelo_equipamento || "—",
                data_conclusao: os.updated_at,
                status: os.status,
                servico_descricao: os.observacoes_internas || "—",
            })));
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    function getDiasRestantes(dataConclusao: string) {
        const conclusao = new Date(dataConclusao);
        const vencimento = new Date(conclusao);
        vencimento.setDate(vencimento.getDate() + diasGarantia);
        const hoje = new Date();
        const diff = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    }

    function getStatusGarantia(dataConclusao: string) {
        const dias = getDiasRestantes(dataConclusao);
        if (dias <= 0) return { label: "Vencida", color: "bg-red-100 text-red-700", icon: XCircle, sort: 3 };
        if (dias <= 15) return { label: `${dias}d restantes`, color: "bg-amber-100 text-amber-700", icon: AlertTriangle, sort: 1 };
        return { label: `${dias}d restantes`, color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, sort: 2 };
    }

    const filtered = useMemo(() => {
        return ordens
            .filter(os =>
                !search ||
                os.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
                os.equipamento.toLowerCase().includes(search.toLowerCase()) ||
                os.modelo.toLowerCase().includes(search.toLowerCase()) ||
                String(os.numero).includes(search)
            )
            .sort((a, b) => {
                const sa = getStatusGarantia(a.data_conclusao).sort;
                const sb = getStatusGarantia(b.data_conclusao).sort;
                return sa - sb;
            });
    }, [ordens, search]);

    const countVigente = filtered.filter(os => getDiasRestantes(os.data_conclusao) > 15).length;
    const countVencendo = filtered.filter(os => { const d = getDiasRestantes(os.data_conclusao); return d > 0 && d <= 15; }).length;
    const countVencida = filtered.filter(os => getDiasRestantes(os.data_conclusao) <= 0).length;

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ShieldCheck className="text-brand-500" /> Garantia Estendida
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Acompanhe a garantia das OS finalizadas</p>
                </div>
                <div className="flex items-center gap-2 bg-white/60 border border-slate-200/60 rounded-xl px-3 py-2">
                    <label className="text-xs font-bold text-slate-500">Garantia:</label>
                    <select
                        value={diasGarantia}
                        onChange={e => setDiasGarantia(Number(e.target.value))}
                        className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
                    >
                        <option value={30}>30 dias</option>
                        <option value={60}>60 dias</option>
                        <option value={90}>90 dias</option>
                        <option value={180}>180 dias</option>
                        <option value={365}>1 ano</option>
                    </select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <GlassCard className="p-5 border-l-4 border-l-emerald-400">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Vigentes</p>
                    <p className="text-2xl font-black text-slate-800">{countVigente}</p>
                </GlassCard>
                <GlassCard className="p-5 border-l-4 border-l-amber-400">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Vencendo (15d)</p>
                    <p className="text-2xl font-black text-slate-800">{countVencendo}</p>
                </GlassCard>
                <GlassCard className="p-5 border-l-4 border-l-red-400">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Vencidas</p>
                    <p className="text-2xl font-black text-slate-800">{countVencida}</p>
                </GlassCard>
            </div>

            {/* Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por cliente, equipamento, modelo ou número da OS..."
                    className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
            </div>

            {/* Tabela */}
            <GlassCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Status Garantia</th>
                                <th className="px-6 py-4">OS</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Equipamento</th>
                                <th className="px-6 py-4">Serviço</th>
                                <th className="px-6 py-4">Conclusão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5 bg-slate-50/30 h-14" />
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                                        <ShieldCheck size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-medium text-slate-600 mb-1">Nenhuma OS com garantia ativa</p>
                                        <p className="text-sm">As OS finalizadas dentro do período aparecerão aqui</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(os => {
                                    const garantia = getStatusGarantia(os.data_conclusao);
                                    const GarantiaIcon = garantia.icon;
                                    return (
                                        <tr key={os.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                                    garantia.color
                                                )}>
                                                    <GarantiaIcon size={12} />
                                                    {garantia.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-brand-600">#{os.numero}</span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{os.cliente_nome}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-700">{os.equipamento}</p>
                                                <p className="text-xs text-slate-400">{os.marca} {os.modelo}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">
                                                {os.servico_descricao}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {formatDate(os.data_conclusao)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
