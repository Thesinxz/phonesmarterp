"use client";

import { useState, useEffect } from "react";
import { X, User, Mail, Shield, CheckCircle2, Loader2, Save, KeyRound, Trash2 } from "lucide-react";
import { type Usuario, criarMembroEquipe, atualizarMembroEquipe, excluirMembroEquipe, ROLE_PERMISSIONS } from "@/services/equipe";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import PermissoesConfig from "./PermissoesConfig";


interface MembroModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    membro?: Usuario | null;
}

export default function MembroModal({ isOpen, onClose, onSuccess, membro }: MembroModalProps) {
    const { profile, session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"dados" | "permissoes">("dados");

    const [form, setForm] = useState({
        nome: "",
        email: "",
        papel: "atendente" as Usuario["papel"],
        ativo: true,
        permissoes_json: {} as any
    });

    useEffect(() => {
        if (isOpen) {
            setActiveTab("dados");
            if (membro) {
                setForm({
                    nome: membro.nome,
                    email: membro.email,
                    papel: membro.papel,
                    ativo: membro.ativo,
                    permissoes_json: membro.permissoes_json || {}
                });
            } else {
                setForm({
                    nome: "",
                    email: "",
                    papel: "atendente",
                    ativo: true,
                    permissoes_json: ROLE_PERMISSIONS["atendente"]
                });
            }
        }
    }, [isOpen, membro]);

    const handleRoleChange = (newRole: Usuario["papel"]) => {
        setForm({
            ...form,
            papel: newRole,
            permissoes_json: ROLE_PERMISSIONS[newRole] || {}
        });
    };


    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        try {
            setSubmitting(true);
            const loadingToast = toast.loading(membro ? "Atualizando..." : "Gerando convite...");

            if (membro) {
                await atualizarMembroEquipe(membro.id, form);
                toast.success("Membro atualizado com sucesso", { id: loadingToast });
                onSuccess();
                onClose();
            } else {
                const result = await criarMembroEquipe({
                    ...form,
                    empresa_id: profile.empresa_id,
                    auth_user_id: null
                }, session?.access_token);

                if (result.inviteLink) {
                    setInviteLink(result.inviteLink);
                    toast.success("Convite gerado! Copie o link abaixo.", { id: loadingToast });
                } else {
                    toast.success("Membro adicionado com sucesso", { id: loadingToast });
                    onSuccess();
                    onClose();
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Erro ao salvar membro");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyToken = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        toast.success("Link de convite copiado!");
    };

    const handleDelete = async () => {
        if (!membro) return;
        if (!confirm("Tem certeza que deseja excluir este funcionário? Isso removerá permanentemente o acesso dele à empresa. Funcionários com histórico de vendas/OS podem não ser excluídos (desative-os em vez disso).")) return;

        try {
            setSubmitting(true);
            await excluirMembroEquipe(membro.id);
            toast.success("Funcionário excluído com sucesso");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            if (error?.message?.includes('foreign key constraint')) {
                toast.error("Não é possível excluir funcionário que possui histórico no sistema. Experimente inativá-lo mudando o Status.");
            } else {
                toast.error("Erro ao excluir funcionário");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-tight">
                                {membro ? "Editar Membro" : "Novo Membro"}
                            </h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Controle de Acesso</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab("dados")}
                        className={cn(
                            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                            activeTab === "dados" ? "text-brand-600 border-brand-500 bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <User size={14} />
                            Dados Básicos
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("permissoes")}
                        className={cn(
                            "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                            activeTab === "permissoes" ? "text-brand-600 border-brand-500 bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                        )}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <KeyRound size={14} />
                            Permissões
                        </div>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {inviteLink ? (
                        <div className="space-y-4 py-4 animate-in zoom-in-95 duration-300">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center space-y-3">
                                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-200">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Convite Gerado!</h3>
                                <p className="text-sm text-slate-600">Copie o link abaixo e envie para o novo membro da equipe.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Link de Convite</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        type="text"
                                        value={inviteLink}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyToken}
                                        className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-black transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-tight"
                                    >
                                        <Save size={16} />
                                        Copiar
                                    </button>
                                </div>
                            </div>

                            <p className="text-[10px] text-center text-slate-400 font-medium">Este link expira em 7 dias e só pode ser usado uma vez.</p>
                        </div>
                    ) : (
                        activeTab === "dados" ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="Ex: João Silva"
                                            value={form.nome}
                                            onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Profissional</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                        <input
                                            required
                                            type="email"
                                            placeholder="email@empresa.com.br"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Papel / Cargo</label>
                                        <div className="relative">
                                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                                            <select
                                                required
                                                value={form.papel}
                                                onChange={(e) => handleRoleChange(e.target.value as Usuario["papel"])}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium appearance-none"
                                            >
                                                <option value="atendente">Atendente</option>
                                                <option value="tecnico">Técnico</option>
                                                <option value="financeiro">Financeiro</option>
                                                <option value="gerente">Gerente</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                                        <div className="flex items-center gap-4 h-[42px]">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={form.ativo}
                                                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                                                    className="sr-only"
                                                />
                                                <div className={cn(
                                                    "w-10 h-5 rounded-full transition-all relative border",
                                                    form.ativo ? "bg-emerald-500 border-emerald-600" : "bg-slate-200 border-slate-300"
                                                )}>
                                                    <div className={cn(
                                                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                                                        form.ativo ? "left-[22px]" : "left-0.5"
                                                    )} />
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-bold uppercase tracking-tight",
                                                    form.ativo ? "text-emerald-600" : "text-slate-400"
                                                )}>
                                                    {form.ativo ? "Ativo" : "Inativo"}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <PermissoesConfig
                                    permissions={form.permissoes_json}
                                    onChange={(p) => setForm({ ...form, permissoes_json: p })}
                                />
                            </div>
                        )
                    )}

                    <div className="flex gap-3 pt-6">
                        {inviteLink ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setInviteLink(null);
                                    onSuccess();
                                    onClose();
                                }}
                                className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                Concluído
                            </button>
                        ) : (
                            <>
                                {membro ? (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={submitting}
                                        className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center disabled:opacity-50"
                                        title="Excluir funcionário"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {membro ? "Salvar" : "Gerar Link de Convite"}
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
