"use client";

import "./wizard.css";

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
        descontoTipo: "valor" as "valor" | "porcentagem",

        tecnicoId: "",
        prazo: "",
        prioridade: "normal",
        orcamentoAprovado: false,
        financas: {
            formaPagamento: "pix",
            parcelas: 1,
            entrada: 0,
            garantia: "90"
        },
        valorAdiantado: 0,
        confirmedTerms: false
    });

    useEffect(() => {
        const saved = localStorage.getItem("smartos_nova_os_wizard");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setFormData(prev => ({ ...prev, ...parsed }));
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
        if (!formData.confirmedTerms) {
            toast.error("Você precisa confirmar que as informações estão corretas.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setLastError(null);

        try {
            const totalPecas = formData.pecas.reduce((acc, p) => acc + (p.preco * p.qtd), 0);
            const totalServicos = formData.servicos.reduce((acc, s) => acc + s.valor, 0);
            const subtotal = totalPecas + totalServicos;
            
            let valorDescontoCentavos = 0;
            if (formData.descontoTipo === "porcentagem") {
                valorDescontoCentavos = Math.round((subtotal * (formData.desconto || 0)) / 100);
            } else {
                valorDescontoCentavos = formData.desconto;
            }

            const valorTotalCentavos = subtotal - valorDescontoCentavos;

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
                valor_adiantado_centavos: formData.valorAdiantado || 0,
                desconto_centavos: valorDescontoCentavos,
                desconto_info: formData.descontoTipo === "porcentagem" ? `${formData.desconto}%` : null,
                garantia_dias: parseInt(formData.financas.garantia),
                forma_pagamento: formData.financas.formaPagamento,
                prazo_estimado: formData.prazo || null,
                prioridade: formData.prioridade,
                orcamento_aprovado: formData.orcamentoAprovado,
                orcamento_aprovado_em: formData.orcamentoAprovado ? new Date().toISOString() : null,
                orcamento_aprovado_por: formData.orcamentoAprovado ? profile.nome : null,
                _caixa_id: localStorage.getItem("@smartos_caixa_id") // Extra field
            };

            const os = await createDetailedOS(payload, profile.id);
            toast.success("Ordem de Serviço aberta com sucesso!");
            localStorage.removeItem("smartos_nova_os_wizard");
            router.push(`/os/${os.id}`);
            router.refresh();
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

    const totalPecas = (formData.pecas || []).reduce((acc: number, p: any) => acc + ((p.preco || p.sale_price) * p.qtd), 0);
    const totalServicos = (formData.servicos || []).reduce((acc: number, s: any) => acc + s.valor, 0);
    const subtotal = totalPecas + totalServicos;
    
    let valorDesconto = 0;
    if (formData.descontoTipo === "porcentagem") {
        valorDesconto = Math.round((subtotal * (formData.desconto || 0)) / 100);
    } else {
        valorDesconto = formData.desconto || 0;
    }

    const sinal = formData.valorAdiantado || 0;
    const totalGeral = subtotal - valorDesconto - sinal;

    const formatBrl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

    const tipByStep: Record<number, string> = {
        0: '💡 Busque pelo nome, CPF ou telefone. Se for novo, clique em "Novo Cliente".',
        1: '🔒 A senha/PIN é registrada apenas internamente e não aparece no comprovante.',
        2: '💡 Marque todos os itens do checklist para proteger sua loja de reclamações.',
        3: '💡 Peças usadas aqui saem automaticamente do estoque ao confirmar.',
        4: '💡 O sinal recebido será descontado do total na hora do pagamento.',
        5: '✓ Revise tudo antes de confirmar. Após abrir, a OS não pode ser cancelada facilmente.',
    };

    return (
        <div className="wizard-page">
            {/* Topbar */}
            <div className="wizard-topbar">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700">
                    <ArrowLeft size={18} />
                </button>
                <div className="text-sm font-bold text-slate-800">Nova Ordem de Serviço</div>
                <div className="ml-auto text-xs text-slate-400">Rascunho automático</div>
            </div>

            {/* Stepper */}
            <div className="wizard-stepper scrollbar-none">
                {STEPS.map((step, index) => {
                    const active = index === currentStep;
                    const done = index < currentStep;
                    const Icon = step.icon;
                    return (
                        <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                            <div className="step-item" onClick={() => done && setCurrentStep(index)}>
                                <div className={cn("step-circle", active && "active", done && "done")}>
                                    {done ? "✓" : (active ? "●" : <Icon size={16} />)}
                                </div>
                                <span className={cn("step-text", active && "active", done && "done")}>
                                    {step.label}
                                </span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className={cn("step-connector", done && "done")} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Body */}
            <div className="wizard-body">
                {/* Main */}
                <div className="wizard-main">
                    {currentStep === 0 && <OSStep1Cliente onSelect={(id, nome) => setFormData(p => ({ ...p, clienteId: id, clienteNome: nome }))} selectedId={formData.clienteId} />}
                    {currentStep === 1 && <OSStep2Equipamento data={formData} onChange={(d) => setFormData(d)} />}
                    {currentStep === 2 && <OSStep3Problema data={formData} onChange={(d) => setFormData(d)} />}
                    {currentStep === 3 && <OSStep4PecasServicos data={formData} onChange={(d) => setFormData(d)} />}
                    {currentStep === 4 && <OSStep5AgendaPagamento data={formData} onChange={(d) => setFormData(d)} />}
                    {currentStep === 5 && <OSStep6Resumo data={formData} onChange={(d) => setFormData(d)} />}

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

                                <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                                    <pre className="text-emerald-400 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                                        {JSON.stringify(formData, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="wizard-sidebar">
                    <div className="sidebar-card">
                        <div className="sidebar-title">
                            {formData.marca || formData.modelo ? `📱 ${formData.marca} ${formData.modelo}` : '📱 Equipamento'}
                        </div>
                        {formData.clienteId ? (
                            <div style={{ fontSize: 11, color: '#64748B' }}>{formData.clienteNome}</div>
                        ) : (
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>Selecione o cliente no Passo 1</div>
                        )}
                    </div>

                    <div className="sidebar-card">
                        <div className="sidebar-title">💰 Resumo</div>
                        <div className="summary-row"><span>Peças</span><span>{formatBrl(totalPecas)}</span></div>
                        {totalServicos > 0 && <div className="summary-row"><span>Serviços</span><span>{formatBrl(totalServicos)}</span></div>}
                        {valorDesconto > 0 && <div className="summary-row"><span>Desconto</span><span style={{ color: '#DC2626' }}>− {formatBrl(valorDesconto)}</span></div>}
                        {sinal > 0 && <div className="summary-row"><span>Sinal</span><span style={{ color: '#DC2626' }}>− {formatBrl(sinal)}</span></div>}
                        <div className="summary-total"><span>Total</span><span>{formatBrl(totalGeral)}</span></div>
                    </div>

                    <div className="sidebar-tip">{tipByStep[currentStep]}</div>
                </div>
            </div>

            {/* Total Bar */}
            <div className="wizard-total-bar">
                <div className="total-item hidden sm:flex">
                    <div className="total-label">PEÇAS</div>
                    <div className="total-value">{formatBrl(totalPecas)}</div>
                </div>
                <div className="total-item hidden sm:flex">
                    <div className="total-label">SERVIÇOS</div>
                    <div className="total-value">{formatBrl(totalServicos)}</div>
                </div>
                <div className="total-item hidden sm:flex">
                    <div className="total-label">DESCONTO</div>
                    <div className="total-value">{formatBrl(valorDesconto)}</div>
                </div>
                {sinal > 0 && (
                    <div className="total-item hidden sm:flex">
                        <div className="total-label">SINAL</div>
                        <div className="total-value" style={{ color: '#FCA5A5' }}>− {formatBrl(sinal)}</div>
                    </div>
                )}
                <div className="total-main ml-auto flex items-center gap-4">
                    <div className="total-label text-right">SALDO<br />RESTANTE</div>
                    <div className="total-value">{formatBrl(totalGeral)}</div>
                </div>
            </div>

            {/* Footer */}
            <div className="wizard-footer">
                <button className="btn-secondary" onClick={() => {
                    if (confirm("Deseja cancelar o rascunho?")) {
                        localStorage.removeItem("smartos_nova_os_wizard");
                        router.back();
                    }
                }}>
                    <RotateCcw size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Cancelar Rascunho</span>
                </button>

                <div style={{ display: 'flex', gap: 12 }}>
                    {currentStep > 0 && (
                        <button className="btn-secondary" onClick={prevStep}>
                            <ArrowLeft size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Anterior</span>
                        </button>
                    )}

                    {currentStep < STEPS.length - 1 ? (
                        <button className="btn-primary" onClick={nextStep}>
                            <span className="hidden sm:inline">Próximo</span> <ArrowRight size={16} className="sm:ml-2" />
                        </button>
                    ) : null}
                    
                    {currentStep === 5 && (
                        <button
                            className="btn-confirm"
                            disabled={loading || !formData.confirmedTerms} // Require terms check
                            onClick={handleFinalizar}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <span>✓ Confirmar e Abrir OS</span>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
