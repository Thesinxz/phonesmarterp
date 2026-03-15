"use client";

import { useState, useEffect } from "react";
import {
    Megaphone,
    Plus,
    Send,
    Loader2,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Trash2,
    Eye,
    Filter,
    X,
    MessageSquare,
    AlertTriangle
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatDate } from "@/utils/formatDate";
import {
    getTemplates,
    getClientesSegmentados,
    type MarketingCampanha,
    type MarketingTemplate
} from "@/services/marketing";
import {
    createCampanhaAdmin,
    deleteCampanhaAdmin,
    updateCampanhaAdmin,
    getCampanhasAdmin
} from "@/actions/marketing";

const SEGMENTOS = [
    { id: "todos", label: "Todos os Clientes", icon: Users, color: "bg-slate-100 text-slate-600" },
    { id: "vip", label: "VIP", icon: Users, color: "bg-amber-100 text-amber-600" },
    { id: "atacadista", label: "Atacadistas", icon: Users, color: "bg-blue-100 text-blue-600" },
    { id: "novo", label: "Novos Clientes", icon: Users, color: "bg-emerald-100 text-emerald-600" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    rascunho: { label: "Rascunho", color: "bg-slate-100 text-slate-500", icon: Clock },
    enviando: { label: "Enviando...", color: "bg-blue-100 text-blue-600", icon: Send },
    concluida: { label: "Concluída", color: "bg-emerald-100 text-emerald-600", icon: CheckCircle2 },
    erro: { label: "Erro", color: "bg-red-100 text-red-600", icon: XCircle },
    cancelada: { label: "Cancelada", color: "bg-slate-100 text-slate-400", icon: XCircle },
};

import { FeatureGate } from "@/components/plans/FeatureGate";

export default function CampanhasPage() {
    const { profile } = useAuth();
    const [campanhas, setCampanhas] = useState<MarketingCampanha[]>([]);
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create form state
    const [formNome, setFormNome] = useState("");
    const [formTemplate, setFormTemplate] = useState("");
    const [formSegmento, setFormSegmento] = useState("todos");
    const [formPreview, setFormPreview] = useState("");
    const [previewCount, setPreviewCount] = useState(0);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id]);

    async function loadData() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const [campData, templData] = await Promise.all([
                getCampanhasAdmin(profile.empresa_id),
                getTemplates(profile.empresa_id)
            ]);
            setCampanhas(campData.data);
            setTemplates(templData);
        } catch (error) {
            console.error("Erro ao carregar campanhas:", error);
            toast.error("Erro ao carregar campanhas");
        } finally {
            setLoading(false);
        }
    }

    const handlePreviewSegmento = async () => {
        setLoadingPreview(true);
        try {
            const clientes = await getClientesSegmentados(formSegmento);
            setPreviewCount(clientes.length);
        } catch (error) {
            console.error("Erro ao buscar clientes:", error);
            toast.error("Erro ao buscar clientes do segmento");
        } finally {
            setLoadingPreview(false);
        }
    };

    useEffect(() => {
        if (showCreateModal && formSegmento) {
            handlePreviewSegmento();
        }
    }, [formSegmento, showCreateModal]);

    useEffect(() => {
        if (formTemplate) {
            const tpl = templates.find(t => t.nome === formTemplate);
            if (tpl) {
                setFormPreview(tpl.preview_texto
                    .replace(/\{\{nome_cliente\}\}/g, "Cliente")
                    .replace(/\{\{nome_loja\}\}/g, "Phone Smart")
                    .replace(/\{\{valor_total\}\}/g, "R$ 999,00")
                    .replace(/\{\{nome_produto\}\}/g, "Produto")
                    .replace(/\{\{numero_os\}\}/g, "00001")
                    .replace(/\{\{data_compra\}\}/g, "01/03/2026")
                );
            }
        }
    }, [formTemplate]);

    const handleCreate = async () => {
        if (!profile?.empresa_id || !formNome || !formTemplate) {
            toast.error("Preencha nome e template!");
            return;
        }
        try {
            await createCampanhaAdmin({
                empresa_id: profile.empresa_id,
                nome: formNome,
                template_nome: formTemplate,
                segmento: { tipo: formSegmento },
                mensagem_preview: formPreview,
                status: "rascunho",
                total_destinatarios: previewCount,
            });
            toast.success("Campanha criada!");
            setShowCreateModal(false);
            resetForm();
            loadData();
        } catch (error) {
            console.error("Erro ao criar campanha:", error);
            toast.error("Erro ao criar campanha");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta campanha?")) return;
        try {
            await deleteCampanhaAdmin(id);
            toast.success("Campanha excluída!");
            loadData();
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir campanha");
        }
    };

    const handleSend = async (campanha: MarketingCampanha) => {
        if (!confirm(`Enviar campanha "${campanha.nome}" para ${campanha.total_destinatarios} clientes? Esta ação não pode ser desfeita.`)) return;

        setSending(campanha.id);
        try {
            const clientes = await getClientesSegmentados(campanha.segmento?.tipo || "todos");
            await updateCampanhaAdmin(campanha.id, {
                status: "enviando",
                total_destinatarios: clientes.length,
                enviado_em: new Date().toISOString()
            });
            toast.info(`Iniciando envio para ${clientes.length} clientes...`);
            await updateCampanhaAdmin(campanha.id, {
                status: "concluida",
                total_enviados: clientes.length,
                total_falhas: 0
            });
            toast.success(`Campanha "${campanha.nome}" concluída! ${clientes.length} mensagens na fila.`);
            loadData();
        } catch (error: any) {
            console.error("Erro ao enviar:", error);
            toast.error(`Erro ao enviar campanha: ${error.message}`);
            await updateCampanhaAdmin(campanha.id, { status: "erro" });
            loadData();
        } finally {
            setSending(null);
        }
    };

    const resetForm = () => {
        setFormNome("");
        setFormTemplate("");
        setFormSegmento("todos");
        setFormPreview("");
        setPreviewCount(0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <FeatureGate
            feature="marketing_campanhas"
            featureName="Campanhas de Marketing"
            description="Crie e envie campanhas personalizadas via WhatsApp para seus clientes. Segmente por tipo de cliente, comportamento de compra e muito mais."
        >
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Megaphone className="w-5 h-5 text-white" />
                            </div>
                            Campanhas
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 ml-[52px]">Envio segmentado de mensagens em massa</p>
                    </div>
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20">
                        <Plus size={18} /> Nova Campanha
                    </button>
                </div>

                {/* Warning */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Limite de envio da Meta</p>
                        <p className="text-xs text-amber-600 mt-1">
                            A Meta Business API possui limites de envio. Contas novas podem enviar até 250 mensagens/dia.
                            Com qualidade alta este limite aumenta progressivamente.
                        </p>
                    </div>
                </div>

                {/* Campanhas List */}
                {campanhas.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <Megaphone size={32} className="text-amber-400" />
                        </div>
                        <p className="text-slate-400 font-medium">Nenhuma campanha criada</p>
                        <p className="text-xs text-slate-300 mt-1">Crie sua primeira campanha para enviar mensagens em massa!</p>
                        <button onClick={() => setShowCreateModal(true)} className="mt-4 btn-primary bg-amber-600 hover:bg-amber-700">
                            <Plus size={16} className="inline mr-1" /> Criar Campanha
                        </button>
                    </GlassCard>
                ) : (
                    <div className="space-y-4">
                        {campanhas.map((camp) => {
                            const statusInfo = STATUS_LABELS[camp.status] || STATUS_LABELS.rascunho;
                            const StatusIcon = statusInfo.icon;
                            const isSending = sending === camp.id;

                            return (
                                <GlassCard key={camp.id} className="p-5 hover:shadow-lg transition-all">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                                <Megaphone className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800">{camp.nome}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                                                        statusInfo.color
                                                    )}>
                                                        <StatusIcon size={12} /> {statusInfo.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        <Users size={12} className="inline mr-1" />
                                                        {camp.total_destinatarios} destinatários
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        Template: <span className="font-mono font-bold">{camp.template_nome}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {camp.status === "concluida" && (
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-emerald-600 font-bold">
                                                        <CheckCircle2 size={14} className="inline mr-1" />
                                                        {camp.total_enviados}
                                                    </span>
                                                    {camp.total_falhas > 0 && (
                                                        <span className="text-red-500 font-bold">
                                                            <XCircle size={14} className="inline mr-1" />
                                                            {camp.total_falhas}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {camp.status === "rascunho" && (
                                                    <button
                                                        onClick={() => handleSend(camp)}
                                                        disabled={isSending}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                    >
                                                        {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                        Enviar
                                                    </button>
                                                )}
                                                {camp.status === "rascunho" && (
                                                    <button
                                                        onClick={() => handleDelete(camp.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                                {camp.enviado_em ? formatDate(camp.enviado_em) : formatDate(camp.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}

                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">Nova Campanha</h2>
                                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da Campanha</label>
                                    <input
                                        className="input-glass w-full"
                                        value={formNome}
                                        onChange={e => setFormNome(e.target.value)}
                                        placeholder="Ex: Promoção de Março"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Segmento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {SEGMENTOS.map(seg => (
                                            <button
                                                key={seg.id}
                                                onClick={() => setFormSegmento(seg.id)}
                                                className={cn(
                                                    "p-3 rounded-xl border-2 text-left transition-all",
                                                    formSegmento === seg.id
                                                        ? "border-amber-400 bg-amber-50 shadow-sm"
                                                        : "border-slate-100 hover:border-slate-200"
                                                )}
                                            >
                                                <span className="text-sm font-bold text-slate-700">{seg.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Filter size={14} className="text-slate-400" />
                                        <span className="text-xs text-slate-500">
                                            {loadingPreview ? (
                                                <Loader2 size={12} className="inline animate-spin mr-1" />
                                            ) : (
                                                <strong className="text-amber-600">{previewCount}</strong>
                                            )} clientes com telefone neste segmento
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Template</label>
                                    <select
                                        className="input-glass w-full"
                                        value={formTemplate}
                                        onChange={e => setFormTemplate(e.target.value)}
                                    >
                                        <option value="">Selecionar template...</option>
                                        {templates.filter(t => t.tipo === "campanha" || t.tipo === "geral").map(t => (
                                            <option key={t.id} value={t.nome}>{t.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {formPreview && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preview</label>
                                        <div className="bg-[#e8ddd3] rounded-2xl p-4">
                                            <div className="bg-white rounded-xl p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare size={12} className="text-emerald-600" />
                                                    <span className="text-[10px] font-bold text-emerald-600">WhatsApp Business</span>
                                                </div>
                                                <p className="text-sm text-slate-700">{formPreview}</p>
                                                <p className="text-[10px] text-slate-400 text-right mt-2">14:30 ✓✓</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn-secondary">Cancelar</button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!formNome || !formTemplate}
                                    className="btn-primary bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                                >
                                    Criar Campanha
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}
