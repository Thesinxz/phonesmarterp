"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    Plus,
    Save,
    Loader2,
    Trash2,
    Eye,
    Edit3,
    X,
    Copy,
    Variable,
    Phone
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getTemplates, saveTemplates, type MarketingTemplate } from "@/services/marketing";
import { FeatureGate } from "@/components/plans/FeatureGate";

const VARIAVEIS_DISPONIVEIS = [
    { key: "nome_cliente", desc: "Nome do cliente" },
    { key: "nome_loja", desc: "Nome da loja" },
    { key: "valor_total", desc: "Valor total da venda" },
    { key: "nome_produto", desc: "Nome do produto" },
    { key: "numero_os", desc: "Número da OS" },
    { key: "data_compra", desc: "Data da compra" },
];

const TIPO_LABELS: Record<string, string> = {
    pos_venda: "Pós-Venda",
    campanha: "Campanha",
    os: "Ordem de Serviço",
    geral: "Geral",
};

const TIPO_COLORS: Record<string, string> = {
    pos_venda: "bg-emerald-50 text-emerald-600",
    campanha: "bg-amber-50 text-amber-600",
    os: "bg-violet-50 text-violet-600",
    geral: "bg-slate-100 text-slate-500",
};

export default function TemplatesPage() {
    const { profile } = useAuth();
    const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
    const [showPreview, setShowPreview] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id]);

    async function loadData() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const data = await getTemplates(profile.empresa_id);
            setTemplates(data);
        } catch (error) {
            console.error("Erro ao carregar templates:", error);
            toast.error("Erro ao carregar templates");
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async () => {
        if (!profile?.empresa_id) return;
        setSaving(true);
        try {
            await saveTemplates(profile.empresa_id, templates);
            toast.success("Templates salvos com sucesso!");
            setHasChanges(false);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar templates");
        } finally {
            setSaving(false);
        }
    };

    const addTemplate = () => {
        const newTemplate: MarketingTemplate = {
            id: `custom_${Date.now()}`,
            nome: "Novo Template",
            descricao: "",
            variaveis: ["nome_cliente", "nome_loja"],
            preview_texto: "Olá {{nome_cliente}}! Mensagem da {{nome_loja}}.",
            tipo: "geral",
        };
        setEditingTemplate(newTemplate);
    };

    const handleSaveTemplate = (template: MarketingTemplate) => {
        setTemplates(prev => {
            const exists = prev.find(t => t.id === template.id);
            if (exists) {
                return prev.map(t => t.id === template.id ? template : t);
            }
            return [...prev, template];
        });
        setEditingTemplate(null);
        setHasChanges(true);
        toast.success("Template atualizado!");
    };

    const handleDeleteTemplate = (id: string) => {
        if (!confirm("Excluir este template?")) return;
        setTemplates(prev => prev.filter(t => t.id !== id));
        setHasChanges(true);
        toast.success("Template removido!");
    };

    const renderPreview = (texto: string) => {
        return texto
            .replace(/\{\{nome_cliente\}\}/g, "João Silva")
            .replace(/\{\{nome_loja\}\}/g, "Phone Smart")
            .replace(/\{\{valor_total\}\}/g, "R$ 1.299,00")
            .replace(/\{\{nome_produto\}\}/g, "iPhone 15 Pro")
            .replace(/\{\{numero_os\}\}/g, "00123")
            .replace(/\{\{data_compra\}\}/g, "02/03/2026");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <FeatureGate
            feature="marketing_pdf"
            featureName="Templates WhatsApp"
            description="Gerencie seus modelos de mensagens para automações e campanhas avançadas."
        >
            <div className="space-y-6 page-enter">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            Templates WhatsApp
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 ml-[52px]">{templates.length} templates registrados</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={addTemplate} className="btn-secondary flex items-center gap-2">
                            <Plus size={18} /> Novo Template
                        </button>
                        {hasChanges && (
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Salvar
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <Phone size={20} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-blue-800">Templates da Meta Business API</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Os templates precisam ser aprovados no <strong>Meta Business Manager</strong> antes de funcionar.
                            Aqui você registra os nomes e variáveis para usar nas automações e campanhas.
                        </p>
                    </div>
                </div>

                {/* Variáveis Disponíveis */}
                <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Variable size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">Variáveis disponíveis</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {VARIAVEIS_DISPONIVEIS.map((v) => (
                            <button
                                key={v.key}
                                onClick={() => { navigator.clipboard.writeText(`{{${v.key}}}`); toast.success(`Copiado: {{${v.key}}}`); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs transition-colors group"
                            >
                                <Copy size={10} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
                                <code className="text-slate-600 font-mono text-[11px]">{`{{${v.key}}}`}</code>
                                <span className="text-slate-400">— {v.desc}</span>
                            </button>
                        ))}
                    </div>
                </GlassCard>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <GlassCard key={template.id} className="p-5 hover:shadow-lg transition-all duration-300 group relative">
                            {/* Tipo Badge */}
                            <span className={cn(
                                "inline-block px-2 py-1 rounded-lg text-[10px] font-black uppercase mb-3",
                                TIPO_COLORS[template.tipo]
                            )}>
                                {TIPO_LABELS[template.tipo]}
                            </span>

                            <h3 className="font-bold text-slate-800 mb-1">{template.nome}</h3>
                            <p className="text-xs text-slate-400 mb-3">{template.descricao || "Sem descrição"}</p>

                            {/* Variáveis */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {template.variaveis.map((v) => (
                                    <span key={v} className="px-1.5 py-0.5 bg-violet-50 text-violet-500 rounded text-[9px] font-mono">
                                        {`{{${v}}}`}
                                    </span>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setShowPreview(showPreview === template.id ? null : template.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                    <Eye size={14} /> Preview
                                </button>
                                <button
                                    onClick={() => setEditingTemplate(template)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                                >
                                    <Edit3 size={14} /> Editar
                                </button>
                                {template.id.startsWith("custom_") && (
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Preview Inline */}
                            {showPreview === template.id && (
                                <div className="mt-4 bg-[#e8ddd3] rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-white rounded-xl p-3 max-w-sm shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquare size={12} className="text-emerald-600" />
                                            <span className="text-[10px] font-bold text-emerald-600">WhatsApp Business</span>
                                        </div>
                                        <p className="text-sm text-slate-700">{renderPreview(template.preview_texto)}</p>
                                        <p className="text-[10px] text-slate-400 text-right mt-2">14:30 ✓✓</p>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>

                {/* Edit Modal */}
                {editingTemplate && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingTemplate(null)}>
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {templates.find(t => t.id === editingTemplate.id) ? "Editar" : "Criar"} Template
                                </h2>
                                <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome do Template</label>
                                    <input
                                        className="input-glass w-full"
                                        value={editingTemplate.nome}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, nome: e.target.value })}
                                        placeholder="Ex: obrigado_compra_v2"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Use o mesmo nome registrado no Meta Business Manager</p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição</label>
                                    <input
                                        className="input-glass w-full"
                                        value={editingTemplate.descricao}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, descricao: e.target.value })}
                                        placeholder="Breve descrição do template"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                                    <select
                                        className="input-glass w-full"
                                        value={editingTemplate.tipo}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, tipo: e.target.value as any })}
                                    >
                                        <option value="pos_venda">Pós-Venda</option>
                                        <option value="campanha">Campanha</option>
                                        <option value="os">Ordem de Serviço</option>
                                        <option value="geral">Geral</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Variáveis usadas</label>
                                    <div className="flex flex-wrap gap-2">
                                        {VARIAVEIS_DISPONIVEIS.map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => {
                                                    const vars = editingTemplate.variaveis.includes(v.key)
                                                        ? editingTemplate.variaveis.filter(x => x !== v.key)
                                                        : [...editingTemplate.variaveis, v.key];
                                                    setEditingTemplate({ ...editingTemplate, variaveis: vars });
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                                    editingTemplate.variaveis.includes(v.key)
                                                        ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
                                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                )}
                                            >
                                                {`{{${v.key}}}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Texto de Preview</label>
                                    <textarea
                                        className="input-glass w-full min-h-[100px] resize-y"
                                        value={editingTemplate.preview_texto}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, preview_texto: e.target.value })}
                                        placeholder="Olá {{nome_cliente}}! ..."
                                    />
                                </div>

                                {/* Live Preview */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Preview ao vivo</label>
                                    <div className="bg-[#e8ddd3] rounded-2xl p-4">
                                        <div className="bg-white rounded-xl p-3 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <MessageSquare size={12} className="text-emerald-600" />
                                                <span className="text-[10px] font-bold text-emerald-600">WhatsApp Business</span>
                                            </div>
                                            <p className="text-sm text-slate-700">{renderPreview(editingTemplate.preview_texto)}</p>
                                            <p className="text-[10px] text-slate-400 text-right mt-2">14:30 ✓✓</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button onClick={() => setEditingTemplate(null)} className="btn-secondary">Cancelar</button>
                                <button
                                    onClick={() => handleSaveTemplate(editingTemplate)}
                                    className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Salvar Template
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}
