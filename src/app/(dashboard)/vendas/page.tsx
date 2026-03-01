"use client";

import { useState, useEffect } from "react";
import {
    ShoppingCart,
    Search,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Eye,
    Receipt,
    Calendar,
    User
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { getVendas } from "@/services/vendas";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { generateVendaPDF } from "@/utils/pdfGenerator";
import { getConfigs } from "@/services/configuracoes";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";

export default function VendasPage() {
    const { profile } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [vendas, setVendas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [emittingId, setEmittingId] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [filterStartDate, setFilterStartDate] = useState<string | undefined>(undefined);
    const [filterEndDate, setFilterEndDate] = useState<string | undefined>(undefined);
    const [search, setSearch] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Realtime Sync
    useRealtimeSubscription({
        table: "vendas",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: (payload: any) => {
            console.log("Realtime Vendas:", payload.eventType, payload);

            if (payload.eventType === 'UPDATE') {
                setVendas(current => current.map(v =>
                    v.id === payload.new.id ? { ...v, ...payload.new } : v
                ));
            } else if (payload.eventType === 'INSERT') {
                loadData();
            } else if (payload.eventType === 'DELETE') {
                setVendas(current => current.filter(v => v.id !== payload.old.id));
            }
        }
    });

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id, currentPage, filterStartDate, filterEndDate]);

    // Busca com debounce simples
    useEffect(() => {
        const timer = setTimeout(() => {
            if (profile?.empresa_id) loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadData() {
        setLoading(true);
        try {
            const response = await getVendas(currentPage, 50, {
                startDate: filterStartDate,
                endDate: filterEndDate,
            });
            setVendas(response.data || []);
            setTotalPages(response.totalPages);
            setTotalItems(response.count);
        } catch (error) {
            console.error("Erro ao carregar vendas:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleExportPDF = async (venda: any) => {
        if (!venda || !profile?.empresa_id) return;
        setExportingId(venda.id);
        try {
            const configs = await getConfigs(profile.empresa_id);
            const branding = configs.nfe_emitente || {};
            generateVendaPDF(venda, branding);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        } finally {
            setExportingId(null);
        }
    };

    async function handleEmitirNFCe(vendaId: string) {
        if (!confirm("Confirmar emissão de NFC-e para esta venda?")) return;

        setEmittingId(vendaId);
        try {
            const res = await fetch("/api/nfe/emitir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendaId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao emitir NFC-e");
            }

            alert("NFC-e emitida com sucesso! Chave: " + data.resposta?.retEnviNFe?.protNFe?.infProt?.chNFe);
            loadData(); // Atualiza a lista para mostrar a chave
        } catch (error: any) {
            console.error(error);
            alert("Erro: " + error.message);
        } finally {
            setEmittingId(null);
        }
    }

    return (
        <PermissionGuard modulo="vendas">
            <div className="space-y-6 page-enter pb-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Histórico de Vendas</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Gerencie vendas realizadas e emita notas fiscais (NFC-e)</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/pdv" className="btn-primary flex items-center gap-2">
                            <ShoppingCart size={18} />
                            Nova Venda (PDV)
                        </Link>
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-wrap items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/60 shadow-sm">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                            placeholder="Buscar por cliente, ID da venda ou valor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <DateRangeFilter
                        defaultPreset="mes"
                        onChange={(start, end) => {
                            setFilterStartDate(start);
                            setFilterEndDate(end);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Lista de Vendas */}
                <GlassCard title="Últimas Vendas" icon={ShoppingCart}>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" />
                            Carregando vendas...
                        </div>
                    ) : vendas.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            Nenhuma venda encontrada.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">ID / Data</th>
                                        <th className="px-4 py-3 font-semibold">Cliente</th>
                                        <th className="px-4 py-3 font-semibold">Vendedor</th>
                                        <th className="px-4 py-3 font-semibold text-right">Valor Total</th>
                                        <th className="px-4 py-3 font-semibold text-center">NFC-e</th>
                                        <th className="px-4 py-3 font-semibold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vendas.map((venda) => (
                                        <tr key={venda.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-bold text-slate-700">
                                                        #{venda.numero ? String(venda.numero).padStart(5, '0') : venda.id.substring(0, 8)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Calendar size={10} /> {formatDate(venda.created_at)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="font-medium text-slate-700">
                                                        {venda.cliente?.nome || "Consumidor Final"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {venda.vendedor?.nome || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                R$ {(venda.total_centavos / 100).toFixed(2).replace(".", ",")}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {venda.nfce_chave ? (
                                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                                        <CheckCircle2 size={12} />
                                                        EMITIDA
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                                        PENDENTE
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!venda.nfce_chave && (
                                                        <button
                                                            onClick={() => handleEmitirNFCe(venda.id)}
                                                            disabled={emittingId === venda.id}
                                                            className={cn(
                                                                "p-2 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors",
                                                                emittingId === venda.id && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            title="Emitir NFC-e"
                                                        >
                                                            {emittingId === venda.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <Receipt size={16} />
                                                            )}
                                                        </button>
                                                    )}
                                                    {venda.nfce_chave && (
                                                        <a
                                                            href={`https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${venda.nfce_chave}`} // URL Genérica, ideal seria configurar por estado ou usar XML
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                            title="Visualizar na SEFAZ"
                                                        >
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleExportPDF(venda)}
                                                        disabled={exportingId === venda.id}
                                                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                                        title="Exportar PDF"
                                                    >
                                                        {exportingId === venda.id ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <FileText size={16} />
                                                        )}
                                                    </button>
                                                    <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white/50">
                            <span className="text-sm text-slate-500">
                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (Total de {totalItems} Vendas)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>
        </PermissionGuard >
    );
}
