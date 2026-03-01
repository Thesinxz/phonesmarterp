"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    listarCrediarios,
    getCrediarioMetricas,
    formatarValor,
} from "@/services/crediario";
import {
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Search,
    Filter,
    Eye,
    Printer,
    Loader2,
    CreditCard,
    TrendingUp,
    Users,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { CrediarioModal } from "@/components/financeiro/CrediarioModal";
import { CrediarioDetalhes } from "@/components/financeiro/CrediarioDetalhes";

export default function CrediarioPage() {
    const { empresa } = useAuth();
    const [crediarios, setCrediarios] = useState<any[]>([]);
    const [metricas, setMetricas] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState("");
    const [busca, setBusca] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedCrediario, setSelectedCrediario] = useState<string | null>(null);

    async function carregarDados() {
        try {
            setLoading(true);
            const [lista, met] = await Promise.all([
                listarCrediarios(filtroStatus ? { status: filtroStatus } : undefined),
                getCrediarioMetricas(),
            ]);
            setCrediarios(lista || []);
            setMetricas(met);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar crediários");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregarDados();
    }, [filtroStatus]);

    const filtrados = useMemo(() => {
        if (!busca.trim()) return crediarios;
        const term = busca.toLowerCase();
        return crediarios.filter((c: any) =>
            c.cliente?.nome?.toLowerCase().includes(term) ||
            c.numero?.toString().includes(term) ||
            c.cliente?.cpf_cnpj?.includes(term)
        );
    }, [crediarios, busca]);

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        ativo: { label: "Ativo", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
        quitado: { label: "Quitado", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        inadimplente: { label: "Inadimplente", color: "text-red-600", bg: "bg-red-50 border-red-200" },
        cancelado: { label: "Cancelado", color: "text-slate-400", bg: "bg-slate-50 border-slate-200" },
    };

    function getParcelasPagas(parcelas: any[]): number {
        return parcelas?.filter((p: any) => p.status === "pago").length || 0;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Crediário</h1>
                    <p className="text-xs text-slate-400 font-bold mt-1">Parcelamento próprio da loja • Controle de inadimplência</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                >
                    <Plus size={18} />
                    Novo Crediário
                </button>
            </div>

            {/* Métricas */}
            {metricas && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-5 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <CreditCard size={18} className="text-blue-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Em Aberto</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">
                            {formatarValor(metricas.total_aberto_centavos)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{metricas.contratos_ativos} contratos ativos</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-5 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <TrendingUp size={18} className="text-amber-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">A Receber (Mês)</span>
                        </div>
                        <p className="text-xl font-black text-slate-800">
                            {formatarValor(metricas.a_receber_mes_centavos)}
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-5 border border-red-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={18} className="text-red-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Inadimplente</span>
                        </div>
                        <p className="text-xl font-black text-red-600">
                            {formatarValor(metricas.total_inadimplente_centavos)}
                        </p>
                        <p className="text-[10px] text-red-400 mt-1">{metricas.contratos_inadimplentes} contratos</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] p-5 border border-emerald-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 size={18} className="text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recebido Total</span>
                        </div>
                        <p className="text-xl font-black text-emerald-600">
                            {formatarValor(metricas.total_recebido_centavos)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{metricas.contratos_quitados} quitados</p>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                        type="text"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por cliente, nº crediário ou CPF..."
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-700 focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {["", "ativo", "inadimplente", "quitado"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFiltroStatus(s)}
                            className={cn(
                                "px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border-2",
                                filtroStatus === s
                                    ? "bg-brand-500 text-white border-brand-500 shadow-md"
                                    : "bg-white text-slate-500 border-slate-100 hover:border-brand-200"
                            )}
                        >
                            {s === "" ? "Todos" : statusConfig[s]?.label || s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white/80 backdrop-blur-sm rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-brand-500" />
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <FileText size={48} className="text-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-400">Nenhum crediário encontrado</p>
                        <p className="text-xs text-slate-300 mt-1">Clique em &quot;Novo Crediário&quot; para começar</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Total</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Parcelas</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.map((c: any) => {
                                    const sc = statusConfig[c.status] || statusConfig.ativo;
                                    const pagas = getParcelasPagas(c.parcelas);
                                    return (
                                        <tr
                                            key={c.id}
                                            className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedCrediario(c.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono font-bold text-slate-500">#{c.numero}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800">{c.cliente?.nome}</p>
                                                <p className="text-[10px] text-slate-400">{c.cliente?.cpf_cnpj || c.cliente?.telefone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-700">{formatarValor(c.valor_total_centavos)}</p>
                                                {c.entrada_centavos > 0 && (
                                                    <p className="text-[10px] text-slate-400">Entrada: {formatarValor(c.entrada_centavos)}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                                            style={{ width: `${(pagas / c.num_parcelas) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">
                                                        {pagas}/{c.num_parcelas}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-slate-50 text-slate-500">
                                                    {c.tipo === "efibank" ? "Boleto" : "Interno"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border", sc.bg, sc.color)}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCrediario(c.id);
                                                    }}
                                                    className="p-2 hover:bg-brand-50 rounded-xl text-slate-400 hover:text-brand-500 transition-colors"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modais */}
            {showModal && (
                <CrediarioModal
                    onClose={() => setShowModal(false)}
                    onCreated={(novoId) => {
                        setShowModal(false);
                        carregarDados();
                        if (novoId) {
                            setSelectedCrediario(novoId);
                        }
                    }}
                />
            )}

            {selectedCrediario && (
                <CrediarioDetalhes
                    crediarioId={selectedCrediario}
                    onClose={() => setSelectedCrediario(null)}
                    onUpdate={carregarDados}
                />
            )}
        </div>
    );
}
