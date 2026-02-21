"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import { type Solicitacao, type Usuario } from "@/types/database";
import { getUsuarios } from "@/services/usuarios";
import { criarSolicitacao } from "@/services/solicitacoes";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface SolicitacaoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SolicitacaoModal({ isOpen, onClose, onSuccess }: SolicitacaoModalProps) {
    const { profile } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        titulo: "",
        descricao: "",
        categoria: "outro" as Solicitacao["categoria"],
        prioridade: "media" as Solicitacao["prioridade"],
        telefone_contato: "" as string,
        nome_cliente: "" as string,
        atribuido_a: "" as string | null,
        data_vencimento: "" as string | null
    });

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            // Reset form
            setForm({
                titulo: "",
                descricao: "",
                categoria: "outro",
                prioridade: "media",
                telefone_contato: "",
                nome_cliente: "",
                atribuido_a: null,
                data_vencimento: null
            });
        }
    }, [isOpen]);



    async function loadUsers() {
        try {
            setLoading(true);
            const data = await getUsuarios();
            setUsuarios(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!profile) return;

        try {
            setSubmitting(true);
            await criarSolicitacao({
                empresa_id: profile.empresa_id,
                usuario_id: profile.id,
                titulo: form.titulo,
                descricao: form.descricao || null,
                categoria: form.categoria,
                prioridade: form.prioridade,
                telefone_contato: form.telefone_contato || null,
                nome_cliente: form.nome_cliente || null,
                atribuido_a: form.atribuido_a || null,

                data_vencimento: form.data_vencimento ? new Date(form.data_vencimento).toISOString() : null

            });

            toast.success("Solicitação criada com sucesso!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar solicitação");
        } finally {
            setSubmitting(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Nova Solicitação</h2>
                        <p className="text-xs text-slate-500">Crie um pedido ou lembrete interno</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Título *</label>
                        <input
                            required
                            type="text"
                            placeholder="Ex: Avisar cliente..."
                            value={form.titulo}
                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identificação do Cliente</label>
                            <input
                                type="text"
                                placeholder="Nome do Cliente (Opcional)"
                                value={form.nome_cliente}
                                onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">WhatsApp / Telefone</label>
                            <input
                                type="text"
                                placeholder="Ex: 5511999999999"
                                value={form.telefone_contato}
                                onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                            />
                        </div>
                    </div>


                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descrição</label>
                        <textarea
                            rows={3}
                            placeholder="Complemente com detalhes importantes..."
                            value={form.descricao}
                            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Categoria</label>
                            <select
                                value={form.categoria}
                                onChange={(e) => setForm({ ...form, categoria: e.target.value as any })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none"
                            >
                                <option value="lembrete">Lembrete</option>
                                <option value="pedido">Pedido Interno</option>
                                <option value="aviso_cliente">Aviso Cliente</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Prioridade</label>
                            <select
                                value={form.prioridade}
                                onChange={(e) => setForm({ ...form, prioridade: e.target.value as any })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none"
                            >
                                <option value="baixa">Baixa</option>
                                <option value="media">Média</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Atribuir a</label>
                            <select
                                value={form.atribuido_a || ""}
                                onChange={(e) => setForm({ ...form, atribuido_a: e.target.value || null })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none"
                                disabled={loading}
                            >
                                <option value="">Todos / Ninguém</option>
                                {usuarios.map(u => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vencimento (Opcional)</label>
                            <input
                                type="datetime-local"
                                value={form.data_vencimento || ""}
                                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value || null })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Criar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
