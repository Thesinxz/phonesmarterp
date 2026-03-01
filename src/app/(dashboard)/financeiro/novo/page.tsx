"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    TrendingUp,
    TrendingDown,
    FileText,
    Calendar,
    Tag,
    DollarSign,
    CheckCircle2,
    Clock
} from "lucide-react";
import { createMovimentacao } from "@/services/financeiro";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

export default function NovoFinanceiroPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        tipo: "entrada" as "entrada" | "saida",
        descricao: "",
        valor: "",
        vencimento: new Date().toISOString().split('T')[0],
        categoria: "Geral",
        pago: true
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        try {
            const valorCentavos = Math.round(parseFloat(form.valor.replace(",", ".")) * 100);

            if (isNaN(valorCentavos)) {
                throw new Error("Valor inválido");
            }

            await createMovimentacao({
                empresa_id: profile.empresa_id,
                tipo: form.tipo,
                descricao: form.descricao,
                valor_centavos: valorCentavos,
                vencimento: form.vencimento ? new Date(form.vencimento).toISOString() : null,
                categoria: form.categoria,
                pago: form.pago,
                centro_custo: null
            });

            router.push("/financeiro");
            router.refresh();
        } catch (error: any) {
            console.error("Erro ao salvar movimentação:", error);
            alert("Erro ao salvar: " + (error.message || "Verifique os dados"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 page-enter max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/financeiro" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Nova Movimentação</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Registre uma nova entrada ou saída financeira</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Movimentação */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, tipo: "entrada" })}
                        className={cn(
                            "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            form.tipo === "entrada"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md scale-[1.02]"
                                : "bg-white/50 border-transparent text-slate-400 hover:bg-white"
                        )}
                    >
                        <TrendingUp size={24} />
                        <span className="font-bold">ENTRADA</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, tipo: "saida" })}
                        className={cn(
                            "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
                            form.tipo === "saida"
                                ? "bg-red-50 border-red-500 text-red-700 shadow-md scale-[1.02]"
                                : "bg-white/50 border-transparent text-slate-400 hover:bg-white"
                        )}
                    >
                        <TrendingDown size={24} />
                        <span className="font-bold">SAÍDA</span>
                    </button>
                </div>

                <GlassCard className="p-6 space-y-6">
                    {/* Descrição */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <FileText size={14} />
                            Descrição
                        </label>
                        <input
                            required
                            className="input-glass h-12"
                            placeholder="Ex: Venda de Acessórios, Aluguel, etc..."
                            value={form.descricao}
                            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Valor */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <DollarSign size={14} />
                                Valor (R$)
                            </label>
                            <input
                                required
                                className="input-glass h-12"
                                placeholder="0,00"
                                value={form.valor}
                                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                            />
                        </div>

                        {/* Vencimento */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Calendar size={14} />
                                Data / Vencimento
                            </label>
                            <input
                                required
                                type="date"
                                className="input-glass h-12"
                                value={form.vencimento}
                                onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Categoria */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Tag size={14} />
                                Categoria
                            </label>
                            <select
                                className="input-glass h-12 appearance-none"
                                value={form.categoria}
                                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                            >
                                <option value="Geral">Geral</option>
                                <option value="Vendas">Vendas</option>
                                <option value="Serviços">Serviços</option>
                                <option value="Fornecedores">Fornecedores</option>
                                <option value="Aluguel">Aluguel</option>
                                <option value="Energia/Água">Energia/Água</option>
                                <option value="Funcionários">Funcionários</option>
                                <option value="Impostos">Impostos</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Status
                            </label>
                            <div className="flex h-12 bg-slate-100/50 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, pago: true })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all",
                                        form.pago ? "bg-white shadow-sm text-emerald-600" : "text-slate-400"
                                    )}
                                >
                                    <CheckCircle2 size={14} />
                                    PAGO
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, pago: false })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all",
                                        !form.pago ? "bg-white shadow-sm text-amber-600" : "text-slate-400"
                                    )}
                                >
                                    <Clock size={14} />
                                    PENDENTE
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                <div className="flex justify-end gap-3 pt-6">
                    <Link href="/financeiro" className="btn-secondary h-12 px-8 flex items-center justify-center">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary h-12 px-10 flex items-center justify-center gap-2 shadow-brand-glow"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                SALVAR MOVIMENTAÇÃO
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
