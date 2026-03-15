"use client";

import React, { useState, useEffect } from "react";
import { 
    Smartphone, 
    Search, 
    Filter, 
    ChevronRight, 
    History, 
    ShieldAlert, 
    CheckCircle2, 
    ArrowLeft,
    Download,
    Eye,
    Package,
    ArrowRightLeft,
    Clock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getStockIMEIs, searchByIMEI } from "@/app/actions/imei";
import { getImeiDashboardStats } from "@/app/actions/imei_dashboard";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function IMEIsPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [imeis, setImeis] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    
    // Detail Drawer
    const [selectedImei, setSelectedImei] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const loadData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const [data, s] = await Promise.all([
                getStockIMEIs({ 
                    tenantId: profile.empresa_id,
                    status: statusFilter === "todos" ? undefined : statusFilter
                }),
                getImeiDashboardStats(profile.empresa_id)
            ]);
            setImeis(data);
            setStats(s);
        } catch (error) {
            console.error("Error loading IMEIs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [profile?.empresa_id, statusFilter]);

    const handleOpenDetail = async (imei: string) => {
        if (!profile?.empresa_id) return;
        try {
            const detail = await searchByIMEI(profile.empresa_id, imei);
            setSelectedImei(detail);
            setIsDrawerOpen(true);
        } catch (error) {
            console.error("Error loading detail:", error);
        }
    };

    const filteredImeis = imeis.filter(i => 
        i.imei.includes(search) || 
        i.catalog_item?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "em_estoque": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "vendido": return "bg-blue-50 text-blue-700 border-blue-100";
            case "em_garantia": return "bg-amber-50 text-amber-700 border-amber-100";
            case "bloqueado": return "bg-red-50 text-red-700 border-red-100";
            case "em_transito": return "bg-indigo-50 text-indigo-700 border-indigo-100";
            default: return "bg-slate-50 text-slate-700 border-slate-100";
        }
    };

    return (
        <FeatureGate
            feature="imei"
            featureName="Gestão de IMEIs"
            description="Controle a rastreabilidade completa de aparelhos, histórico de eventos e status de garantia."
        >
            <div className="max-w-7xl mx-auto space-y-6 page-enter pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/estoque" className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800">Gestão de IMEIs</h1>
                            <p className="text-slate-500 text-sm font-medium">Rastreabilidade completa de aparelhos</p>
                        </div>
                    </div>
                    <button className="btn-secondary h-11">
                        <Download size={18} /> Exportar CSV
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Em Estoque" value={stats?.em_estoque || 0} icon={Package} color="emerald" />
                    <StatCard label="Vendidos" value={stats?.vendidos || 0} icon={CheckCircle2} color="blue" />
                    <StatCard label="Em Garantia" value={stats?.em_garantia || 0} icon={Clock} color="amber" />
                    <StatCard label="Bloqueados" value={stats?.bloqueados || 0} icon={ShieldAlert} color="red" />
                </div>

                {/* Filters & Table */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                placeholder="Buscar por IMEI ou Produto..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                            {["todos", "em_estoque", "vendido", "em_garantia", "bloqueado"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        "whitespace-now800 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all",
                                        statusFilter === s 
                                            ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
                                            : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-100"
                                    )}
                                >
                                    {s.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aparelho / Produto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">IMEI</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unidade</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-1/3"></div></td>
                                        </tr>
                                    ))
                                ) : filteredImeis.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Search size={40} strokeWidth={1} />
                                                <p className="font-bold">Nenhum IMEI encontrado</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredImeis.map((i) => (
                                        <tr key={i.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                                                        <Smartphone size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-700">{i.catalog_item?.name || "Produto Removido"}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Cadastrado em {format(new Date(i.created_at), "dd MMM yy", { locale: ptBR })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono text-sm font-bold text-slate-600 tracking-wider">
                                                    {i.imei}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {i.unit?.name || "Matriz"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg border",
                                                    getStatusStyle(i.status)
                                                )}>
                                                    {i.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleOpenDetail(i.imei)}
                                                    className="p-2 hover:bg-brand-50 hover:text-brand-600 rounded-xl transition-all text-slate-400"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Drawer */}
                {isDrawerOpen && selectedImei && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsDrawerOpen(false)} />
                        <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
                            <div className="p-8 space-y-8">
                                {/* Drawer Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-slate-800">Detalhes do Aparelho</h2>
                                    <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500">
                                        <ArrowLeft size={20} className="rotate-180" />
                                    </button>
                                </div>

                                {/* Info Card */}
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-brand-600">
                                            <Smartphone size={28} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IMEI {selectedImei.imeiRecord.imei}</p>
                                            <h3 className="text-lg font-black text-slate-800 leading-tight">{selectedImei.product?.name}</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Status Atual</p>
                                            <span className={cn(
                                                "inline-block mt-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg border",
                                                getStatusStyle(selectedImei.imeiRecord.status)
                                            )}>
                                                {selectedImei.imeiRecord.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Unidade</p>
                                            <p className="text-xs font-bold text-slate-700 mt-1">{selectedImei.currentUnit?.name}</p>
                                        </div>
                                    </div>

                                    {selectedImei.saleInfo && (
                                        <div className="pt-4 border-t border-slate-200/50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Dados da Venda</p>
                                            <p className="text-sm font-bold text-slate-800 mt-1">Vendido para {selectedImei.saleInfo.customer}</p>
                                            <p className="text-xs text-slate-500">em {format(selectedImei.saleInfo.soldAt, "dd/MM/yyyy HH:mm")}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Timeline */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                        <History size={18} className="text-slate-400" />
                                        Histórico de Eventos
                                    </h3>
                                    
                                    <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-2">
                                        {selectedImei.history.map((event: any, idx: number) => (
                                            <div key={event.id} className="relative">
                                                <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-white border-2 border-slate-200" />
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-black text-slate-700 uppercase">{event.event_type.replace("_", " ")}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{format(new Date(event.created_at), "dd/MM/yy HH:mm")}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed">{event.notes}</p>
                                                    <div className="flex items-center gap-2">
                                                        {event.from_status && (
                                                            <span className="text-[9px] font-bold text-slate-400 italic">
                                                                {event.from_status} → {event.to_status}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}

function StatCard({ label, value, icon: Icon, color }: any) {
    const colors = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        red: "bg-red-50 text-red-600 border-red-100",
    };

    return (
        <div className={cn("p-4 rounded-[24px] border border-slate-100 bg-white shadow-sm flex items-center gap-4 transition-all hover:shadow-md")}>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colors[color as keyof typeof colors])}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    );
}
