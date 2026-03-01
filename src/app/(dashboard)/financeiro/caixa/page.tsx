"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCaixaAberto, abrirCaixa, fecharCaixa, getMovimentacoesCaixa, registrarMovimentacaoCaixa } from "@/services/caixa";
import { createClient } from "@/lib/supabase/client";
import { type Caixa, type CaixaMovimentacao } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Calculator, DollarSign, LogOut, ArrowUpCircle, ArrowDownCircle,
    PlayCircle, StopCircle, ShoppingCart, History as HistoryIcon,
    Banknote, CreditCard, QrCode, Clock, User, TrendingUp, TrendingDown,
    ChevronDown, ChevronUp, FileText, Wallet, Receipt
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

const supabase = createClient();

const TIPO_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    venda: { label: "Venda", icon: ShoppingCart, color: "text-emerald-600 bg-emerald-50" },
    recebimento_os: { label: "Recebimento OS", icon: Receipt, color: "text-blue-600 bg-blue-50" },
    reforco: { label: "Reforço", icon: ArrowUpCircle, color: "text-indigo-600 bg-indigo-50" },
    sangria: { label: "Sangria", icon: ArrowDownCircle, color: "text-rose-600 bg-rose-50" },
    pagamento_despesa: { label: "Pagamento", icon: TrendingDown, color: "text-red-600 bg-red-50" },
};

const PAGAMENTO_ICONS: Record<string, any> = {
    dinheiro: Banknote,
    credito: CreditCard,
    debito: CreditCard,
    pix: QrCode,
};

