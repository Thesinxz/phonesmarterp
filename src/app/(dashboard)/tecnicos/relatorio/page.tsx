"use client";

import { useState, useEffect } from "react";
import {
    DollarSign,
    Calendar,
    ChevronRight,
    User,
    TrendingUp,
    Package,
    ArrowLeft,
    Download,
    Filter
} from "lucide-react";
import Link from "next/link";
import { getRelatorioComissoes } from "@/services/comissoes";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";

export default function RelatorioComissoesPage() {
    const [loading, setLoading] = useState(true);
    const [relatorio, setRelatorio] = useState<any[]>([]);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());

    useEffect(() => {
        loadData();
    }, [mes, ano]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await getRelatorioComissoes({ mes, ano });
            setRelatorio(data);
        } catch (error) {
            console.error("Erro ao carregar comissões:", error);
        } finally {
            setLoading(false);
        }
    }

    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/tecnicos" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Relatório de Comissões</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Visão detalhada de produtividade e ganhos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                        <select
                            value={mes}
                            onChange={(e) => setMes(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 px-3 py-1.5 outline-none"
                        >
                            {meses.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={ano}
                            onChange={(e) => setAno(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 px-3 py-1.5 outline-none border-l border-slate-100"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <button className="h-10 px-4 rounded-xl bg-slate-800 text-white flex items-center gap-2 text-sm font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200">
                        <Download size={16} /> Exportar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="glass-card h-64 animate-pulse bg-slate-100/50" />
                    ))}
                </div>
            ) : relatorio.length === 0 ? (
                <div className="glass-card py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <DollarSign size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhuma comissão registrada para este período.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {relatorio.map((tec) => (
                        <div key={tec.tecnicoId} className="space-y-4">
                            {/* Técnico Summary Card */}
                            <GlassCard className="p-0 overflow-hidden border-indigo-100 shadow-indigo-500/5">
                                <div className="p-6 flex items-center justify-between bg-indigo-50/30">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-200">
                                            {tec.nome.substring(0, 1)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 leading-tight">{tec.nome}</h2>
                                            <p className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 mt-1">
                                                <TrendingUp size={14} /> {tec.comissaoPct}% de Comissão sobre Lucro Líquido
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">A Receber Total</p>
                                        <p className="text-3xl font-black text-emerald-600 leading-none">
                                            {formatCurrency(tec.totalComissao)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 border-t border-indigo-50 items-center">
                                    <div className="p-4 border-r border-indigo-50 text-center">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total OS</p>
                                        <p className="text-xl font-bold text-slate-800">{tec.totalOS}</p>
                                    </div>
                                    <div className="p-4 border-r border-indigo-50 text-center">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Produzido</p>
                                        <p className="text-xl font-bold text-slate-800">{formatCurrency(tec.totalProduzido)}</p>
                                    </div>
                                    <div className="p-4 border-r border-indigo-50 text-center">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Custo de Peças</p>
                                        <p className="text-xl font-bold text-slate-800">{formatCurrency(tec.totalCustoPecas)}</p>
                                    </div>
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Lucro p/ Loja</p>
                                        <p className="text-xl font-bold text-brand-500">{formatCurrency(tec.lucroLiquido - tec.totalComissao)}</p>
                                    </div>
                                </div>

                                {/* Table of OS */}
                                <div className="p-0 border-t border-indigo-50">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-indigo-50">
                                                <th className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest">OS</th>
                                                <th className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Valor OS</th>
                                                <th className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Peças (Custo)</th>
                                                <th className="px-6 py-3 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">L. Bruto</th>
                                                <th className="px-6 py-3 font-black text-slate-800 uppercase text-[10px] tracking-widest text-right bg-indigo-50/50">Comissão</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tec.detalhes.map((os: any) => (
                                                <tr key={os.id} className="border-b border-indigo-50/50 last:border-0 hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">#{String(os.numero).padStart(4, '0')}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase font-black">{new Date(os.data).toLocaleDateString('pt-BR')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(os.valorTotal)}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-red-500 indent-1">- {formatCurrency(os.custoPecas)}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(os.lucroBruto)}</td>
                                                    <td className="px-6 py-4 text-right font-black text-emerald-600 bg-indigo-50/20">{formatCurrency(os.valorComissao)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
