"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Plus,
    Wrench,
    TrendingUp,
    Award,
    Search,
    UserCircle2,
    CheckCircle2,
    XCircle,
    MoreVertical
} from "lucide-react";
import { getTecnicos } from "@/services/tecnicos";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

export default function TecnicosPage() {
    const { profile } = useAuth();
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadTecnicos();
    }, [profile?.empresa_id]);

    async function loadTecnicos() {
        setLoading(true);
        try {
            const data = await getTecnicos();
            setTecnicos(data);
        } catch (error) {
            console.error("Erro ao carregar técnicos:", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredTecnicos = tecnicos.filter(t =>
        t.usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Técnicos & Equipe</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Gerencie sua equipe técnica e comissões</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/tecnicos/relatorio" className="btn-secondary">
                        <TrendingUp size={18} />
                        Comissões
                    </Link>
                    <Link href="/tecnicos/novo" className="btn-primary">
                        <Plus size={18} />
                        Novo Integrante
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500">
                        <Wrench size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Total Equipe</p>
                        <p className="text-xl font-bold text-slate-800">{tecnicos.length}</p>
                    </div>
                </GlassCard>
                {/* Outros cards removidos temporariamente aguardando métricas não-fake */}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    className="input-glass pl-10"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Technicians Grid */}
            <div className="grid grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card h-64 animate-pulse bg-slate-100" />
                    ))
                ) : filteredTecnicos.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-slate-400 italic">
                        Nenhum técnico encontrado.
                    </div>
                ) : (
                    filteredTecnicos.map((tecnico) => (
                        <GlassCard key={tecnico.id} className="group relative overflow-hidden">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold">
                                        {tecnico.usuario.nome.substring(0, 1)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 leading-tight">{tecnico.usuario.nome}</h3>
                                        <p className="text-xs text-slate-400">{tecnico.usuario.email}</p>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Especialidades</span>
                                    <span className="text-slate-700 font-medium">
                                        {tecnico.especialidades.length > 0 ? tecnico.especialidades.join(", ") : "Geral"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Comissão</span>
                                    <span className="text-brand-600 font-bold">{tecnico.comissao_pct}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                                    <span className={cn(
                                        "flex items-center gap-1 font-bold",
                                        tecnico.ativo ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {tecnico.ativo ? (
                                            <><CheckCircle2 size={12} /> Ativo</>
                                        ) : (
                                            <><XCircle size={12} /> Inativo</>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Mini chart placeholder removed - awaiting real data */}
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    Meta Mensal
                                </span>
                                <span className="text-xs font-bold text-slate-700">
                                    {/* Mostrar valor formatado se existir, senão R$ 0,00 */}
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((tecnico.meta_mensal_centavos || 0) / 100)}
                                </span>
                            </div>

                            <Link
                                href={`/tecnicos/${tecnico.id}`}
                                className="absolute inset-0 z-10 opacity-0 bg-brand-500/5 group-hover:opacity-100 transition-opacity"
                            />
                        </GlassCard>
                    ))
                )}
            </div>
        </div>
    );
}
