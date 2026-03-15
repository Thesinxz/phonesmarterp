"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Shield, 
    Calendar, 
    Download, 
    TrendingDown, 
    User, 
    Smartphone, 
    Loader2,
    AlertCircle,
    PieChart,
    BarChart3,
    CheckCircle2,
    XCircle,
    ArrowRightLeft,
    Wrench
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { getWarrantyReport } from "@/app/actions/warranty";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import Link from "next/link";

export default function RelatorioGarantiasPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadReport();
        }
    }, [profile?.empresa_id, startDate, endDate]);

    async function loadReport() {
        setLoading(true);
        try {
            const result = await getWarrantyReport({
                tenantId: profile!.empresa_id,
                dateFrom: startDate + "T00:00:00Z",
                dateTo: endDate + "T23:59:59Z"
            });
            setData(result || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const stats = useMemo(() => {
        const total = data.length;
        const cobertas = data.filter(d => d.is_covered).length;
        const negadas = data.filter(d => d.status === 'negada').length;
        const pendentes = data.filter(d => d.status === 'aberta' || d.status === 'reparo_em_andamento').length;
        
        const byType = data.reduce((acc: any, d: any) => {
            acc[d.claim_type] = (acc[d.claim_type] || 0) + 1;
            return acc;
        }, {});

        const technicians = data
            .filter(d => d.claim_type === 'erro_tecnico' && d.technician)
            .reduce((acc: any, d: any) => {
                acc[d.technician?.nome] = (acc[d.technician?.nome] || 0) + 1;
                return acc;
            }, {});

        return { total, cobertas, negadas, pendentes, byType, technicians };
    }, [data]);

    return (
        <div className="space-y-6 page-enter pb-12 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Shield className="text-indigo-500" /> Relatório de Garantias
                    </h1>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Análise de qualidade e controle de retornos</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                        <Calendar size={14} className="text-slate-400 ml-1" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)}
                            className="text-[10px] font-black uppercase text-slate-600 border-none outline-none bg-transparent"
                        />
                        <span className="text-slate-300 mx-1">/</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)}
                            className="text-[10px] font-black uppercase text-slate-600 border-none outline-none bg-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Resumo Rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Claims", value: stats.total, color: "bg-white text-slate-800 border-slate-100", icon: Shield, iconCol: "text-slate-600" },
                    { label: "Aprovadas", value: stats.cobertas, color: "bg-white text-emerald-600 border-slate-100", icon: CheckCircle2, iconCol: "text-emerald-500" },
                    { label: "Negadas", value: stats.negadas, color: "bg-white text-red-600 border-slate-100", icon: XCircle, iconCol: "text-red-500" },
                    { label: "Taxa Retorno", value: stats.total > 0 ? ((stats.total / (stats.total + 50)) * 100).toFixed(1) + "%" : "0%", color: "bg-white text-indigo-600 border-slate-100", icon: TrendingDown, iconCol: "text-indigo-500" },
                ].map((stat: any, i) => (
                    <div key={i} className={cn("p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform", stat.color)}>
                        <div className={cn("w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-white border border-slate-50 shadow-sm", stat.iconCol)}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{stat.label}</p>
                            <p className="text-2xl font-black tabular-nums tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Distribuição por Motivo */}
                <GlassCard title="Distribuição por Motivo" icon={PieChart}>
                    <div className="space-y-6 py-2">
                        {[
                            { id: 'peca_defeituosa', label: 'Peça Defeituosa', color: 'bg-indigo-500', icon: Wrench },
                            { id: 'erro_tecnico', label: 'Erro Técnico', color: 'bg-purple-500', icon: User },
                            { id: 'dano_acidental', label: 'Dano Acidental', color: 'bg-red-500', icon: AlertCircle },
                            { id: 'nao_relacionado', label: 'Não Relacionado', color: 'bg-slate-400', icon: HelpCircle }
                        ].map(type => {
                            const count = stats.byType[type.id] || 0;
                            const perc = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            const Icon = type.icon;
                            return (
                                <div key={type.id} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", type.color)} />
                                            {type.label}
                                        </div>
                                        <span>{count} OCORRÊNCIAS ({perc.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className={cn("h-full transition-all duration-1000", type.color)} 
                                            style={{ width: `${perc}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Qualidade Técnica */}
                <GlassCard title="Problemas por Técnico" icon={BarChart3}>
                    <div className="space-y-4 py-2">
                        {Object.keys(stats.technicians).length > 0 ? Object.entries(stats.technicians).sort((a:any, b:any) => b[1] - a[1]).map(([name, count]: any) => (
                            <div key={name} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black uppercase shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        {name.substring(0,2)}
                                    </div>
                                    <div>
                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{name}</span>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Retornos com Erro Técnico</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-red-500">{count}</span>
                                    <p className="text-[9px] font-black text-slate-300 uppercase leading-none">Casos</p>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                    <CheckCircle2 size={32} />
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum erro técnico no período.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Tabela Resumo */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Histórico de Movimentações</h3>
                        <p className="text-xs text-slate-400 font-medium">Todas as garantias abertas no período selecionado</p>
                    </div>
                    <button className="h-10 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-colors shadow-lg shadow-slate-200">
                        <Download size={14} /> Exportar CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-100/50">Data / ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Equipamento / OS Original</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo de Claim</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Gasto (Peças)</th>
                                <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Encargo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 w-10 h-10" /></td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center">
                                    <div className="max-w-xs mx-auto space-y-2">
                                        <AlertCircle className="mx-auto text-slate-100" size={48} />
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Sem registros no período</p>
                                    </div>
                                </td></tr>
                            ) : data.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6 border-r border-slate-50">
                                        <p className="text-[11px] font-black text-slate-700 uppercase">{formatDate(d.created_at)}</p>
                                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter mt-1">#CLAIM-{d.id.slice(0, 5).toUpperCase()}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Smartphone size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{d.original_os?.marca_equipamento} {d.original_os?.modelo_equipamento}</p>
                                                <Link href={`/os/${d.original_os_id}`} className="text-[10px] font-bold text-indigo-500 hover:underline uppercase tracking-tighter">OS #{d.original_os?.numero}</Link>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={cn(
                                            "inline-flex px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border",
                                            d.claim_type === 'peca_defeituosa' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                            d.claim_type === 'erro_tecnico' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                            "bg-slate-50 text-slate-500 border-slate-100"
                                        )}>
                                            {d.claim_type.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(d.original_os?.pecas_json) ? d.original_os.pecas_json.slice(0, 1).map((p:any, i:number) => (
                                                <span key={i} className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                    {p.nome}
                                                </span>
                                            )) : "-"}
                                            {Array.isArray(d.original_os?.pecas_json) && d.original_os.pecas_json.length > 1 && (
                                                <span className="text-[9px] font-black text-slate-300">+{d.original_os.pecas_json.length - 1}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className={cn(
                                            "inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em]",
                                            d.is_covered ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                        )}>
                                            {d.is_covered ? 'Custo Empresa' : 'Faturado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HelpCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
    );
}
