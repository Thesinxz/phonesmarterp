"use client";

import { useState, useEffect } from "react";
import { Calendar, User, CreditCard, Shield, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";

interface OSStep5AgendaPagamentoProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep5AgendaPagamento({ data, onChange }: OSStep5AgendaPagamentoProps) {
    const { profile } = useAuth();
    const [tecnicos, setTecnicos] = useState<any[]>([]);

    useEffect(() => {
        const loadTecnicos = async () => {
            if (!profile?.empresa_id) return;
            const supabase = createClient();
            const { data: users, error } = await supabase
                .from("usuarios")
                .select("id, nome")
                .eq("empresa_id", profile.empresa_id)
                .eq("ativo", true);

            if (error) {
                console.error("Erro ao carregar técnicos:", error);
                return;
            }
            setTecnicos(users || []);
        };
        loadTecnicos();
    }, [profile?.empresa_id]);

    const PAGAMENTOS = [
        { id: "pix", label: "PIX", icon: "⚡" },
        { id: "dinheiro", label: "Dinheiro", icon: "💵" },
        { id: "cartao_credito", label: "Cartão de Crédito", icon: "💳" },
        { id: "cartao_debito", label: "Cartão de Débito", icon: "💳" },
        { id: "a_combinar", label: "A Combinar", icon: "🤝" },
    ];

    const GARANTIAS = [
        { val: "0", label: "Sem Garantia" },
        { val: "30", label: "30 Dias" },
        { val: "60", label: "60 Dias" },
        { val: "90", label: "90 Dias (Padrão)" },
        { val: "180", label: "180 Dias" },
        { val: "365", label: "1 Ano" },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Agendamento */}
                <div className="space-y-6">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} /> Agendamento e Responsabilidade
                    </label>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Técnico Responsável *</label>
                            <select
                                className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                value={data.tecnicoId}
                                onChange={e => onChange({ ...data, tecnicoId: e.target.value })}
                            >
                                <option value="">Selecione o técnico...</option>
                                {tecnicos.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prazo Estimado *</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={data.prazo}
                                    onChange={e => onChange({ ...data, prazo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridade</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...data, prioridade: "normal" })}
                                        className={cn(
                                            "flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all",
                                            data.prioridade === "normal" ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white border-slate-100 text-slate-300"
                                        )}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...data, prioridade: "urgente" })}
                                        className={cn(
                                            "flex-1 h-12 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all",
                                            data.prioridade === "urgente" ? "bg-red-50 border-red-100 text-red-600 ring-2 ring-red-100" : "bg-white border-slate-100 text-slate-300"
                                        )}
                                    >
                                        🚀 Urgente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pagamento e Garantia */}
                <div className="space-y-6">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={16} /> Pagamento e Garantia
                    </label>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento Preferencial</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAGAMENTOS.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => onChange({ ...data, financas: { ...data.financas, formaPagamento: p.id } })}
                                        className={cn(
                                            "p-3 rounded-xl border text-sm font-bold transition-all flex items-center gap-2",
                                            data.financas.formaPagamento === p.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                                        )}
                                    >
                                        <span>{p.icon}</span> {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Shield size={12} /> Prazo de Garantia
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {GARANTIAS.map(g => (
                                    <button
                                        key={g.val}
                                        type="button"
                                        onClick={() => onChange({ ...data, financas: { ...data.financas, garantia: g.val } })}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                                            data.financas.garantia === g.val ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
