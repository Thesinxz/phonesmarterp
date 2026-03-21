"use client";

import { useState, useEffect } from "react";
import { 
    Shield, 
    Search, 
    Smartphone, 
    ChevronRight,
    SearchX,
    Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getWarrantyClaims } from "@/app/actions/warranty";
import { 
    GlassCard, PageHeader, EmptyState, SearchInput, 
    StatusBadge, GARANTIA_STATUS 
} from "@/components/ui";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";
import { FeatureGate } from "@/components/plans/FeatureGate";

export default function GarantiasPage() {
    const { profile } = useAuth();
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [status, setStatus] = useState("todas");
    const [claimType, setClaimType] = useState("todos");
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (profile?.empresa_id) {
            loadClaims();
        }
    }, [profile?.empresa_id, status, claimType]);

    async function loadClaims() {
        setLoading(true);
        try {
            const data = await getWarrantyClaims({
                tenantId: profile!.empresa_id,
                status,
                claimType
            });
            setClaims(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const stats = {
        abertas: claims.filter(c => c.status === 'aberta').length,
        reparo: claims.filter(c => c.status === 'reparo_em_andamento').length,
        concluidas: claims.filter(c => c.status === 'concluida').length,
        negadas: claims.filter(c => c.status === 'negada').length,
    };

    return (
        <FeatureGate feature="os_garantias" featureName="Gestão de Garantias">
            <div className="space-y-6 page-enter pb-12">
            <PageHeader
                title="Garantias"
                subtitle="Gestão de retornos e reclamações"
                actions={[{
                    label: "Abrir da OS",
                    href: "/os",
                    icon: <Shield size={16} />,
                }]}
            />

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Abertas", value: stats.abertas, color: "bg-amber-50 text-amber-600 border-amber-100" },
                    { label: "Em Reparo", value: stats.reparo, color: "bg-purple-50 text-purple-600 border-purple-100" },
                    { label: "Concluídas", value: stats.concluidas, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                    { label: "Negadas", value: stats.negadas, color: "bg-red-50 text-red-600 border-red-100" },
                ].map((stat, i) => (
                    <div key={i} className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center text-center bg-white shadow-sm transition-all hover:shadow-md", stat.color)}>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                        <p className="text-2xl font-black">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar reclamação..."
                        className="flex-1 w-full"
                        loading={loading && !!search}
                    />
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <select 
                            value={status} 
                            onChange={e => setStatus(e.target.value)}
                            className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50/50 outline-none text-sm font-bold text-slate-600"
                        >
                            <option value="todas">Status: Todos</option>
                            <option value="aberta">Aberta</option>
                            <option value="em_analise">Em Análise</option>
                            <option value="reparo_em_andamento">Em Reparo</option>
                            <option value="concluida">Concluída</option>
                            <option value="negada">Negada</option>
                        </select>
                        <select 
                            value={claimType} 
                            onChange={e => setClaimType(e.target.value)}
                            className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50/50 outline-none text-sm font-bold text-slate-600"
                        >
                            <option value="todos">Tipo: Todos</option>
                            <option value="peca_defeituosa">Peça Defeituosa</option>
                            <option value="erro_tecnico">Erro Técnico</option>
                            <option value="dano_acidental">Dano Acidental</option>
                            <option value="nao_relacionado">Não Relacionado</option>
                        </select>
                    </div>
                </div>
            </GlassCard>

            {/* Tabela / Listagem */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID / Aberta em</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente / Modelo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Classificação</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">OS Original</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 font-medium">Carregando...</td>
                                </tr>
                            ) : claims.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            title="Nenhuma garantia encontrada"
                                            description="Não há registros correspondentes aos filtros selecionados."
                                        />
                                    </td>
                                </tr>
                            ) : claims.map(claim => (
                                <tr key={claim.id} className={cn(
                                    "border-t border-slate-50 hover:bg-slate-50/30 transition-colors group",
                                    claim.is_covered === true ? "bg-emerald-50/10" : claim.status === 'negada' ? "bg-red-50/10" : ""
                                )}>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] font-black text-indigo-500 uppercase">#{claim.id.slice(0, 5).toUpperCase()}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{formatDate(claim.created_at)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-extrabold text-slate-800">{claim.original_os?.clientes?.nome || "Cliente"}</p>
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter mt-1">
                                            <Smartphone size={10} /> {claim.original_os?.marca_equipamento} {claim.original_os?.modelo_equipamento}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn(
                                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase inline-block",
                                            claim.claim_type === 'peca_defeituosa' ? "bg-indigo-100 text-indigo-700" :
                                            claim.claim_type === 'erro_tecnico' ? "bg-purple-100 text-purple-700" :
                                            claim.claim_type === 'dano_acidental' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                                        )}>
                                            {claim.claim_type.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={claim.status} map={GARANTIA_STATUS} size="md" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link 
                                            href={`/os/${claim.original_os_id}`}
                                            className="text-[10px] font-black text-indigo-600 hover:underline uppercase bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                                        >
                                            OS #{String(claim.original_os?.numero).padStart(4, "0")}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            href={`/garantias/${claim.id}`}
                                            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-900 text-white hover:bg-black transition-all font-black text-[10px] uppercase tracking-wider"
                                        >
                                            Detalhes <ChevronRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </FeatureGate>
    );
}

