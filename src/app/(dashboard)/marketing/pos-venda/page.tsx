"use client";

import { useState, useEffect } from "react";
import {
    Zap,
    ToggleLeft,
    ToggleRight,
    Clock,
    MessageSquare,
    ShoppingCart,
    Star,
    Gift,
    Wrench,
    RefreshCw,
    Save,
    Loader2,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
    getAutomacoes,
    saveAutomacoes,
    getTemplates,
    type MarketingAutomacao,
    type MarketingTemplate
} from "@/services/marketing";
import { FeatureGate } from "@/components/plans/FeatureGate";

const AUTOMACAO_ICONS: Record<string, any> = {
    agradecimento: ShoppingCart,
    avaliacao: Star,
    recompra: RefreshCw,
    aniversario: Gift,
    os_lembrete: Wrench,
};

const AUTOMACAO_COLORS: Record<string, string> = {
    agradecimento: "from-emerald-500 to-teal-600",
    avaliacao: "from-amber-500 to-orange-600",
    recompra: "from-blue-500 to-indigo-600",
    aniversario: "from-pink-500 to-rose-600",
    os_lembrete: "from-violet-500 to-purple-600",
};

export default function PosVendaPage() {
    const { profile } = useAuth();
    const [automacoes, setAutomacoes] = useState<MarketingAutomacao[]>([]);
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id]);

    async function loadData() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const [autoData, templData] = await Promise.all([
                getAutomacoes(profile.empresa_id),
                getTemplates(profile.empresa_id)
            ]);
            setAutomacoes(autoData);
            setTemplates(templData);
        } catch (error) {
            console.error("Erro ao carregar automações:", error);
            toast.error("Erro ao carregar automações");
        } finally {
            setLoading(false);
        }
    }

    const toggleEnabled = (id: string) => {
        setAutomacoes(prev => prev.map(a =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
        ));
        setHasChanges(true);
    };

    const updateAutomacao = (id: string, field: keyof MarketingAutomacao, value: any) => {
        setAutomacoes(prev => prev.map(a =>
            a.id === id ? { ...a, [field]: value } : a
        ));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!profile?.empresa_id) return;
        setSaving(true);
        try {
            await saveAutomacoes(profile.empresa_id, automacoes);
            toast.success("Automações salvas com sucesso!");
            setHasChanges(false);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar automações");
        } finally {
            setSaving(false);
        }
    };

    const ativasCount = automacoes.filter(a => a.enabled).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <FeatureGate
            feature="pos_venda_auto"
            featureName="Automações Pós-Venda"
            description="Automatize o envio de mensagens de agradecimento, feedbacks e lembretes para seus clientes."
        >
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            Automações Pós-Venda
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 ml-[52px]">
                            {ativasCount} de {automacoes.length} automações ativas
                        </p>
                    </div>
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Salvar Alterações
                        </button>
                    )}
                </div>

                {/* Automações Cards */}
                <div className="space-y-4">
                    {automacoes.map((auto) => {
                        const Icon = AUTOMACAO_ICONS[auto.id] || Zap;
                        const colorClass = AUTOMACAO_COLORS[auto.id] || "from-slate-500 to-slate-600";
                        const isExpanded = expandedId === auto.id;

                        return (
                            <GlassCard key={auto.id} className={cn(
                                "p-0 overflow-hidden transition-all duration-300",
                                auto.enabled ? "ring-2 ring-violet-200 shadow-lg" : "opacity-80"
                            )}>
                                {/* Card Header */}
                                <div
                                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : auto.id)}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                                        colorClass,
                                        !auto.enabled && "grayscale opacity-50"
                                    )}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800">{auto.nome}</h3>
                                        <p className="text-xs text-slate-500">{auto.descricao}</p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {auto.delay_horas > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Clock size={14} />
                                                {auto.delay_horas >= 24
                                                    ? `${Math.round(auto.delay_horas / 24)}d`
                                                    : `${auto.delay_horas}h`
                                                }
                                            </div>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleEnabled(auto.id); }}
                                            className="transition-transform hover:scale-110"
                                        >
                                            {auto.enabled ? (
                                                <ToggleRight size={36} className="text-violet-600" />
                                            ) : (
                                                <ToggleLeft size={36} className="text-slate-300" />
                                            )}
                                        </button>

                                        {isExpanded ? (
                                            <ChevronDown size={18} className="text-slate-400" />
                                        ) : (
                                            <ChevronRight size={18} className="text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Card Expanded */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 bg-slate-50/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Delay */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                    Tempo de espera (horas)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input-glass w-full"
                                                    value={auto.delay_horas}
                                                    onChange={e => updateAutomacao(auto.id, "delay_horas", parseInt(e.target.value) || 0)}
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    0 = enviar imediatamente | 24 = 1 dia | 72 = 3 dias
                                                </p>
                                            </div>

                                            {/* Template */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                    Template WhatsApp
                                                </label>
                                                <select
                                                    className="input-glass w-full"
                                                    value={auto.template_nome}
                                                    onChange={e => updateAutomacao(auto.id, "template_nome", e.target.value)}
                                                >
                                                    <option value="">Selecionar template...</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.nome}>{t.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        {auto.template_nome && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                    Preview da Mensagem
                                                </label>
                                                <div className="bg-[#e8ddd3] rounded-2xl p-4">
                                                    <div className="bg-white rounded-xl p-3 max-w-sm shadow-sm">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <MessageSquare size={14} className="text-emerald-600" />
                                                            <span className="text-[10px] font-bold text-emerald-600">WhatsApp Business</span>
                                                        </div>
                                                        <p className="text-sm text-slate-700">
                                                            {templates.find(t => t.nome === auto.template_nome)?.preview_texto
                                                                ?.replace(/\{\{nome_cliente\}\}/g, "João")
                                                                .replace(/\{\{nome_loja\}\}/g, "Phone Smart")
                                                                .replace(/\{\{valor_total\}\}/g, "R$ 1.299,00")
                                                                .replace(/\{\{numero_os\}\}/g, "00123")
                                                                || "Selecione um template para ver o preview"}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 text-right mt-2">14:30 ✓✓</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>
            </div>
        </FeatureGate>
    );
}
