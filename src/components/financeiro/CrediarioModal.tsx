"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { calcularParcelas, criarCrediario, formatarValor } from "@/services/crediario";
import {
    X, CreditCard, Loader2, Search, Calculator,
    DollarSign, Calendar, Percent, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface CrediarioModalProps {
    onClose: () => void;
    onCreated: () => void;
    vendaId?: string;
    valorInicial?: number;
    clienteInicial?: string;
}

export function CrediarioModal({ onClose, onCreated, vendaId, valorInicial, clienteInicial }: CrediarioModalProps) {
    const { empresa } = useAuth();
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState<any[]>([]);
    const [buscaCliente, setBuscaCliente] = useState("");
    const [showClienteList, setShowClienteList] = useState(false);

    // Form state
    const [clienteId, setClienteId] = useState(clienteInicial || "");
    const [clienteNome, setClienteNome] = useState("");
    const [valorTotal, setValorTotal] = useState(valorInicial ? (valorInicial / 100).toFixed(2) : "");
    const [entrada, setEntrada] = useState("");
    const [numParcelas, setNumParcelas] = useState(3);
    const [juros, setJuros] = useState("0");
    const [multa, setMulta] = useState("2");
    const [tipo, setTipo] = useState<"interno" | "efibank">("interno");
    const [observacoes, setObservacoes] = useState("");

    // Buscar clientes
    useEffect(() => {
        async function fetchClientes() {
            const supabase = createClient();
            const { data } = await (supabase.from("clientes") as any)
                .select("id, nome, cpf_cnpj, telefone")
                .order("nome");
            setClientes(data || []);
        }
        fetchClientes();
    }, []);

    const clientesFiltrados = useMemo(() => {
        if (!buscaCliente.trim()) return clientes.slice(0, 10);
        const term = buscaCliente.toLowerCase();
        return clientes
            .filter(c => c.nome.toLowerCase().includes(term) || c.cpf_cnpj?.includes(term))
            .slice(0, 10);
    }, [clientes, buscaCliente]);

    // Preview das parcelas
    const valorTotalCentavos = Math.round(parseFloat(valorTotal || "0") * 100);
    const entradaCentavos = Math.round(parseFloat(entrada || "0") * 100);
    const jurosMensal = parseFloat(juros || "0");

    const previewParcelas = useMemo(() => {
        if (valorTotalCentavos <= 0 || numParcelas < 1) return [];
        return calcularParcelas(valorTotalCentavos, numParcelas, jurosMensal, entradaCentavos);
    }, [valorTotalCentavos, numParcelas, jurosMensal, entradaCentavos]);

    const valorTotalComJuros = previewParcelas.reduce((acc, p) => acc + p.valor_centavos, 0) + entradaCentavos;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!clienteId || valorTotalCentavos <= 0 || numParcelas < 1) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setLoading(true);
        try {
            await criarCrediario({
                cliente_id: clienteId,
                venda_id: vendaId,
                valor_total_centavos: valorTotalCentavos,
                entrada_centavos: entradaCentavos,
                num_parcelas: numParcelas,
                tipo,
                juros_percentual: jurosMensal,
                multa_percentual: parseFloat(multa || "2"),
                observacoes,
            });

            toast.success("Crediário criado com sucesso!");
            onCreated();
        } catch (err: any) {
            toast.error(err.message || "Erro ao criar crediário");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Novo Crediário</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Parcelamento Próprio</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                    {/* Cliente */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cliente *</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                value={clienteId ? clienteNome : buscaCliente}
                                onChange={(e) => {
                                    setBuscaCliente(e.target.value);
                                    setClienteId("");
                                    setClienteNome("");
                                    setShowClienteList(true);
                                }}
                                onFocus={() => setShowClienteList(true)}
                                placeholder="Buscar cliente por nome ou CPF..."
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                            />
                            {showClienteList && !clienteId && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto">
                                    {clientesFiltrados.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setClienteId(c.id);
                                                setClienteNome(c.nome);
                                                setShowClienteList(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <p className="text-sm font-bold text-slate-700">{c.nome}</p>
                                            <p className="text-[10px] text-slate-400">{c.cpf_cnpj || c.telefone}</p>
                                        </button>
                                    ))}
                                    {clientesFiltrados.length === 0 && (
                                        <p className="px-4 py-3 text-sm text-slate-400">Nenhum cliente encontrado</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Valor e Tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor Total (R$) *</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valorTotal}
                                    onChange={(e) => setValorTotal(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Entrada (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={entrada}
                                onChange={(e) => setEntrada(e.target.value)}
                                placeholder="0,00"
                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo</label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as any)}
                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                            >
                                <option value="interno">Crediário Interno (Recibo)</option>
                                <option value="efibank">Boleto Bancário (EfíBank)</option>
                            </select>
                        </div>
                    </div>

                    {/* Parcelas e Juros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nº Parcelas *</label>
                            <select
                                value={numParcelas}
                                onChange={(e) => setNumParcelas(parseInt(e.target.value))}
                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                            >
                                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24].map(n => (
                                    <option key={n} value={n}>{n}x</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Juros (% ao mês)</label>
                            <div className="relative">
                                <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={juros}
                                    onChange={(e) => setJuros(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Multa Atraso (%)</label>
                            <div className="relative">
                                <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={multa}
                                    onChange={(e) => setMulta(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-bold text-slate-700 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview de Parcelas */}
                    {previewParcelas.length > 0 && (
                        <div className="bg-slate-50/80 rounded-[24px] p-6 border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calculator size={16} className="text-brand-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Simulação de Parcelas
                                    </span>
                                </div>
                                {jurosMensal > 0 && (
                                    <span className="text-[10px] font-bold text-amber-500">
                                        Total com juros: {formatarValor(valorTotalComJuros)}
                                    </span>
                                )}
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                                {previewParcelas.map((p) => (
                                    <div
                                        key={p.numero}
                                        className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-slate-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-xs font-black text-brand-600">
                                                {p.numero}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                                            </span>
                                        </div>
                                        <span className="text-sm font-black text-slate-700">
                                            {formatarValor(p.valor_centavos)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {entradaCentavos > 0 && (
                                <p className="text-[10px] text-slate-400 text-center">
                                    + Entrada de {formatarValor(entradaCentavos)} no ato
                                </p>
                            )}
                        </div>
                    )}

                    {/* Observações */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações</label>
                        <textarea
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Informações adicionais sobre este crediário..."
                            rows={2}
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl text-sm font-medium text-slate-700 outline-none resize-none transition-all"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/30 flex gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !clienteId || valorTotalCentavos <= 0}
                        className="flex-[2] px-6 py-4 rounded-2xl bg-brand-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 group"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={18} className="group-hover:scale-110 transition-transform" />
                                Gerar Crediário • {numParcelas}x de {previewParcelas[0] ? formatarValor(previewParcelas[0].valor_centavos) : "..."}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
