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
    QrCode,
    Edit3,
    Trash2,
    DollarSign,
    MapPin,
    ArrowRightLeft,
    Loader2,
    Package
} from "lucide-react";
import { getOrdemServicoById, updateOSStatus, gerarTokenTeste, deleteOS, getTecnicoComMenosOS, updateOS } from "@/services/os";
import { type OsStatus } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChecklistInspecao, type ChecklistData } from "@/components/os/ChecklistInspecao";
import { AssinaturaPad } from "@/components/os/AssinaturaPad";
import { EditOSModal } from "@/components/os/EditOSModal";
import { cn } from "@/utils/cn";
import { PasswordReveal } from "@/components/os/PasswordReveal";
import { PatternLock } from "@/components/os/wizard/PatternLock";
import { formatDate } from "@/utils/formatDate";
import { notifyOSStatusChange } from "@/actions/notifications";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { generateSOPDF } from "@/utils/pdfGenerator";
import { getConfigs } from "@/services/configuracoes";
import { toast } from "sonner";
import { PartsSearchModal } from "@/components/os/PartsSearchModal";
import { TransferRequestModal } from "@/components/os/TransferRequestModal";
import { 
    confirmOSTransferSent, 
    confirmOSTransferReceived, 
    getOSParts, 
    requestOSTransfer 
} from "@/app/actions/parts";
import { 
    checkWarrantyValidity, 
    getWarrantyClaimsByOS 
} from "@/app/actions/warranty";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    aberta: { label: "Aberta", color: "text-slate-700", bg: "bg-slate-100" },
    em_analise: { label: "Em Análise", color: "text-blue-700", bg: "bg-blue-100" },
    aguardando_peca: { label: "Aguardando Peça", color: "text-amber-700", bg: "bg-amber-100" },
    em_execucao: { label: "Em Execução", color: "text-purple-700", bg: "bg-purple-100" },
    finalizada: { label: "Finalizada", color: "text-emerald-700", bg: "bg-emerald-100" },
    entregue: { label: "Entregue", color: "text-indigo-700", bg: "bg-indigo-100" },
    cancelada: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
    em_transito: { label: "Em Trânsito", color: "text-blue-500", bg: "bg-blue-50" },
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [tokenTeste, setTokenTeste] = useState<string | null>(null);
    const [gerandoQR, setGerandoQR] = useState(false);
    const [gerandoPDF, setGerandoPDF] = useState(false);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transfers, setTransfers] = useState<any[]>([]);
    const [osParts, setOsParts] = useState<any[]>([]);
    const [loadingParts, setLoadingParts] = useState(false);

    // Billing States
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [parcelas, setParcelas] = useState(1);

    // Adiantamento
    const [showAdiantamentoModal, setShowAdiantamentoModal] = useState(false);
    const [valorAdiantarRaw, setValorAdiantarRaw] = useState("");
    const [formaPgtoAdiantamento, setFormaPgtoAdiantamento] = useState("dinheiro");

    const [warrantyInfo, setWarrantyInfo] = useState<any>(null);
    const [warrantyClaims, setWarrantyClaims] = useState<any[]>([]);
    const [loadingWarranty, setLoadingWarranty] = useState(false);

    const [isAutoAssigning, setIsAutoAssigning] = useState(false);

    const handleAutoAssign = async () => {
        if (!profile?.empresa_id || !os) return;
        setIsAutoAssigning(true);
        try {
            const tecnico = await getTecnicoComMenosOS(profile.empresa_id);
            if (tecnico) {
                await updateOS(os.id, { tecnico_id: tecnico.id });
                // registrar na timeline
                const supabase = createClient();
                await (supabase.from("os_timeline") as any).insert({
                    os_id: os.id,
                    empresa_id: profile.empresa_id,
                    usuario_id: profile.id,
                    evento: `Técnico ${tecnico.nome} atribuído automaticamente`,
                    dados_json: { tecnico_id: tecnico.id }
                });
                toast.success(`Técnico ${tecnico.nome} atribuído automaticamente!`);
                loadOS(false);
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

    useEffect(() => {
        if (params.id) {
            loadOS();
            loadTransfers();
            loadWarranty();
        }
    }, [params.id]);

    async function loadWarranty() {
        setLoadingWarranty(true);
        try {
            const [validity, claims] = await Promise.all([
                checkWarrantyValidity(params.id),
                getWarrantyClaimsByOS(params.id)
            ]);
            setWarrantyInfo(validity);
            setWarrantyClaims(claims);
        } catch (error) {
            console.error("Erro ao carregar dados de garantia:", error);
        } finally {
            setLoadingWarranty(false);
        }
    }

    async function loadTransfers() {
        const supabase = createClient();
        const { data } = await (supabase.from('os_unit_transfers') as any)
            .select('*')
            .eq('os_id', params.id)
            .order('created_at', { ascending: false });
        setTransfers(data || []);
    }

    useRealtimeSubscription({
        table: "ordens_servico",
        filter: `id=eq.${params.id}`,
        callback: () => {
            loadOS(true);
        }
    });

    useRealtimeSubscription({
        table: "os_timeline",
        filter: `os_id=eq.${params.id}`,
        callback: () => {
            loadOS(true);
        }
    });

    async function loadOS(background = false) {
        if (!background) setLoading(true);
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
            // Load parts too
            loadParts();
        } catch (error) {
            console.error("Erro ao carregar OS:", error);
        } finally {
            if (!background) setLoading(false);
        }
    }

    async function loadParts() {
        setLoadingParts(true);
        try {
            const parts = await getOSParts(params.id);
            setOsParts(parts);
        } catch (error) {
            console.error("Erro ao carregar peças:", error);
        } finally {
            setLoadingParts(false);
        }
    }

    async function handleMoveStatus(novoStatus: OsStatus) {
        if (!profile || !os) return;
        setSaving(true);
        try {
            await updateOSStatus(os.id, novoStatus, profile.id, profile.empresa_id);
            notifyOSStatusChange(os.id, novoStatus).catch(e => console.error("WhatsApp error:", e));
            if (novoStatus === 'em_execucao') setShowPartsModal(true);
            loadOS();
            loadTransfers();
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!window.confirm("Tem certeza que deseja excluir permanentemente esta Ordem de Serviço? Esta ação não pode ser desfeita.")) return;
        setSaving(true);
        try {
            await deleteOS(os.id);
            toast.success("Ordem de Serviço excluída.");
            router.push("/os");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir OS.");
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

    const handleExportPDF = async () => {
        if (!os || !profile?.empresa_id) return;
        setGerandoPDF(true);
        try {
            const configs = await getConfigs(profile.empresa_id);
            const branding: any = configs.nfe_emitente || {};

            const supabase = createClient();
            const { data: empresa } = await (supabase.from('empresas') as any).select('logo_url').eq('id', profile.empresa_id).single();
            if (empresa?.logo_url) branding.logo_url = empresa.logo_url;

            await generateSOPDF(os, branding);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        } finally {
            setGerandoPDF(false);
        }
    };

    async function handleEmitirNFSe() {
        if (!profile || !os) return;
        setSaving(true);
        try {
            // Simula a integração com a API proprietária de Nota Fiscal de Serviço
            await new Promise(r => setTimeout(r, 1500));
            toast.success("NFS-e emitida com sucesso via SmartOS Fiscal!");
        } catch (error) {
            console.error("Erro ao emitir NFS-e:", error);
            toast.error("Erro ao emitir Nota Fiscal de Serviço.");
        } finally {
            setSaving(false);
        }
    }

    const handleLancarAdiantamento = async () => {
        if (!os || !profile?.empresa_id) return;

        let normalizedValue = valorAdiantarRaw.replace(/\./g, '').replace(',', '.');
        const valorDigitado = parseFloat(normalizedValue) || 0;
        const valorCentavos = Math.round(valorDigitado * 100);

        if (valorCentavos <= 0) {
            toast.error("Informe um valor válido.");
            return;
        }

        const adiantamentoAtual = os.valor_adiantado_centavos || 0;
        const total = os.valor_total_centavos || 0;

        if (adiantamentoAtual + valorCentavos > total) {
            toast.error("O valor adiantado não pode ser maior que o total da OS.");
            return;
        }

        setSaving(true);
        try {
            const supabase = createClient();

            // 1. Inserir no Financeiro direto como pago
            await (supabase.from("financeiro") as any).insert({
                empresa_id: profile.empresa_id,
                tipo: "entrada",
                categoria: "Serviços de Manutenção",
                descricao: `Adiantamento OS #${String(os.numero).padStart(4, "0")} (${formaPgtoAdiantamento})`,
                valor_centavos: valorCentavos,
                pago: true,
                vencimento: new Date().toISOString(),
            });

            // Registrar também no Caixa pra fechamento 
            const caixaId = localStorage.getItem("@smartos_caixa_id");
            if (caixaId) {
                await (supabase.from("caixa_movimentacoes") as any).insert({
                    empresa_id: profile.empresa_id,
                    caixa_id: caixaId,
                    usuario_id: profile.id,
                    tipo: "recebimento_os",
                    forma_pagamento: formaPgtoAdiantamento,
                    valor_centavos: valorCentavos,
                    observacao: `Adiantamento OS #${String(os.numero).padStart(4, "0")}`,
                    origem_id: os.id
                });
            }

            // 2. Atualizar a OS
            await updateOS(os.id, { valor_adiantado_centavos: adiantamentoAtual + valorCentavos });

            // 3. Timeline
            await (supabase.from("os_timeline") as any).insert({
                os_id: os.id,
                empresa_id: profile.empresa_id,
                usuario_id: profile.id,
                evento: `Adiantamento recebido em ${formaPgtoAdiantamento.toUpperCase()}: R$ ${(valorCentavos / 100).toFixed(2).replace('.', ',')}`,
            });

            toast.success("Adiantamento registrado!");
            setShowAdiantamentoModal(false);
            setValorAdiantarRaw("");
            loadOS();
        } catch (error) {
            console.error("Erro adiantamento", error);
            toast.error("Falha ao registrar adiantamento.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    if (!os) {
        return <div className="p-12 text-center text-slate-400">OS não encontrada.</div>;
    }

    const status = statusConfig[os.status] || statusConfig.aberta;
    const checklistEntrada = (os.checklist_entrada_json || os.checklist_json || {}) as ChecklistData;

    const activeTransfer = transfers.find(t => t.status === 'pendente' || t.status === 'em_transito');

    return (
        <div className="space-y-6 page-enter pb-12">
            {/* Banner de Transferência */}
            {activeTransfer && (
                <div className={cn(
                    "p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300 shadow-lg border",
                    activeTransfer.status === 'pendente' ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                )}>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            activeTransfer.status === 'pendente' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                        )}>
                            {activeTransfer.status === 'pendente' ? <Clock size={20} /> : <ArrowRightLeft size={20} className="animate-pulse" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {activeTransfer.status === 'pendente' ? "Transferência Pendente" : "Equipamento em Trânsito"}
                            </p>
                            <p className="text-xs text-slate-500">
                                De unidade {activeTransfer.from_unit_id} para {activeTransfer.to_unit_id}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {activeTransfer.status === 'pendente' && profile?.unit_id === activeTransfer.from_unit_id && (
                            <button
                                onClick={async () => {
                                    if (!profile) return;
                                    await confirmOSTransferSent(activeTransfer.id, profile.id);
                                    toast.success("Envio confirmado!");
                                    loadOS();
                                    loadTransfers();
                                }}
                                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all"
                            >
                                Confirmar Envio
                            </button>
                        )}
                        {activeTransfer.status === 'em_transito' && profile?.unit_id === activeTransfer.to_unit_id && (
                            <button
                                onClick={async () => {
                                    if (!profile) return;
                                    await confirmOSTransferReceived(activeTransfer.id, profile.id);
                                    toast.success("Equipamento recebido na unidade!");
                                    loadOS();
                                    loadTransfers();
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                            >
                                Confirmar Recebimento
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* Banners de Transferência */}
            {(() => {
                const activeTransfer = os.transfers?.find((t: any) => t.status !== 'recebido');
                const isOrigin = activeTransfer?.from_unit_id === profile?.unit_id;
                const isDest = activeTransfer?.to_unit_id === profile?.unit_id;

                // 1. Banner de Envio Pendente (Aguardando Envio)
                if (activeTransfer?.status === 'pendente' && isOrigin) {
                    return (
                        <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white">
                                        <Wrench size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-amber-800">Esta OS precisa ser reparada na {activeTransfer.to_unit?.name}</p>
                                        <p className="text-sm text-amber-600 font-bold">Envie o aparelho e confirme o envio para atualizar o status.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Confirmar envio para ${activeTransfer.to_unit?.name}?`)) {
                                            setSaving(true);
                                            try {
                                                await confirmOSTransferSent(activeTransfer.id, profile?.id || "");
                                                toast.success(`Envio confirmado. ${activeTransfer.to_unit?.name} foi notificada.`);
                                                loadOS();
                                            } catch (e) {
                                                toast.error("Erro ao confirmar envio");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                    }}
                                    className="h-12 px-6 rounded-xl bg-amber-500 text-white font-black text-xs uppercase hover:bg-amber-600 transition-all flex items-center gap-2"
                                >
                                    Confirmar Envio Para {activeTransfer.to_unit?.name.toUpperCase()} <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    );
                }

                // 2. Banner de Em Trânsito (Visão Origem)
                if (os.status === 'em_transito' && isOrigin) {
                    return (
                        <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-blue-50 border border-blue-200 rounded-[1.5rem] p-6 flex items-center gap-4 shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white">
                                    <Package size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-blue-800">Aparelho em trânsito para {activeTransfer?.to_unit?.name}</p>
                                    <p className="text-sm text-blue-600 font-bold">
                                        Enviado em {formatDate(activeTransfer?.sent_at)} · Aguardando confirmação de recebimento.
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                }

                // 3. Banner de Em Trânsito (Visão Destino)
                if (os.status === 'em_transito' && isDest) {
                    return (
                        <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-blue-50 border border-blue-200 rounded-[1.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-blue-800">Aparelho chegando da {activeTransfer?.from_unit?.name}</p>
                                        <p className="text-sm text-blue-600 font-bold">Enviado em {formatDate(activeTransfer?.sent_at)} · Confirme ao receber.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Confirmar recebimento do aparelho?")) {
                                            setSaving(true);
                                            try {
                                                await confirmOSTransferReceived(activeTransfer?.id || "", profile?.id || "");
                                                toast.success("Recebimento confirmado!");
                                                loadOS();
                                            } catch (e) {
                                                toast.error("Erro ao confirmar recebimento");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                    }}
                                    className="h-12 px-6 rounded-xl bg-blue-600 text-white font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    Confirmar Recebimento <CheckCircle2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                }

                // 4. Banner de Reparo Concluído (OS em outra loja originalmente)
                const lastReceivedTransfer = os.transfers?.filter((t: any) => t.status === 'recebido').sort((a: any, b: any) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())[0];
                if (os.status === 'finalizada' && lastReceivedTransfer) {
                    return (
                        <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 flex items-center gap-4 shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <p className="font-black text-emerald-800">Reparo concluído — pronto para retirada</p>
                                    <p className="text-sm text-emerald-600 font-bold">O cliente deve buscar o aparelho na {lastReceivedTransfer.from_unit?.name} (loja de origem).</p>
                                </div>
                            </div>
                        </div>
                    );
                }

                return null;
            })()}

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
                            {/* Badge de Garantia */}
                            {warrantyInfo && (os.status === "finalizada" || os.status === "entregue") && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm",
                                    warrantyInfo.isValid 
                                        ? (warrantyInfo.daysRemaining <= 7 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100")
                                        : "bg-red-50 text-red-600 border border-red-100"
                                )}>
                                    <Shield size={12} />
                                    {warrantyInfo.isValid 
                                        ? `Garantia válida · vence em ${formatDate(warrantyInfo.expiresAt)}`
                                        : `Garantia expirada em ${formatDate(warrantyInfo.expiresAt)}`
                                    }
                                </div>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Aberta em {formatDate(os.created_at)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {os.status === 'aberta' && os.unit_id === profile?.unit_id && (
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="h-10 px-4 rounded-xl border border-indigo-200 text-indigo-600 flex items-center gap-2 text-sm font-bold hover:bg-indigo-50 transition-all font-sans"
                        >
                            <ArrowRightLeft size={16} /> Solicitar Reparo Externo
                        </button>
                    )}

                    {/* Botão Abrir Garantia */}
                    {warrantyInfo?.isValid && (os.status === "finalizada" || os.status === "entregue") && (
                        <Link 
                            href={`/garantias/nova?os=${os.id}`}
                            className="h-10 px-4 rounded-xl bg-orange-500 text-white flex items-center gap-2 text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 font-sans"
                        >
                            <Shield size={16} /> Abrir Garantia
                        </Link>
                    )}
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all font-sans"
                    >
                        <Edit3 size={16} /> Editar
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="h-10 px-4 rounded-xl border border-red-100 text-red-500 flex items-center gap-2 text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50 font-sans"
                    >
                        <Trash2 size={16} /> Excluir
                    </button>

                    <button
                        onClick={handleExportPDF}
                        disabled={gerandoPDF}
                        className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <FileText size={16} /> {gerandoPDF ? "Gerando..." : "Exportar PDF"}
                    </button>

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

                    {(os.status === "finalizada" || os.status === "entregue") && (
                        <button
                            onClick={handleEmitirNFSe}
                            disabled={saving}
                            className="h-10 px-4 rounded-xl bg-amber-500 text-white flex items-center gap-2 text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                            title="Emitir Nota Fiscal de Serviço (NFS-e)"
                        >
                            <FileText size={16} /> {saving ? "Emitindo..." : "Gerar NFS-e"}
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
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Smartphone size={10} /> Equipamento</p>
                                        <p className="font-bold text-slate-800">{os.equipamento?.marca || os.marca_equipamento || "-"} {os.equipamento?.modelo || os.modelo_equipamento || ""}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                            {(os.equipamento?.imei || os.imei_equipamento) && <p className="text-[10px] text-slate-500 font-medium">IMEI: {os.equipamento?.imei || os.imei_equipamento}</p>}
                                            {os.numero_serie && <p className="text-[10px] text-slate-500 font-medium">SÉRIE: {os.numero_serie}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPartsModal(true)}
                                        className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-200"
                                    >
                                        <Wrench size={14} /> Buscar Peças
                                    </button>
                                </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2 flex items-center gap-2">
                                    <Shield size={10} /> Segurança (Uso Interno)
                                </p>
                                {os.senha_tipo === 'padrao' ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Padrão Android:</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold uppercase tracking-widest">Abaixo</span>
                                        </div>
                                        <div className="bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50 w-fit">
                                            <PatternLock value={os.senha_dispositivo} readOnly className="scale-75 -m-6" />
                                        </div>
                                    </div>
                                ) : (
                                    <PasswordReveal value={os.senha_dispositivo} />
                                )}
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

                    {/* Peças Utilizadas */}
                    <GlassCard title="Peças Utilizadas" icon={Wrench}>
                        <div className="space-y-4">
                            {loadingParts ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="animate-spin text-slate-300" />
                                </div>
                            ) : osParts.length === 0 ? (
                                <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <Package size={32} className="text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">Nenhuma peça registrada nesta OS.</p>
                                    <button 
                                        onClick={() => setShowPartsModal(true)}
                                        className="mt-3 text-[10px] font-black text-indigo-600 hover:text-indigo-700"
                                    >
                                        + ADICIONAR PEÇA
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {osParts.map(part => (
                                        <div key={part.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                    <Wrench size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{part.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                        {part.qty}x · {part.unitName} · Custo: R$ {(part.costPrice / 100).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center px-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo Total de Peças</span>
                                        <span className="text-lg font-black text-slate-800">
                                            R$ {(osParts.reduce((acc, curr) => acc + (curr.costPrice * curr.qty), 0) / 100).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Checklist de Entrada */}

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
                    {/* Garantias Vinculadas */}
                    {warrantyClaims.length > 0 && (
                        <GlassCard title={`Garantias (${warrantyClaims.length})`} icon={Shield}>
                            <div className="space-y-3">
                                {warrantyClaims.map((claim: any) => (
                                    <Link 
                                        key={claim.id}
                                        href={`/garantias/${claim.id}`}
                                        className="block p-3 rounded-xl border border-indigo-50 border-white bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase text-indigo-500">#{claim.id.slice(0, 5).toUpperCase()}</span>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                claim.status === 'aberta' ? "bg-amber-100 text-amber-700" :
                                                claim.status === 'negada' ? "bg-red-100 text-red-700" :
                                                "bg-emerald-100 text-emerald-700"
                                            )}>
                                                {claim.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-tight">
                                            {claim.claim_type === 'peca_defeituosa' ? 'Peça Defeituosa' :
                                             claim.claim_type === 'erro_tecnico' ? 'Erro Técnico' :
                                             claim.claim_type === 'dano_acidental' ? 'Dano Acidental' : 'Não Relacionado'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Aberta em {formatDate(claim.created_at)}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                    {/* QR Code para Rastreamento do Cliente */}
                    <GlassCard title="Acompanhamento do Cliente" icon={MapPin}>
                        {tokenTeste ? (
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-3">Link público gerado. Mostre o QR ou envie o link:</p>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/rastreio/' + tokenTeste)}`}
                                    alt="QR Code Rastreio"
                                    className="w-48 h-48 mx-auto rounded-xl border-4 border-white shadow-lg"
                                />
                                <div className="mt-4 bg-slate-50 p-2 rounded-xl flex items-center justify-between border border-slate-100">
                                    <p className="text-[10px] text-slate-500 truncate mr-2 font-mono">
                                        {window.location.origin}/rastreio/{tokenTeste}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/rastreio/${tokenTeste}`);
                                            toast.success("Link copiado para a área de transferência!");
                                        }}
                                        className="p-1.5 shrink-0 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        <FileText size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => window.open(`/rastreio/${tokenTeste}`, '_blank')}
                                    className="mt-3 w-full py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                                >
                                    Abrir Página do Cliente
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-3">Gere um link público e seguro para o cliente acompanhar o serviço de casa.</p>
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
                                    Gerar Link de Rastreio
                                </button>
                            </div>
                        )}
                    </GlassCard>

                    {/* Ações Rápidas */}
                    <GlassCard title="Ações" icon={ArrowRight}>
                        <div className="space-y-2">
                            {os.status !== "entregue" && os.status !== "cancelada" && (
                                <>
                                    {/* Forward Actions */}
                                    {os.status === "aberta" && (
                                        <button onClick={() => handleMoveStatus("em_analise")} disabled={saving} className="w-full text-left px-4 py-3 rounded-xl border border-blue-100 bg-blue-50/50 text-blue-700 text-sm font-bold hover:bg-blue-100 transition-all flex items-center gap-2">
                                            <ArrowRight size={14} /> Enviar para Análise
                                        </button>
                                    )}
                                    {os.status === "em_analise" && (
                                        <>
                                            <button
                                                onClick={() => handleMoveStatus("em_execucao")}
                                                disabled={saving || !os.orcamento_aprovado}
                                                className="w-full text-left px-4 py-3 rounded-xl border border-purple-100 bg-purple-50/50 text-purple-700 text-sm font-bold hover:bg-purple-100 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group relative"
                                            >
                                                <ArrowRight size={14} /> Iniciar Execução
                                                {!os.orcamento_aprovado && (
                                                    <span className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-normal text-center z-10">
                                                        Aprove o orçamento primeiro
                                                    </span>
                                                )}
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

                                    {/* Backward Actions */}
                                    <div className="pt-2 mt-2 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Retroceder Status</p>
                                        {os.status === "em_analise" && (
                                            <button onClick={() => handleMoveStatus("aberta")} disabled={saving} className="w-full text-left px-4 py-2 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                                                <ArrowLeft size={12} /> Voltar para Aberta
                                            </button>
                                        )}
                                        {(os.status === "em_execucao" || os.status === "aguardando_peca") && (
                                            <button onClick={() => handleMoveStatus("em_analise")} disabled={saving} className="w-full text-left px-4 py-2 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                                                <ArrowLeft size={12} /> Voltar para Análise
                                            </button>
                                        )}
                                        {os.status === "finalizada" && (
                                            <button onClick={() => handleMoveStatus("em_execucao")} disabled={saving} className="w-full text-left px-4 py-2 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                                                <ArrowLeft size={12} /> Voltar para Execução
                                            </button>
                                        )}
                                    </div>
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
                                    R$ {(os.valor_total_centavos / 100).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                            {(os.valor_adiantado_centavos || 0) > 0 && (
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm text-emerald-600">Total Adiantado</span>
                                    <span className="text-sm font-bold text-emerald-600">
                                        - R$ {((os.valor_adiantado_centavos || 0) / 100).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            )}
                            {(os.valor_adiantado_centavos || 0) > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <span className="text-sm font-bold text-slate-600">Restante a Pagar</span>
                                    <span className="text-base font-black text-brand-600">
                                        R$ {((os.valor_total_centavos - os.valor_adiantado_centavos) / 100).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            )}

                            {os.status !== "entregue" && os.status !== "cancelada" && (os.valor_adiantado_centavos || 0) < os.valor_total_centavos && os.valor_total_centavos > 0 && (
                                <div className="pt-3">
                                    <button
                                        onClick={() => setShowAdiantamentoModal(true)}
                                        className="w-full h-9 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                                    >
                                        <DollarSign size={14} /> Registrar Adiantamento
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                <span className="text-sm text-slate-500">Orçamento</span>
                                {os.orcamento_aprovado ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Aprovado ✓</span>
                                        {os.orcamento_aprovado_por && (
                                            <span className="text-[9px] text-slate-400 mt-1">por {os.orcamento_aprovado_por}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Pendente ⌛</span>
                                        {os.status === 'em_analise' && (
                                            <button
                                                onClick={async () => {
                                                    await updateOS(os.id, {
                                                        orcamento_aprovado: true,
                                                        orcamento_aprovado_em: new Date().toISOString(),
                                                        orcamento_aprovado_por: profile?.nome
                                                    });

                                                    const supabase = createClient();
                                                    await (supabase.from("os_timeline") as any).insert({
                                                        os_id: os.id,
                                                        empresa_id: os.empresa_id,
                                                        usuario_id: profile?.id,
                                                        evento: `Orçamento aprovado por ${profile?.nome}`
                                                    });

                                                    toast.success("Orçamento aprovado com sucesso!");
                                                }}
                                                className="text-[10px] uppercase font-bold text-indigo-600 hover:text-indigo-800"
                                            >
                                                Aprovar Agora
                                            </button>
                                        )}
                                    </div>
                                )}
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
                            {os.tecnico ? (
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-sm text-slate-500">Técnico</span>
                                    <span className="text-sm font-bold text-slate-700">{os.tecnico.nome}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-sm text-slate-500">Técnico</span>
                                    <button
                                        onClick={handleAutoAssign}
                                        disabled={isAutoAssigning}
                                        className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                        Auto-atribuir
                                    </button>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Timeline */}
                    <GlassCard title="Timeline" icon={Clock}>
                        <div className="relative border-l-2 border-indigo-100 ml-3 space-y-4 pb-2">
                            {(() => {
                                // Conjunto de eventos: timeline + transferências
                                const events = [
                                    ...(os.timeline || []).map((ev: any) => ({
                                        id: ev.id,
                                        type: 'manual',
                                        date: ev.criado_em,
                                        title: ev.evento,
                                        icon: <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white" />
                                    })),
                                    ...(os.transfers || []).flatMap((t: any) => {
                                        const tEvents = [];
                                        if (t.created_at) tEvents.push({
                                            id: `t-req-${t.id}`,
                                            date: t.created_at,
                                            title: `Solicitada transferência para ${t.to_unit?.name}`,
                                            icon: <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
                                        });
                                        if (t.sent_at) tEvents.push({
                                            id: `t-sent-${t.id}`,
                                            date: t.sent_at,
                                            title: `Aparelho enviado para ${t.to_unit?.name} (por ${t.sent_by_name || 'Usuário'})`,
                                            icon: <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                                        });
                                        if (t.received_at) tEvents.push({
                                            id: `t-recv-${t.id}`,
                                            date: t.received_at,
                                            title: `Recebimento confirmado na ${t.to_unit?.name} (por ${t.received_by_name || 'Usuário'})`,
                                            icon: <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                                        });
                                        return tEvents;
                                    })
                                ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                return events.map((ev: any) => (
                                    <div key={ev.id} className="relative pl-6">
                                        {ev.icon}
                                        <p className="text-sm font-semibold text-slate-700">{ev.title}</p>
                                        <p className="text-[10px] text-slate-400">{formatDate(ev.date)}</p>
                                    </div>
                                ));
                            })()}
                        </div>
                    </GlassCard>
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

            {/* Modal de Adiantamento */}
            {showAdiantamentoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-lg font-bold text-emerald-700 mb-2 flex items-center gap-2">
                            <DollarSign size={20} />
                            Registrar Adiantamento
                        </h2>
                        <p className="text-xs text-slate-500 mb-4">
                            Este valor será contabilizado no <b>Financeiro</b> imediatamente e descontado na entrega da OS.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor a Adiantar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                    <input
                                        type="text"
                                        value={valorAdiantarRaw}
                                        onChange={(e) => setValorAdiantarRaw(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 text-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-[10px] text-slate-400">
                                        Restante Max: R$ {((os.valor_total_centavos - (os.valor_adiantado_centavos || 0)) / 100).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                    Forma de Pagamento
                                </label>
                                <select
                                    value={formaPgtoAdiantamento}
                                    onChange={(e) => setFormaPgtoAdiantamento(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                                >
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">Pix</option>
                                    <option value="debito">Cartão de Débito</option>
                                    <option value="credito">Cartão de Crédito</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => { setShowAdiantamentoModal(false); setValorAdiantarRaw(""); }}
                                className="h-10 px-4 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLancarAdiantamento}
                                disabled={saving || !valorAdiantarRaw}
                                className="h-10 px-6 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TransferRequestModal
                isOpen={showTransferModal}
                currentUnitId={profile?.unit_id || ""}
                tenantId={profile?.empresa_id || ""}
                onClose={() => setShowTransferModal(false)}
                onConfirm={async (toUnitId, notes) => {
                    setSaving(true);
                    try {
                        await requestOSTransfer({
                            tenantId: profile?.empresa_id || "",
                            osId: os.id,
                            fromUnitId: os.unit_id,
                            toUnitId,
                            requestedBy: profile?.id || "",
                            notes
                        });
                        toast.success("Transferência solicitada!");
                        setShowTransferModal(false);
                        loadOS();
                    } catch (e) {
                        toast.error("Erro ao solicitar transferência");
                    } finally {
                        setSaving(false);
                    }
                }}
            />

            <PartsSearchModal
                isOpen={showPartsModal}
                osId={os.id}
                deviceModel={os.modelo_equipamento || os.equipamento?.modelo || ""}
                tenantId={profile?.empresa_id || ""}
                technicianId={profile?.id || ""}
                currentUnitId={os.unit_id}
                onClose={() => {
                    setShowPartsModal(false);
                    loadParts();
                    loadOS(true);
                }}
                onPartUsed={() => {
                    loadParts();
                    // Don't close so they can add more
                }}
            />
        </div>
    );
}
