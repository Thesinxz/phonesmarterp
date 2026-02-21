"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCaixaAberto, abrirCaixa, fecharCaixa, getMovimentacoesCaixa, registrarMovimentacaoCaixa } from "@/services/caixa";
import { type Caixa, type CaixaMovimentacao } from "@/types/database";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Calculator, DollarSign, LogOut, ArrowUpCircle, ArrowDownCircle,
    RefreshCcw, AlertTriangle, PlayCircle, StopCircle, ShoppingCart, History as HistoryIcon
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

export default function CaixaPage() {
    const { profile } = useAuth();
    const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
    const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAbertura, setShowAbertura] = useState(false);
    const [showFechamento, setShowFechamento] = useState(false);
    const [showMovimentacao, setShowMovimentacao] = useState<"sangria" | "reforco" | null>(null);

    // Form states
    const [valorInput, setValorInput] = useState("");
    const [obsInput, setObsInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            loadData();
        }
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
                vendedor_id: profile.id, // Assumindo que quem registra é o vendedor/operador logado
                tipo: showMovimentacao,
                forma_pagamento: 'dinheiro', // Reforços e sangrias normalmente são em espécie
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

    if (loading) {
        return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

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

    return (
        <div className="space-y-6 page-enter max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Controle de Caixa</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Frente de Loja (PDV)</p>
                </div>
                {!caixaAberto ? (
                    <button
                        onClick={() => setShowAbertura(true)}
                        className="h-12 px-6 rounded-2xl bg-emerald-600 text-white font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <PlayCircle size={20} />
                        Abrir Caixa do Dia
                    </button>
                ) : (
                    <button
                        onClick={() => setShowFechamento(true)}
                        className="h-12 px-6 rounded-2xl bg-red-600 text-white font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                    >
                        <StopCircle size={20} />
                        Fechar Caixa
                    </button>
                )}
            </div>

            {!caixaAberto ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <Calculator size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Caixa Fechado</h3>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">Para iniciar as vendas, receber pagamentos de OS ou fazer movimentações, você precisa abrir o caixa do seu turno.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Status do Caixa Atual */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <GlassCard className="bg-indigo-600 border-indigo-500 text-white relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Status do Caixa</p>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-bold">Aberto</span>
                            </div>
                            <p className="text-[10px] text-indigo-300">Desde {formatDate(caixaAberto.data_abertura)}</p>
                        </GlassCard>

                        <GlassCard className="h-full">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Fundo (Saldo Inicial)</p>
                            <p className="text-2xl font-black text-slate-800">{formatCurrency(caixaAberto.saldo_inicial)}</p>
                        </GlassCard>

                        <GlassCard className="h-full">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Entradas Hoje</p>
                            <p className="text-2xl font-black text-slate-800">
                                {formatCurrency(movimentacoes.filter(m => ['venda', 'recebimento_os', 'reforco'].includes(m.tipo)).reduce((a, b) => a + b.valor_centavos, 0))}
                            </p>
                        </GlassCard>

                        <GlassCard className="h-full">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Saídas / Sangrias</p>
                            <p className="text-2xl font-black text-slate-800">
                                {formatCurrency(movimentacoes.filter(m => ['sangria', 'pagamento_despesa'].includes(m.tipo)).reduce((a, b) => a + b.valor_centavos, 0))}
                            </p>
                        </GlassCard>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowMovimentacao('reforco')}
                            className="flex-1 bg-white border border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 transition-colors rounded-2xl p-6 flex items-center justify-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowUpCircle size={20} />
                            </div>
                            <span className="font-bold text-emerald-700">Reforço (Entrada)</span>
                        </button>

                        <button
                            onClick={() => setShowMovimentacao('sangria')}
                            className="flex-1 bg-white border border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-colors rounded-2xl p-6 flex items-center justify-center gap-3 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowDownCircle size={20} />
                            </div>
                            <span className="font-bold text-rose-700">Sangria (Retirada)</span>
                        </button>
                    </div>

                    <GlassCard title="Movimentações do Dia" icon={HistoryIcon}>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-100">
                                        <th className="px-4 py-3">Hora</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Forma Pgto</th>
                                        <th className="px-4 py-3 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimentacoes.map((mov: CaixaMovimentacao) => {
                                        const isEntrada = ['venda', 'recebimento_os', 'reforco'].includes(mov.tipo);
                                        return (
                                            <tr key={mov.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-500">
                                                    {new Date(mov.created_at).toLocaleTimeString().slice(0, 5)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-700 capitalize">{mov.tipo.replace('_', ' ')}</span>
                                                    {mov.observacao && <span className="block text-[10px] text-slate-400 mt-0.5">{mov.observacao}</span>}
                                                </td>
                                                <td className="px-4 py-3 capitalize text-slate-600">{mov.forma_pagamento.replace('_', ' ')}</td>
                                                <td className={cn("px-4 py-3 text-right font-black", isEntrada ? "text-emerald-600" : "text-rose-600")}>
                                                    {isEntrada ? '+' : '-'} {formatCurrency(mov.valor_centavos)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {movimentacoes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma movimentação registrada neste caixa ainda.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}

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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <LogOut size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Finalizar Expediente</h3>
                                <p className="text-xs text-slate-500">Saldo no sistema: {formatCurrency(calcularSaldoEsperado())}</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
                            <strong>Atenção:</strong> Conte o dinheiro na gaveta de caixa fisicamente e insira o valor exato abaixo. Diferenças serão registradas.
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
                                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none h-24"
                                    placeholder="Motivo da diferença de caixa, se houver..."
                                    value={obsInput}
                                    onChange={(e) => setObsInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowFechamento(false)} className="flex-1 h-12 rounded-xl text-slate-500 font-bold hover:bg-slate-50 border border-slate-200 transition-colors">Cancelar</button>
                            <button
                                onClick={handleFecharCaixa}
                                disabled={submitting || !valorInput}
                                className={cn("flex-1 h-12 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700", submitting || !valorInput ? "opacity-70" : "")}
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
