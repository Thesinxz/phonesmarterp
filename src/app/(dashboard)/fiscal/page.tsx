"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    FileText,
    ShieldCheck,
    AlertCircle,
    Download,
    Search,
    Filter,
    Wifi,
    BarChart2,
    CheckCircle2,
    XCircle,
    Calendar,
    Settings,
    QrCode,
    Wrench
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { getDocumentosFiscais, DocumentoFiscal } from "@/services/fiscal";
import { useAuth } from "@/context/AuthContext";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradeBanner } from "@/components/plans/UpgradeBanner";

export default function FiscalPage() {
    const { profile } = useAuth();
    const [sefazStatus, setSefazStatus] = useState<"online" | "offline" | "checking">("online");
    const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.empresa_id) return;

        async function loadData() {
            setLoading(true);
            try {
                const docs = await getDocumentosFiscais(profile!.empresa_id);
                setDocumentos(docs);
            } catch (error) {
                console.error("Erro ao carregar documentos fiscais:", error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [profile?.empresa_id]);

    const { hasAccess, upgrade } = useFeatureGate('nfe');

    const totalEmitidas = documentos.length;
    const somaTotal = documentos.reduce((acc, doc) => acc + (doc.valor_total_centavos || 0), 0);

    if (!hasAccess && !loading) {
        return (
            <div className="space-y-6 page-enter">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Módulo Fiscal</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Gestão de documentos fiscais e conformidade</p>
                </div>
                
                <UpgradeBanner 
                    feature="Emissão de Notas Fiscais (NFe/NFCe/NFSe)"
                    requiredPlan="essencial"
                    className="mt-8"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Módulo Fiscal</h1>
                    <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Gestão de documentos fiscais e conformidade</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-initial bg-white/60 h-10 px-4 rounded-xl border border-white/60 text-slate-600 flex items-center justify-center gap-2 text-xs font-medium hover:bg-white/80 transition-all">
                        <Calendar size={16} />
                        Este Mês
                    </button>
                    <Link href="/fiscal/nfe/nova" className="flex-1 sm:flex-initial btn-primary justify-center text-xs">
                        <FileText size={18} />
                        Emitir NF-e
                    </Link>
                </div>
            </div>

            {/* SEFAZ Monitor & Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <GlassCard className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status WebService</p>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full animate-pulse",
                                sefazStatus === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"
                            )} />
                            <span className="text-lg font-bold text-slate-800">SEFAZ - SP</span>
                        </div>
                    </div>
                    <Wifi size={24} className="text-emerald-500" />
                </GlassCard>

                <GlassCard className="p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas Emitidas</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-slate-800">{totalEmitidas}</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fiscal</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-slate-800">{formatCurrency(somaTotal)}</span>
                        <BarChart2 size={24} className="text-slate-300 mb-1" />
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impostos Est.</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-black text-slate-500">{formatCurrency(0)}</span>
                        <ShieldCheck size={24} className="text-slate-300 mb-1" />
                    </div>
                </GlassCard>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
                {/* List of Documents */}
                <GlassCard className="col-span-2 p-0 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <h2 className="font-bold text-slate-700">Documentos Recentes</h2>
                        <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-white rounded-lg text-slate-400"><Search size={16} /></button>
                            <button className="p-1.5 hover:bg-white rounded-lg text-slate-400"><Filter size={16} /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/50">
                                <tr className="whitespace-nowrap">
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Número/Série</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Valor</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {documentos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            Nenhum documento fiscal emitido neste período.
                                        </td>
                                    </tr>
                                ) : (
                                    documentos.map((doc) => (
                                        <tr key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className={cn(
                                                    "flex items-center gap-1.5 font-black uppercase text-[10px] tracking-tighter px-2.5 py-1 rounded-full border w-fit",
                                                    doc.status === "autorizada" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                                )}>
                                                    {doc.status === "autorizada" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {doc.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{doc.numero}</p>
                                                <p className="text-[10px] text-slate-400">Série {doc.serie}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="badge badge-slate">{doc.tipo}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {formatDate(doc.data_emissao || doc.created_at || "")}
                                            </td>
                                            <td className="px-6 py-4 font-black text-slate-800">
                                                {formatCurrency(doc.valor_total_centavos)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100">
                                                    <Download size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Fiscal Settings & Certificate */}
                <div className="space-y-6">
                    <GlassCard title="Certificado Digital" icon={ShieldCheck}>
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 border-dashed">
                                <div className="p-2 rounded-xl bg-slate-200 text-slate-500">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-500">Nenhum certificado</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Configure para emitir notas</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ambiente Atual</p>
                                <div className="flex p-1 bg-slate-100 rounded-xl">
                                    <button className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-white shadow-sm text-slate-800">HOMOLOGAÇÃO</button>
                                    <button className="flex-1 py-1.5 text-[10px] font-bold rounded-lg text-slate-400">PRODUÇÃO</button>
                                </div>
                            </div>

                            <button className="btn-secondary w-full justify-center h-10 text-xs text-brand-600 border-brand-200 hover:bg-brand-50">
                                <Settings size={14} className="mr-2" />
                                Configurar Certificado
                            </button>
                        </div>
                    </GlassCard>

                    <GlassCard title="Ações Fiscais" icon={Settings} className="bg-slate-900 border-none">
                        <div className="space-y-3 py-2">
                            <Link href="/fiscal/importar" className="w-full flex items-center justify-between p-3 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/50 transition-all group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Download size={18} className="text-brand-300" />
                                    <span className="text-brand-100 text-sm font-bold">Importar XML (NFe Entrada)</span>
                                </div>
                            </Link>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all group opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-3">
                                    <Download size={18} className="text-white/60" />
                                    <span className="text-white text-sm font-medium">Exportar XML (Mês)</span>
                                </div>
                            </button>
                            <Link href="/fiscal/nfce/nova" className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <QrCode size={18} className="text-emerald-400" />
                                    <span className="text-white text-sm font-medium">Emitir NFC-e (Mod. 65)</span>
                                </div>
                            </Link>
                            <Link href="/fiscal/nfse/nova" className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all group cursor-pointer">
                                <div className="flex items-center gap-3 text-amber-400">
                                    <Wrench size={18} />
                                    <span className="text-sm font-medium text-white">Emitir NFS-e (Serviços)</span>
                                </div>
                            </Link>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

function ArrowUpRight({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
    );
}
