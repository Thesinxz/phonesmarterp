"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    User,
    Smartphone,
    Wrench,
    ClipboardCheck,
    Clock,
    Shield,
    Printer,
    CheckCircle2,
    AlertTriangle,
    FileText,
    RefreshCw,
    ArrowRight,
    LogOut,
    QrCode
} from "lucide-react";
import { getOrdemServicoById, updateOSStatus, gerarTokenTeste } from "@/services/os";
import { type OsStatus } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChecklistInspecao, type ChecklistData } from "@/components/os/ChecklistInspecao";
import { AssinaturaPad } from "@/components/os/AssinaturaPad";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import { notifyOSStatusChange } from "@/actions/notifications";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    aberta: { label: "Aberta", color: "text-slate-700", bg: "bg-slate-100" },
    em_analise: { label: "Em Análise", color: "text-blue-700", bg: "bg-blue-100" },
    aguardando_peca: { label: "Aguardando Peça", color: "text-amber-700", bg: "bg-amber-100" },
    em_execucao: { label: "Em Execução", color: "text-purple-700", bg: "bg-purple-100" },
    finalizada: { label: "Finalizada", color: "text-emerald-700", bg: "bg-emerald-100" },
    entregue: { label: "Entregue", color: "text-indigo-700", bg: "bg-indigo-100" },
    cancelada: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
};

