"use client";

import { useState, useEffect } from "react";
import { Target, Plus, Calendar, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMembrosEquipe, type Usuario } from "@/services/equipe";
import { getProgressoMetas, type MetaProgresso } from "@/services/metas";
import { GlassCard } from "@/components/ui/GlassCard";
import MetaModal from "@/components/equipe/MetaModal";
import MetaProgressCard from "@/components/equipe/MetaProgressCard";

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MetasPage() {
    const { profile } = useAuth();
    const now = new Date();
    const [ano, setAno] = useState(now.getFullYear());
    const [mes, setMes] = useState(now.getMonth() + 1);
    const [membros, setMembros] = useState<Usuario[]>([]);
    const [progressos, setProgressos] = useState<MetaProgresso[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id, ano, mes]);

    async function loadData() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const [membrosData, progressoData] = await Promise.all([
                getMembrosEquipe(profile.empresa_id),
                getProgressoMetas(profile.empresa_id, ano, mes),
            ]);
            setMembros(membrosData);
            setProgressos(progressoData);
        } catch (error) {
            console.error("Erro ao carregar metas:", error);
        } finally {
            setLoading(false);
        }
    }

    // Summary cards
    const totalMeta = progressos.reduce((sum, p) => sum + p.meta.meta_faturamento_centavos, 0);
    const totalRealizado = progressos.reduce((sum, p) => sum + p.realizado_centavos, 0);
    const percentualGeral = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;
    const metasBatidas = progressos.filter(p => p.percentual_faturamento >= 100).length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Target className="w-7 h-7 text-brand-600" />
                        Metas de Vendas
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Acompanhe o desempenho da equipe em tempo real
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="text-sm font-medium bg-transparent focus:outline-none"
                        >
                            {MESES.map((nome, i) => (
                                <option key={i + 1} value={i + 1}>{nome}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={ano}
                            onChange={(e) => setAno(Number(e.target.value))}
                            className="w-16 text-sm font-medium bg-transparent focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-brand-glow transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Meta
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <GlassCard className="p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Meta Total</p>
                    <p className="text-xl font-black text-slate-800">
                        R$ {(totalMeta / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Realizado</p>
                    <p className="text-xl font-black text-emerald-600">
                        R$ {(totalRealizado / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Progresso Geral</p>
                    <p className="text-xl font-black" style={{ color: percentualGeral >= 100 ? "#10b981" : "#3b82f6" }}>
                        {percentualGeral}%
                    </p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Metas Batidas</p>
                    <p className="text-xl font-black text-amber-500">
                        {metasBatidas}/{progressos.length}
                    </p>
                </GlassCard>
            </div>

            {/* Progress Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : progressos.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 mb-2">
                        Nenhuma meta definida para {MESES[mes - 1]} {ano}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Crie metas individuais para seus vendedores e acompanhe o progresso em tempo real.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Criar Primeira Meta
                    </button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progressos.map((p, i) => (
                        <MetaProgressCard key={p.meta.id} progresso={p} rank={i} />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <MetaModal
                    empresaId={profile!.empresa_id}
                    membros={membros}
                    onClose={() => setShowModal(false)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