export default function CaixaPage() {
    const { profile } = useAuth();
    const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
    const [expandedCaixa, setExpandedCaixa] = useState<string | null>(null);
    const [expandedMovs, setExpandedMovs] = useState<CaixaMovimentacao[]>([]);

    // Modals
    const [showAbertura, setShowAbertura] = useState(false);
    const [showFechamento, setShowFechamento] = useState(false);
    const [showMovimentacao, setShowMovimentacao] = useState<"sangria" | "reforco" | null>(null);

    // Form states
    const [valorInput, setValorInput] = useState("");
    const [obsInput, setObsInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Tab
    const [tab, setTab] = useState<"atual" | "historico">("atual");

    useEffect(() => {
        if (profile?.empresa_id) loadData();
    }, [profile?.empresa_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const caixa = await getCaixaAberto(profile!.empresa_id);
            setCaixaAberto(caixa);

            if (caixa) {
                const movs = await getMovimentacoesCaixa(caixa.id);
                setMovimentacoes(movs);
            }

            // Carregar histórico de caixas fechados
            const { data: historico } = await supabase
                .from("caixas")
                .select("*, usuario_abertura:usuarios!caixas_usuario_abertura_id_fkey(nome), usuario_fechamento:usuarios!caixas_usuario_fechamento_id_fkey(nome)")
                .eq("empresa_id", profile!.empresa_id)
                .eq("status", "fechado")
                .order("data_fechamento", { ascending: false })
                .limit(20);
            setHistoricoCaixas(historico || []);
        } catch (error) {
            console.error("Erro ao carregar caixa:", error);
            toast.error("Erro ao carregar os dados do caixa.");
        } finally {
            setLoading(false);
        }
    };

    const parseCentavos = (val: string) => Math.round(parseFloat(val.replace(/\./g, '').replace(',', '.')) * 100) || 0;

    const handleAbrirCaixa = async () => {
        if (!profile) return;
        const saldoInicial = parseCentavos(valorInput);
        setSubmitting(true);
        try {
            await abrirCaixa(profile.empresa_id, profile.id, saldoInicial, obsInput);
            toast.success("Caixa aberto com sucesso!");
            setShowAbertura(false);
            setValorInput("");
            setObsInput("");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao abrir o caixa.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMovimentacao = async () => {
        if (!profile || !caixaAberto || !showMovimentacao) return;
        const valorCentavos = parseCentavos(valorInput);
        if (valorCentavos <= 0) {
            toast.error("Insira um valor maior que zero.");
            return;
        }
        setSubmitting(true);
        try {
            await registrarMovimentacaoCaixa({
                empresa_id: profile.empresa_id,
                caixa_id: caixaAberto.id,
                usuario_id: profile.id,
                vendedor_id: profile.id,
                tipo: showMovimentacao,
                forma_pagamento: 'dinheiro',
                valor_centavos: valorCentavos,
                observacao: obsInput,
                origem_id: null
            });
            toast.success(showMovimentacao === 'sangria' ? "Sangria registrada!" : "Reforço registrado!");
            setShowMovimentacao(null);
            setValorInput("");
            setObsInput("");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao registrar a movimentação.");
        } finally {
            setSubmitting(false);
        }
    };

    const calcularSaldoEsperado = () => {
        if (!caixaAberto) return 0;
        let saldo = caixaAberto.saldo_inicial;
        for (const mov of movimentacoes) {
            if (['venda', 'recebimento_os', 'reforco'].includes(mov.tipo)) {
                saldo += mov.valor_centavos;
            } else if (['sangria', 'pagamento_despesa'].includes(mov.tipo)) {
                saldo -= mov.valor_centavos;
            }
        }
        return saldo;
    };

    const handleFecharCaixa = async () => {
        if (!profile || !caixaAberto) return;
        const saldoInformado = parseCentavos(valorInput);
        const esperado = calcularSaldoEsperado();
        const diferenca = saldoInformado - esperado;
        setSubmitting(true);
        try {
            await fecharCaixa(caixaAberto.id, profile.id, saldoInformado, diferenca, obsInput);
            toast.success("Caixa fechado com sucesso!");
            setShowFechamento(false);
            setValorInput("");
            setObsInput("");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Erro ao fechar o caixa.");
        } finally {
            setSubmitting(false);
        }
    };

    async function toggleHistoricoCaixa(caixaId: string) {
        if (expandedCaixa === caixaId) {
            setExpandedCaixa(null);
            setExpandedMovs([]);
            return;
        }
        setExpandedCaixa(caixaId);
        try {
            const movs = await getMovimentacoesCaixa(caixaId);
            setExpandedMovs(movs);
        } catch (e) {
            toast.error("Erro ao carregar movimentações.");
        }
    }

    // === Cálculos ===
    const breakdown = useMemo(() => {
        const vendas = movimentacoes.filter(m => m.tipo === 'venda');
        const formaPagamento: Record<string, number> = {};
        vendas.forEach(m => {
            const fp = m.forma_pagamento || 'outro';
            formaPagamento[fp] = (formaPagamento[fp] || 0) + m.valor_centavos;
        });

        const totalVendas = vendas.reduce((a, b) => a + b.valor_centavos, 0);
        const totalRecebimentoOS = movimentacoes.filter(m => m.tipo === 'recebimento_os').reduce((a, b) => a + b.valor_centavos, 0);
        const totalReforcos = movimentacoes.filter(m => m.tipo === 'reforco').reduce((a, b) => a + b.valor_centavos, 0);
        const totalSangrias = movimentacoes.filter(m => m.tipo === 'sangria').reduce((a, b) => a + b.valor_centavos, 0);
        const totalPagamentos = movimentacoes.filter(m => m.tipo === 'pagamento_despesa').reduce((a, b) => a + b.valor_centavos, 0);
        const qtdVendas = vendas.length;

        return { formaPagamento, totalVendas, totalRecebimentoOS, totalReforcos, totalSangrias, totalPagamentos, qtdVendas };
    }, [movimentacoes]);

    // Modal reutilizável
    const ModalForm = ({ title, confirmLabel, onConfirm, onCancel, confirmColor }: any) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-slate-800 mb-6">{title}</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor (R$)</label>
                        <input
                            type="text"
                            placeholder="0,00"
                            className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={valorInput}
                            onChange={(e) => setValorInput(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Observações (Opcional)</label>
                        <textarea
                            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-24"
                            placeholder="Descreva o motivo..."
                            value={obsInput}
                            onChange={(e) => setObsInput(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={onCancel} className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 border border-slate-200 transition-colors">Cancelar</button>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        className={cn("flex-1 h-12 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2", confirmColor, submitting && "opacity-70")}
                    >
                        {submitting ? "Processando..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 page-enter pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Controle de Caixa</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Gestão completa de caixa — acompanhe movimentações, sangrias, reforços e relatórios</p>
                </div>
                {!caixaAberto ? (
                    <button
                        onClick={() => setShowAbertura(true)}
                        className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <PlayCircle size={20} /> Abrir Caixa do Dia
                    </button>
                ) : (
                    <button
                        onClick={() => setShowFechamento(true)}
                        className="h-12 px-6 rounded-2xl bg-red-600 text-white font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                    >
                        <StopCircle size={20} /> Fechar Caixa
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/40 p-1 rounded-xl border border-white/60 w-fit">
                <button
                    onClick={() => setTab("atual")}
                    className={cn(
                        "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                        tab === "atual" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Caixa Atual
                </button>
                <button
                    onClick={() => setTab("historico")}
                    className={cn(
                        "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                        tab === "historico" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Histórico de Fechamentos
                </button>
            </div>

            {tab === "atual" && (
                <>
                    {!caixaAberto ? (
                        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <Calculator size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Caixa Fechado</h3>
                            <p className="text-slate-500 mb-4 max-w-sm mx-auto">
                                Abra o caixa para começar a registrar vendas e movimentações.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Status + KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <GlassCard className="bg-indigo-600 border-indigo-500 text-white relative overflow-hidden col-span-1">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Status</p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="font-bold text-sm">Aberto</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-300">{formatDate(caixaAberto.data_abertura)}</p>
                                </GlassCard>

                                <GlassCard>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fundo Inicial</p>
                                    <p className="text-xl font-black text-slate-800">{formatCurrency(caixaAberto.saldo_inicial)}</p>
                                </GlassCard>

                                <GlassCard>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">🛒 Vendas ({breakdown.qtdVendas})</p>
                                    <p className="text-xl font-black text-emerald-700">{formatCurrency(breakdown.totalVendas)}</p>
                                </GlassCard>

                                <GlassCard>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Sangrias</p>
                                    <p className="text-xl font-black text-rose-600">{formatCurrency(breakdown.totalSangrias)}</p>
                                </GlassCard>

                                <GlassCard className="border-2 border-brand-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Saldo Esperado</p>
                                    <p className="text-xl font-black text-brand-700">{formatCurrency(calcularSaldoEsperado())}</p>
                                </GlassCard>
                            </div>

                            {/* Breakdown por Forma de Pagamento */}
                            {Object.keys(breakdown.formaPagamento).length > 0 && (
                                <GlassCard className="p-5">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <Wallet size={14} /> Vendas por Forma de Pagamento
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {Object.entries(breakdown.formaPagamento).sort((a, b) => b[1] - a[1]).map(([fp, valor]) => {
                                            const Icon = PAGAMENTO_ICONS[fp.split('_')[0]] || DollarSign;
                                            return (
                                                <div key={fp} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                                                        <Icon size={16} className="text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{fp.replace(/_/g, ' ')}</p>
                                                        <p className="text-sm font-black text-slate-800">{formatCurrency(valor)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </GlassCard>
                            )}

                            {/* Ações Rápidas */}
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowMovimentacao('reforco')}
                                    className="flex-1 bg-white border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 transition-colors rounded-2xl p-5 flex items-center justify-center gap-3 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ArrowUpCircle size={20} />
                                    </div>
                                    <span className="font-bold text-emerald-700">Reforço (Entrada)</span>
                                </button>

                                <button
                                    onClick={() => setShowMovimentacao('sangria')}
                                    className="flex-1 bg-white border border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-colors rounded-2xl p-5 flex items-center justify-center gap-3 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ArrowDownCircle size={20} />
                                    </div>
                                    <span className="font-bold text-rose-700">Sangria (Retirada)</span>
                                </button>
                            </div>

                            {/* Tabela de Movimentações */}
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <HistoryIcon size={16} className="text-slate-400" />
                                    <h3 className="font-bold text-slate-800 text-sm">Movimentações do Caixa Atual</h3>
                                    <span className="ml-auto text-xs text-slate-400 font-bold">{movimentacoes.length} movimentações</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-100 bg-slate-50/40">
                                                <th className="px-6 py-3">Hora</th>
                                                <th className="px-6 py-3">Tipo</th>
                                                <th className="px-6 py-3">Detalhes</th>
                                                <th className="px-6 py-3">Forma Pgto</th>
                                                <th className="px-6 py-3 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {movimentacoes.map((mov: CaixaMovimentacao) => {
                                                const isEntrada = ['venda', 'recebimento_os', 'reforco'].includes(mov.tipo);
                                                const tipoInfo = TIPO_LABELS[mov.tipo] || { label: mov.tipo, icon: DollarSign, color: "text-slate-600 bg-slate-50" };
                                                const TipoIcon = tipoInfo.icon;
                                                const PgtoIcon = PAGAMENTO_ICONS[mov.forma_pagamento?.split('_')[0]] || DollarSign;
                                                return (
                                                    <tr key={mov.id} className="hover:bg-slate-50/50">
                                                        <td className="px-6 py-3 font-bold text-slate-500 text-xs">
                                                            {new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase", tipoInfo.color)}>
                                                                <TipoIcon size={11} /> {tipoInfo.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-600 text-xs max-w-[200px] truncate">
                                                            {mov.observacao || "—"}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 capitalize">
                                                                <PgtoIcon size={12} /> {(mov.forma_pagamento || '—').replace(/_/g, ' ')}
                                                            </div>
                                                        </td>
                                                        <td className={cn("px-6 py-3 text-right font-black text-sm", isEntrada ? "text-emerald-600" : "text-rose-600")}>
                                                            {isEntrada ? '+' : '-'} {formatCurrency(mov.valor_centavos)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {movimentacoes.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                        <ShoppingCart size={28} className="mx-auto mb-2 opacity-20" />
                                                        Nenhuma movimentação neste caixa ainda.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    )}
                </>
            )}

            {/* === TAB HISTÓRICO === */}
            {tab === "historico" && (
                <div className="space-y-4">
                    {historicoCaixas.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
                            <FileText size={40} className="mx-auto mb-4 text-slate-200" />
                            <h3 className="font-bold text-slate-800 mb-1">Nenhum fechamento registrado</h3>
                            <p className="text-sm text-slate-400">Os relatórios de caixa aparecerão aqui após o primeiro fechamento.</p>
                        </div>
                    ) : (
                        historicoCaixas.map((caixa) => {
                            const isOpen = expandedCaixa === caixa.id;
                            const diferenca = caixa.diferenca_fechamento || 0;
                            return (
                                <GlassCard key={caixa.id} className="p-0 overflow-hidden">
                                    <button
                                        onClick={() => toggleHistoricoCaixa(caixa.id)}
                                        className="w-full text-left px-6 py-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                            <FileText size={18} className="text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-slate-800">
                                                    {new Date(caixa.data_abertura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </p>
                                                {diferenca !== 0 && (
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                                                        diferenca > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                    )}>
                                                        {diferenca > 0 ? "Sobra" : "Falta"}: {formatCurrency(Math.abs(diferenca))}
                                                    </span>
                                                )}
                                                {diferenca === 0 && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase">
                                                        ✓ Caixa bateu
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <User size={10} /> Aberto por: <b className="text-slate-600">{caixa.usuario_abertura?.nome || "—"}</b>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User size={10} /> Fechado por: <b className="text-slate-600">{caixa.usuario_fechamento?.nome || "—"}</b>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} /> {caixa.data_fechamento ? new Date(caixa.data_fechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "—"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 mr-2">
                                            <p className="text-xs text-slate-400">Fundo: {formatCurrency(caixa.saldo_inicial)}</p>
                                            <p className="text-sm font-black text-slate-800">Final: {formatCurrency(caixa.saldo_final_informado || 0)}</p>
                                        </div>
                                        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                    </button>

                                    {isOpen && (
                                        <div className="border-t border-slate-100 bg-slate-50/30">
                                            {/* Resumo do caixa expandido */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
                                                {(() => {
                                                    const vendasH = expandedMovs.filter(m => m.tipo === 'venda');
                                                    const totalVendasH = vendasH.reduce((a, b) => a + b.valor_centavos, 0);
                                                    const totalRecebH = expandedMovs.filter(m => m.tipo === 'recebimento_os').reduce((a, b) => a + b.valor_centavos, 0);
                                                    const totalSangriaH = expandedMovs.filter(m => m.tipo === 'sangria').reduce((a, b) => a + b.valor_centavos, 0);
                                                    const totalReforcoH = expandedMovs.filter(m => m.tipo === 'reforco').reduce((a, b) => a + b.valor_centavos, 0);

                                                    // Breakdown por forma de pagamento
                                                    const byPgto: Record<string, number> = {};
                                                    vendasH.forEach(m => {
                                                        const fp = m.forma_pagamento || 'outro';
                                                        byPgto[fp] = (byPgto[fp] || 0) + m.valor_centavos;
                                                    });

                                                    return (
                                                        <>
                                                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Vendas ({vendasH.length})</p>
                                                                <p className="text-lg font-black text-emerald-700">{formatCurrency(totalVendasH)}</p>
                                                            </div>
                                                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Receb. OS</p>
                                                                <p className="text-lg font-black text-blue-700">{formatCurrency(totalRecebH)}</p>
                                                            </div>
                                                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Reforços</p>
                                                                <p className="text-lg font-black text-indigo-700">{formatCurrency(totalReforcoH)}</p>
                                                            </div>
                                                            <div className="bg-white rounded-xl p-3 border border-slate-100">
                                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Sangrias</p>
                                                                <p className="text-lg font-black text-rose-700">{formatCurrency(totalSangriaH)}</p>
                                                            </div>
                                                            {/* Breakdown pagamento nesse historico */}
                                                            {Object.entries(byPgto).length > 0 && (
                                                                <div className="col-span-2 md:col-span-4 bg-white rounded-xl p-3 border border-slate-100">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vendas por Forma de Pagamento</p>
                                                                    <div className="flex flex-wrap gap-3">
                                                                        {Object.entries(byPgto).map(([fp, val]) => (
                                                                            <span key={fp} className="bg-slate-50 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-bold">
                                                                                <span className="text-slate-400 uppercase">{fp.replace(/_/g, ' ')}</span>
                                                                                <span className="text-slate-800">{formatCurrency(val)}</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Detalhes das movimentações */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-100">
                                                            <th className="px-4 py-2">Hora</th>
                                                            <th className="px-4 py-2">Tipo</th>
                                                            <th className="px-4 py-2">Obs</th>
                                                            <th className="px-4 py-2">Forma</th>
                                                            <th className="px-4 py-2 text-right">Valor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {expandedMovs.map(mov => {
                                                            const isEnt = ['venda', 'recebimento_os', 'reforco'].includes(mov.tipo);
                                                            return (
                                                                <tr key={mov.id} className="hover:bg-white/50">
                                                                    <td className="px-4 py-2 text-slate-500">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                                                    <td className="px-4 py-2 font-bold text-slate-700 capitalize">{mov.tipo.replace(/_/g, ' ')}</td>
                                                                    <td className="px-4 py-2 text-slate-400 max-w-[120px] truncate">{mov.observacao || "—"}</td>
                                                                    <td className="px-4 py-2 text-slate-500 capitalize">{(mov.forma_pagamento || '—').replace(/_/g, ' ')}</td>
                                                                    <td className={cn("px-4 py-2 text-right font-black", isEnt ? "text-emerald-600" : "text-rose-600")}>
                                                                        {isEnt ? '+' : '-'} {formatCurrency(mov.valor_centavos)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })
                    )}
                </div>
            )}

            {/* === MODALS === */}
            {showAbertura && (
                <ModalForm
                    title="Abertura de Caixa"
                    confirmLabel="Abrir Caixa"
                    onConfirm={handleAbrirCaixa}
                    onCancel={() => setShowAbertura(false)}
                    confirmColor="bg-emerald-600 hover:bg-emerald-700"
                />
            )}

            {showMovimentacao && (
                <ModalForm
                    title={showMovimentacao === 'sangria' ? "Nova Sangria" : "Novo Reforço de Caixa"}
                    confirmLabel="Registrar"
                    onConfirm={handleMovimentacao}
                    onCancel={() => setShowMovimentacao(null)}
                    confirmColor={showMovimentacao === 'sangria' ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}
                />
            )}

            {showFechamento && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <LogOut size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Fechar Caixa</h3>
                                <p className="text-xs text-slate-500">Saldo esperado: <b className="text-slate-700">{formatCurrency(calcularSaldoEsperado())}</b></p>
                            </div>
                        </div>

                        {/* Resumo rápido antes de fechar */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                <p className="text-[9px] font-black text-emerald-500 uppercase">Vendas</p>
                                <p className="text-sm font-black text-emerald-700">{formatCurrency(breakdown.totalVendas)}</p>
                            </div>
                            <div className="bg-rose-50 rounded-xl p-3 text-center">
                                <p className="text-[9px] font-black text-rose-500 uppercase">Sangrias</p>
                                <p className="text-sm font-black text-rose-700">{formatCurrency(breakdown.totalSangrias)}</p>
                            </div>
                            <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                <p className="text-[9px] font-black text-indigo-500 uppercase">Reforços</p>
                                <p className="text-sm font-black text-indigo-700">{formatCurrency(breakdown.totalReforcos)}</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
                            <strong>Atenção:</strong> Conte fisicamente o dinheiro na gaveta e insira o valor exato. Diferenças serão registradas.
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Saldo Total na Gaveta (R$)</label>
                                <input
                                    type="text"
                                    placeholder="0,00"
                                    className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={valorInput}
                                    onChange={(e) => setValorInput(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Observações (Opcional)</label>
                                <textarea
                                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none h-20"
                                    placeholder="Motivo da diferença, se houver..."
                                    value={obsInput}
                                    onChange={(e) => setObsInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowFechamento(false)} className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 border border-slate-200 transition-colors">Cancelar</button>
                            <button
                                onClick={handleFecharCaixa}
                                disabled={submitting || !valorInput}
                                className={cn("flex-1 h-12 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700", (submitting || !valorInput) && "opacity-70")}
                            >
                                {submitting ? "Fechando..." : "Confirmar Fechamento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
