"use client";

import { useState, useEffect } from "react";
import { Calendar, User, CreditCard, Shield, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { getTecnicoComMenosOS } from "@/services/os";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OSStep5AgendaPagamentoProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep5AgendaPagamento({ data, onChange }: OSStep5AgendaPagamentoProps) {
    const { profile } = useAuth();
    const [tecnicos, setTecnicos] = useState<any[]>([]);
    const [isLoadingTecnicos, setIsLoadingTecnicos] = useState(true);
    const [erroTecnicos, setErroTecnicos] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);

    const handleAutoAssign = async () => {
        if (!profile?.empresa_id) return;
        setIsAutoAssigning(true);
        try {
            const tecnico = await getTecnicoComMenosOS(profile.empresa_id);
            if (tecnico) {
                onChange({ ...data, tecnicoId: tecnico.id });
                toast.success(`Técnico ${tecnico.nome} atribuído automaticamente!`);
            } else {
                toast.error("Nenhum técnico disponível para auto-atribuição.");
            }
        } catch (error) {
            console.error("Erro ao auto-atribuir técnico:", error);
            toast.error("Erro ao auto-atribuir técnico.");
        } finally {
            setIsAutoAssigning(false);
        }
    };

    const loadTecnicos = async () => {
        if (!profile?.empresa_id) {
            // Se ainda está carregando o perfil, ou não tem empresa, esperamos.
            // Mas não setamos false se o profile ainda for undefined (carregando)
            if (profile === null) {
                 setTecnicos([{ id: 'auto', nome: 'Auto-atribuir (Pendente)', avatar_url: null }]);
                 setIsLoadingTecnicos(false);
            }
            return;
        }

        setIsLoadingTecnicos(true);
        setErroTecnicos(false);
        try {
            const supabase = createClient();
            const { data: users, error } = await supabase
                .from("usuarios")
                .select("id, nome")
                .eq("empresa_id", profile.empresa_id)
                .in("papel", ["tecnico", "admin", "gerente"])
                .eq("ativo", true);

            if (error) throw error;
            
            if (!users || users.length === 0) {
                 setTecnicos([{ id: 'auto', nome: 'Auto-atribuir (Nenhum técnico encontrado)', avatar_url: null }]);
            } else {
                 setTecnicos(users);
            }
        } catch (error) {
            console.error("Erro ao carregar técnicos:", error);
            setErroTecnicos(true);
        } finally {
            setIsLoadingTecnicos(false);
        }
    };

    useEffect(() => {
        if (profile?.empresa_id) {
            loadTecnicos();
        }
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
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">5</div>
                <h2>Agenda e Pagamento</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Agendamento */}
                <div>
                    <div className="section-label">RESPONSÁVEL E PRAZOS</div>

                    <div className="space-y-4">
                            <div className="wizard-field">
                                <label>TÉCNICO RESPONSÁVEL *</label>
                                {isLoadingTecnicos ? (
                                    <div className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-500">
                                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                                        <span className="text-sm font-medium">Buscando técnicos...</span>
                                    </div>
                                ) : erroTecnicos ? (
                                    <div className="w-full h-12 px-4 rounded-xl border border-red-200 bg-red-50 flex items-center justify-between text-red-600">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={16} />
                                            <span className="text-sm font-medium">Erro de conexão</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={loadTecnicos}
                                            className="text-xs font-bold bg-white text-red-600 px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                                        >
                                            Tentar Novamente
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm outline-none transition-all focus:border-indigo-600 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[position:right_1rem_center] bg-no-repeat"
                                        value={data.tecnicoId}
                                        onChange={e => onChange({ ...data, tecnicoId: e.target.value })}
                                    >
                                        <option value="">Selecione o técnico...</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id} value={t.id}>{t.nome}</option>
                                        ))}
                                    </select>
                                )}
                                <div className="mt-1 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleAutoAssign}
                                        disabled={isAutoAssigning || tecnicos.length === 0}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 disabled:opacity-50 tracking-wider uppercase"
                                    >
                                        {isAutoAssigning && <Loader2 size={10} className="animate-spin" />}
                                        Auto-atribuir
                                    </button>
                                </div>
                            </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="wizard-field mb-0">
                                <label>PRAZO ESTIMADO *</label>
                                <input
                                    type="datetime-local"
                                    value={data.prazo}
                                    onChange={e => onChange({ ...data, prazo: e.target.value })}
                                />
                            </div>
                            <div className="wizard-field mb-0">
                                <label>PRIORIDADE</label>
                                <div className="flex gap-2 h-12">
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...data, prioridade: "normal" })}
                                        className={cn(
                                            "flex-1 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all",
                                            data.prioridade === "normal" ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white border-slate-100 text-slate-300 hover:border-slate-200"
                                        )}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...data, prioridade: "urgente" })}
                                        className={cn(
                                            "flex-1 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all",
                                            data.prioridade === "urgente" ? "bg-red-50 border-red-100 text-red-600 ring-1 ring-red-100" : "bg-white border-slate-100 text-slate-300 hover:border-slate-200"
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
                <div>
                    <div className="section-label">PAGAMENTO E GARANTIA</div>

                    <div className="space-y-4">
                        <div className="wizard-field">
                            <label>FORMA DE PAGAMENTO PREFERENCIAL</label>
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

                        <div className="wizard-field mb-0">
                            <label>PRAZO DE GARANTIA</label>
                            <div className="flex flex-wrap gap-2">
                                {GARANTIAS.map(g => (
                                    <button
                                        key={g.val}
                                        type="button"
                                        onClick={() => onChange({ ...data, financas: { ...data.financas, garantia: g.val } })}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                                            data.financas.garantia === g.val ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                        )}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="section-label flex items-center gap-2">
                            💰 ADIANTAMENTO NESTA OS
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md normal-case font-medium">opcional</span>
                        </div>
                        <p className="text-[11px] text-slate-400 -mt-2 mb-3 italic leading-relaxed">
                            Sinal pago pelo cliente neste exato momento e que será descontado no total.
                        </p>

                        <div className="relative wizard-field mb-0">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                            <input
                                type="text"
                                className="w-full h-12 pl-10 pr-4"
                                placeholder="0,00"
                                value={data.valorAdiantado ? (data.valorAdiantado / 100).toFixed(2).replace(".", ",") : ""}
                                onChange={e => {
                                    const digits = e.target.value.replace(/\D/g, "");
                                    const val = Math.round(parseFloat(digits) || 0);
                                    onChange({ ...data, valorAdiantado: val });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