export default function OSDetalhePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { profile } = useAuth();
    const [os, setOs] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Exit checklist + signature states
    const [checklistSaida, setChecklistSaida] = useState<ChecklistData>({});
    const [assinatura, setAssinatura] = useState<string | null>(null);
    const [showEntrega, setShowEntrega] = useState(false);
    const [tokenTeste, setTokenTeste] = useState<string | null>(null);
    const [gerandoQR, setGerandoQR] = useState(false);

    // Billing States
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [parcelas, setParcelas] = useState(1);

    useEffect(() => {
        if (params.id) {
            loadOS();
        }
    }, [params.id]);

    useRealtimeSubscription({
        table: "ordens_servico",
        filter: `id=eq.${params.id}`,
        callback: (payload: any) => {
            console.log("Realtime OS Detail:", payload.eventType);
            loadOS();
        }
    });

    useRealtimeSubscription({
        table: "os_timeline",
        filter: `os_id=eq.${params.id}`,
        callback: (payload: any) => {
            console.log("Realtime Timeline Detail:", payload.eventType);
            loadOS();
        }
    });

    async function loadOS() {
        try {
            const data = await getOrdemServicoById(params.id);
            setOs(data);
            if (data.checklist_saida_json) {
                setChecklistSaida(data.checklist_saida_json as ChecklistData);
            }
            if (data.assinatura_base64) {
                setAssinatura(data.assinatura_base64);
            }
            if (data.token_teste) {
                setTokenTeste(data.token_teste);
            }
        } catch (error) {
            console.error("Erro ao carregar OS:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleMoveStatus(novoStatus: OsStatus) {
        if (!profile || !os) return;
        setSaving(true);
        try {
            await updateOSStatus(os.id, novoStatus, profile.id, profile.empresa_id);
            notifyOSStatusChange(os.id, novoStatus).catch(e => console.error("WhatsApp error:", e));
            loadOS();
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        } finally {
            setSaving(false);
        }
    }

    async function handleFinalizarEntrega() {
        if (!profile || !os) return;
        setSaving(true);
        try {
            const garantiaAte = os.garantia_dias && os.garantia_dias > 0
                ? new Date(Date.now() + os.garantia_dias * 86400000).toISOString()
                : null;

            const qtParcelas = ['credito', 'boleto', 'crediario'].includes(paymentMethod) ? parcelas : 1;
            const formaFinal = qtParcelas > 1 ? `${paymentMethod}_${qtParcelas}x` : paymentMethod;

            const extraFields = {
                checklist_saida_json: checklistSaida,
                assinatura_base64: assinatura,
                garantia_ate: garantiaAte,
                forma_pagamento: formaFinal, // A repassar para updateOSStatus
            };

            await updateOSStatus(os.id, "entregue", profile.id, profile.empresa_id, extraFields);

            notifyOSStatusChange(os.id, "entregue").catch(e => console.error("WhatsApp error:", e));
            loadOS();
            setShowEntrega(false);
        } catch (error) {
            console.error("Erro ao finalizar entrega:", error);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    if (!os) {
        return <div className="p-12 text-center text-slate-400">OS não encontrada.</div>;
    }

    const status = statusConfig[os.status] || statusConfig.aberta;
    const checklistEntrada = (os.checklist_entrada_json || os.checklist_json || {}) as ChecklistData;

    return (
        <div className="space-y-6 page-enter max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/os" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">
                                OS #{String(os.numero).padStart(4, "0")}
                            </h1>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold", status.bg, status.color)}>
                                {status.label}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Aberta em {formatDate(os.created_at)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.open(`/print/os/${os.id}`, "_blank")}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                        <Printer size={16} /> Imprimir
                    </button>

                    {os.status === "finalizada" && (
                        <button
                            onClick={() => setShowEntrega(true)}
                            className="h-10 px-4 rounded-xl bg-indigo-600 text-white flex items-center gap-2 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <LogOut size={16} /> Entregar ao Cliente
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Coluna Esquerda */}
                <div className="col-span-2 space-y-6">
                    {/* Info Principal */}
                    <GlassCard>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={10} /> Cliente</p>
                                <p className="font-bold text-slate-800">{os.cliente?.nome}</p>
                                <p className="text-xs text-slate-400">{os.cliente?.telefone || os.cliente?.email || ""}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Smartphone size={10} /> Equipamento</p>
                                <p className="font-bold text-slate-800">{os.equipamento?.marca || os.marca_equipamento || "-"} {os.equipamento?.modelo || os.modelo_equipamento || ""}</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                    {(os.equipamento?.imei || os.imei_equipamento) && <p className="text-[10px] text-slate-500 font-medium">IMEI: {os.equipamento?.imei || os.imei_equipamento}</p>}
                                    {os.numero_serie && <p className="text-[10px] text-slate-500 font-medium">SÉRIE: {os.numero_serie}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Smartphone size={10} /> Senha / PIN / Padrão</p>
                                <p className="font-bold text-indigo-600">
                                    {os.senha_dispositivo || "Não informada"}
                                    {os.senha_tipo === 'padrao' && <span className="text-[8px] ml-2 text-amber-500 uppercase font-bold">(Desenho)</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Smartphone size={10} /> Acessórios Deixados</p>
                                <p className="text-xs text-slate-600">
                                    {os.acessorios_recebidos && Array.isArray(os.acessorios_recebidos) && os.acessorios_recebidos.length > 0
                                        ? os.acessorios_recebidos.join(", ")
                                        : "Nenhum acessório"}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Wrench size={10} /> Problema Relatado</p>
                            <p className="text-sm text-slate-700">{os.problema_relatado}</p>
                        </div>
                        {os.diagnostico && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={10} /> Diagnóstico</p>
                                <p className="text-sm text-slate-700">{os.diagnostico}</p>
                            </div>
                        )}
                    </GlassCard>

                    {/* Checklist de Entrada */}
                    <GlassCard title="Checklist de Entrada" icon={ClipboardCheck}>
                        <ChecklistInspecao
                            tipo="entrada"
                            value={checklistEntrada}
                            onChange={() => { }}
                            readOnly
                        />
                    </GlassCard>

                    {/* Checklist de Saída (se entregue) */}
                    {os.checklist_saida_json && (
                        <GlassCard title="Checklist de Saída" icon={CheckCircle2}>
                            <ChecklistInspecao
                                tipo="saida"
                                value={os.checklist_saida_json as ChecklistData}
                                onChange={() => { }}
                                readOnly
                                compararCom={checklistEntrada}
                            />
                        </GlassCard>
                    )}

                    {/* Assinatura (se entregue) */}
                    {os.assinatura_base64 && (
                        <GlassCard title="Assinatura do Cliente" icon={FileText}>
                            <AssinaturaPad value={os.assinatura_base64} onChange={() => { }} readOnly />
                        </GlassCard>
                    )}
                </div>

                {/* Coluna Direita: Timeline & Ações */}
                <div className="space-y-6">
                    {/* QR Code para Teste */}
                    {(os.status === "finalizada" || os.status === "em_execucao") && (
                        <GlassCard title="Teste no Aparelho" icon={QrCode}>
                            {os.teste_saida_concluido ? (
                                <div className="text-center py-4">
                                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-2" />
                                    <p className="font-bold text-emerald-700 text-sm">Teste Concluído!</p>
                                    <p className="text-slate-400 text-xs mt-1">O diagnóstico de saída foi realizado no aparelho.</p>
                                </div>
                            ) : tokenTeste ? (
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-3">Escaneie com o aparelho do cliente:</p>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/teste/' + tokenTeste)}`}
                                        alt="QR Code Teste"
                                        className="w-48 h-48 mx-auto rounded-xl border-4 border-white shadow-lg"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-3 break-all">{window.location.origin}/teste/{tokenTeste}</p>
                                    <button
                                        onClick={() => loadOS()}
                                        className="mt-3 text-xs text-indigo-600 font-bold flex items-center gap-1 mx-auto hover:underline"
                                    >
                                        <RefreshCw size={12} /> Atualizar Status
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-3">Gere um QR Code para rodar testes de hardware diretamente no aparelho do cliente.</p>
                                    <button
                                        onClick={async () => {
                                            setGerandoQR(true);
                                            try {
                                                const token = await gerarTokenTeste(os.id);
                                                setTokenTeste(token);
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setGerandoQR(false);
                                            }
                                        }}
                                        disabled={gerandoQR}
                                        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        {gerandoQR ? <RefreshCw className="animate-spin" size={14} /> : <QrCode size={16} />}
                                        Gerar QR Code de Teste
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    )}

                    {/* Ações Rápidas */}
                    <GlassCard title="Ações" icon={ArrowRight}>
                        <div className="space-y-2">
                            {os.status !== "finalizada" && os.status !== "entregue" && os.status !== "cancelada" && (
                                <>
                                    {os.status === "aberta" && (
                                        <button onClick={() => handleMoveStatus("em_analise")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-blue-100 bg-blue-50/50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-all flex items-center gap-2">
                                            <ArrowRight size={14} /> Enviar para Análise
                                        </button>
                                    )}
                                    {os.status === "em_analise" && (
                                        <>
                                            <button onClick={() => handleMoveStatus("em_execucao")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-purple-100 bg-purple-50/50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-all flex items-center gap-2">
                                                <ArrowRight size={14} /> Iniciar Execução
                                            </button>
                                            <button onClick={() => handleMoveStatus("aguardando_peca")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-amber-100 bg-amber-50/50 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-all flex items-center gap-2">
                                                <AlertTriangle size={14} /> Aguardar Peça
                                            </button>
                                        </>
                                    )}
                                    {(os.status === "em_execucao" || os.status === "aguardando_peca") && (
                                        <button onClick={() => handleMoveStatus("finalizada")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-all flex items-center gap-2">
                                            <CheckCircle2 size={14} /> Marcar como Finalizada
                                        </button>
                                    )}
                                </>
                            )}
                            {os.status !== "cancelada" && os.status !== "entregue" && (
                                <button onClick={() => handleMoveStatus("cancelada")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-red-100 text-red-500 text-sm font-bold hover:bg-red-50 transition-all flex items-center gap-2 mt-2 opacity-60 hover:opacity-100">
                                    <AlertTriangle size={14} /> Cancelar OS
                                </button>
                            )}
                        </div>
                    </GlassCard>

                    {/* Info Financeira */}
                    <GlassCard title="Financeiro" icon={FileText}>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Valor Total</span>
                                <span className="text-lg font-black text-slate-800">
                                    R$ {(os.valor_total_centavos / 100).toFixed(2)}
                                </span>
                            </div>
                            {os.garantia_dias != null && os.garantia_dias > 0 && (
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-sm text-slate-500 flex items-center gap-1"><Shield size={12} /> Garantia</span>
                                    <span className="text-sm font-bold text-indigo-600">{os.garantia_dias} dias</span>
                                </div>
                            )}
                            {os.garantia_ate && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Válida até</span>
                                    <span className="text-xs font-bold text-slate-600">{formatDate(os.garantia_ate)}</span>
                                </div>
                            )}
                            {os.tecnico && (
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-sm text-slate-500">Técnico</span>
                                    <span className="text-sm font-bold text-slate-700">{os.tecnico.nome}</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Timeline */}
                    {os.timeline && os.timeline.length > 0 && (
                        <GlassCard title="Timeline" icon={Clock}>
                            <div className="relative border-l-2 border-indigo-100 ml-3 space-y-4 pb-2">
                                {os.timeline.slice().sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()).map((ev: any) => (
                                    <div key={ev.id} className="relative pl-6">
                                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white" />
                                        <p className="text-sm font-semibold text-slate-700">{ev.evento}</p>
                                        <p className="text-[10px] text-slate-400">{formatDate(ev.criado_em)}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                </div>
            </div>

            {/* Modal de Entrega */}
            {showEntrega && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <LogOut size={22} className="text-indigo-500" />
                            Entrega do Equipamento
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Preencha o checklist de saída e colete a assinatura do cliente.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <ClipboardCheck size={16} className="text-emerald-500" /> Checklist de Saída
                                </h3>
                                <ChecklistInspecao
                                    tipo="saida"
                                    value={checklistSaida}
                                    onChange={setChecklistSaida}
                                    compararCom={checklistEntrada}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <ClipboardCheck size={16} className="text-blue-500" /> Faturamento Base
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                                            Forma de Recebimento
                                        </label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => {
                                                setPaymentMethod(e.target.value);
                                                if (!['credito', 'boleto', 'crediario'].includes(e.target.value)) setParcelas(1);
                                            }}
                                            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                                        >
                                            <option value="dinheiro">Dinheiro</option>
                                            <option value="pix">Pix</option>
                                            <option value="debito">Cartão de Débito</option>
                                            <option value="credito">Cartão de Crédito</option>
                                            <option value="boleto">Boleto</option>
                                            <option value="crediario">Fiado / Promissória</option>
                                        </select>
                                    </div>

                                    {['credito', 'boleto', 'crediario'].includes(paymentMethod) && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
                                                Nº de Parcelas
                                            </label>
                                            <select
                                                value={parcelas}
                                                onChange={e => setParcelas(Number(e.target.value))}
                                                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Shield size={16} className="text-indigo-500" /> Termo de Garantia
                                </h3>
                                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed border border-slate-100">
                                    <p className="font-bold text-slate-700 mb-2">TERMO DE GARANTIA DE SERVIÇO</p>
                                    <p>
                                        O serviço realizado neste equipamento ({os.equipamento?.marca} {os.equipamento?.modelo})
                                        possui garantia de <strong>{os.garantia_dias || 90} dias</strong> a partir desta data de entrega,
                                        conforme previsto no Código de Defesa do Consumidor.
                                    </p>
                                    <p className="mt-2">
                                        A garantia cobre exclusivamente o serviço descrito nesta ordem e não se aplica a:
                                        danos por mau uso, queda, contato com líquidos, ou intervenção de terceiros.
                                    </p>
                                    <p className="mt-2">
                                        Ao assinar abaixo, o cliente declara ter recebido o equipamento em funcionamento
                                        e concorda com os termos acima.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <AssinaturaPad
                                    value={assinatura}
                                    onChange={setAssinatura}
                                    label="Assinatura do Cliente (obrigatória)"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button
                                onClick={() => setShowEntrega(false)}
                                className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleFinalizarEntrega}
                                disabled={saving || !assinatura}
                                className={cn(
                                    "h-11 px-6 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg",
                                    assinatura
                                        ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                        : "bg-slate-300 cursor-not-allowed shadow-none"
                                )}
                            >
                                {saving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
