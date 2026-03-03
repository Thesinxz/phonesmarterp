"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    User,
    Smartphone,
    Wrench,
    Package,
    Calendar,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    RotateCcw,
    Loader2,
    Bug,
    Copy,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { createDetailedOS } from "@/services/os";

// Steps Components
import { OSStep1Cliente } from "./OSStep1Cliente";
import { OSStep2Equipamento } from "./OSStep2Equipamento";
import { OSStep3Problema } from "./OSStep3Problema";
import { OSStep4PecasServicos } from "./OSStep4PecasServicos";
import { OSStep5AgendaPagamento } from "./OSStep5AgendaPagamento";
import { OSStep6Resumo } from "./OSStep6Resumo";

const STEPS = [
    { id: "cliente", label: "Cliente", icon: User },
    { id: "equipamento", label: "Equipamento", icon: Smartphone },
    { id: "problema", label: "Problema", icon: Wrench },
    { id: "servicos", label: "Peças & Serviços", icon: Package },
    { id: "agenda", label: "Agenda & Pagto", icon: Calendar },
    { id: "resumo", label: "Resumo", icon: CheckCircle2 },
];

export function OSWizard() {
    const router = useRouter();
    const { profile } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        clienteId: "",
        clienteNome: "",

        tipoEquipamento: "celular",
        marca: "",
        modelo: "",
        cor: "",
        imei: "",
        serie: "",
        senhaDispositivo: "",
        senhaTipo: "texto" as "texto" | "padrao",
        acessorios: [] as string[],

        problema: "",
        tags: [] as string[],
        checklist: {} as Record<string, any>,
        obsInternas: "",

        pecas: [] as any[],
        servicos: [] as any[],
        desconto: 0,

        tecnicoId: "",
        prazo: "",
        prioridade: "normal",
        orcamentoAprovado: false,
        financas: {
            formaPagamento: "pix",
            parcelas: 1,
            entrada: 0,
            garantia: "90"
        }
    });

    useEffect(() => {
        const saved = localStorage.getItem("smartos_nova_os_wizard");
        if (saved) {
            try {
                setFormData(JSON.parse(saved));
            } catch (e) {
                console.error("Erro ao carregar rascunho:", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("smartos_nova_os_wizard", JSON.stringify(formData));
    }, [formData]);

    const nextStep = () => {
        // Validações básicas por passo
        if (currentStep === 0 && !formData.clienteId) {
            toast.error("Selecione ou cadastre um cliente");
            return;
        }
        if (currentStep === 1 && (!formData.marca || !formData.modelo)) {
            toast.error("Marca e modelo são obrigatórios");
            return;
        }
        if (currentStep === 2 && !formData.problema && formData.tags.length === 0) {
            toast.error("Descreva o problema ou selecione tags");
            return;
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleFinalizar = async () => {
        if (!profile) {
            setLastError("Erro: Perfil de usuário não encontrado.");
            return;
        }
        setLoading(true);
        setLastError(null);

        try {
            const totalPecas = formData.pecas.reduce((acc, p) => acc + (p.preco * p.qtd), 0);
            const totalServicos = formData.servicos.reduce((acc, s) => acc + s.valor, 0);
            const valorTotalCentavos = totalPecas + totalServicos - formData.desconto;

            const payload = {
                empresa_id: profile.empresa_id,
                cliente_id: formData.clienteId,
                equipamento_id: null,
                tecnico_id: formData.tecnicoId || null,
                status: "aberta",
                problema_relatado: formData.problema || (formData.tags.join(", ")),
                tipo_equipamento: formData.tipoEquipamento,
                marca_equipamento: formData.marca,
                modelo_equipamento: formData.modelo,
                cor_equipamento: formData.cor || null,
                imei_equipamento: formData.imei || null,
                numero_serie: formData.serie || null,
                senha_dispositivo: formData.senhaDispositivo || null,
                senha_tipo: formData.senhaTipo || 'texto',
                acessorios_recebidos: formData.acessorios,
                problemas_tags: formData.tags,
                checklist_entrada_json: formData.checklist,
                observacoes_internas: formData.obsInternas || null,
                pecas_json: formData.pecas,
                mao_obra_json: formData.servicos,
                valor_total_centavos: valorTotalCentavos,
                desconto_centavos: formData.desconto,
                garantia_dias: parseInt(formData.financas.garantia),
                forma_pagamento: formData.financas.formaPagamento,
                prazo_estimado: formData.prazo || null,
                prioridade: formData.prioridade,
                orcamento_aprovado: formData.orcamentoAprovado,
                orcamento_aprovado_em: formData.orcamentoAprovado ? new Date().toISOString() : null,
                orcamento_aprovado_por: formData.orcamentoAprovado ? profile.nome : null
            };

            const os = await createDetailedOS(payload, profile.id);
            toast.success("Ordem de Serviço aberta com sucesso!");
            localStorage.removeItem("smartos_nova_os_wizard");
            router.push(`/os/${os.id}`);
        } catch (error: any) {
            const errorDetail = error?.code
                ? `[${error.code}] ${error.message}${error.hint ? ' | Dica: ' + error.hint : ''}`
                : (error.message || JSON.stringify(error));
            setLastError(errorDetail);
            toast.error(`Erro: ${errorDetail}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-28 px-2">
            {/* Header / Stepper */}
            <div className="mb-8 overflow-x-auto scrollbar-none py-4 bg-slate-50/50 rounded-3xl border border-white/50 px-2 sticky top-[72px] z-30 backdrop-blur-sm">
                <div className="flex items-center justify-between min-w-max px-4 gap-4">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0",
                            showDebug ? "bg-amber-100 text-amber-600 shadow-lg shadow-amber-500/20" : "bg-white text-slate-300 hover:text-slate-500 border border-slate-100"
                        )}
                        title="Painel de Diagnóstico"
                    >
                        <Bug size={20} />
                    </button>

                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const active = index === currentStep;
                        const completed = index < currentStep;

                        return (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => index <= currentStep && setCurrentStep(index)}>
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110" :
                                            completed ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-100"
                                    )}>
                                        <Icon size={20} />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest",
                                        active ? "text-indigo-600" : completed ? "text-emerald-500" : "text-slate-400"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>

                                {index < STEPS.length - 1 && (
                                    <div className={cn(
                                        "w-12 h-[2px] mx-4 rounded-full",
                                        completed ? "bg-emerald-500" : "bg-slate-200"
                                    )} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="page-enter px-4">
                {currentStep === 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</div>
                                Quem é o cliente?
                            </h2>
                        </div>
                        <OSStep1Cliente
                            onSelect={(id, nome) => setFormData(p => ({ ...p, clienteId: id, clienteNome: nome }))}
                            selectedId={formData.clienteId}
                        />
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</div>
                            Qual o equipamento?
                        </h2>
                        <OSStep2Equipamento
                            data={formData}
                            onChange={(d) => setFormData(d)}
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</div>
                            O que está acontecendo?
                        </h2>
                        <OSStep3Problema
                            data={formData}
                            onChange={(d) => setFormData(d)}
                        />
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">4</div>
                            Materiais e Mão de Obra
                        </h2>
                        <OSStep4PecasServicos
                            data={formData}
                            onChange={(d) => setFormData(d)}
                        />
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">5</div>
                            Agenda, Responsável e Pagamento
                        </h2>
                        <OSStep5AgendaPagamento
                            data={formData}
                            onChange={(d) => setFormData(d)}
                        />
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">6</div>
                            Confira os dados da Ordem de Serviço
                        </h2>
                        <OSStep6Resumo data={formData} onChange={(d) => setFormData(d)} />
                    </div>
                )}

                {/* Debug Panel Section */}
                {showDebug && (
                    <div className="mt-12 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Bug className="text-amber-400" size={18} />
                                <span className="text-white font-bold text-sm tracking-tight">Diagnostic Info</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify({ formData, lastError }, null, 2));
                                    toast.success("Dados copiados para o clipboard!");
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white text-xs font-bold transition-all"
                            >
                                <Copy size={14} /> Copiar Diagnóstico
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {lastError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-1">Último Erro Encontrado</p>
                                    <p className="text-red-200 font-mono text-xs break-all">{lastError}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Internal State (JSON)</p>
                                    <div className="flex gap-2">
                                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase", profile?.empresa_id ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                                            Auth: {profile?.empresa_id ? "Active" : "None"}
                                        </span>
                                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase", formData.clienteId ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
                                            Step 1: {formData.clienteId ? "Linked" : "No Client"}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                                    <pre className="text-emerald-400 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                                        {JSON.stringify(formData, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 z-40">
                <div className="max-w-full mx-auto flex items-center justify-between px-6">
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm("Deseja realmente limpar tudo?")) {
                                localStorage.removeItem("smartos_nova_os_wizard");
                                window.location.reload();
                            }
                        }}
                        className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
                    >
                        <RotateCcw size={18} /> <span className="text-xs font-bold uppercase hidden sm:inline">Limpar</span>
                    </button>

                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="h-12 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <ArrowLeft size={18} /> Voltar
                            </button>
                        )}

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="h-12 px-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                            >
                                Continuar <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleFinalizar}
                                disabled={loading}
                                className="h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                Confirmar e Abrir OS
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
