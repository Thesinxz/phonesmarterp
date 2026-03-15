"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Smartphone, ArrowRightLeft, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { normalizeDeviceModel } from "@/utils/normalize";

export function ModelAliasesPanel() {
    const { profile } = useAuth();
    const supabase = createClient() as any;

    const [aliases, setAliases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [newAlias, setNewAlias] = useState({
        model_a: "",
        model_b: "",
        notes: ""
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            loadAliases();
        }
    }, [profile?.empresa_id]);

    async function loadAliases() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('device_model_aliases')
                .select('*')
                .eq('tenant_id', profile.empresa_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAliases(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar apelidos de modelos");
        } finally {
            setLoading(false);
        }
    }

    async function handleAddAlias(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        if (!newAlias.model_a || !newAlias.model_b) {
            toast.error("Preencha ambos os modelos");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.from('device_model_aliases').insert({
                tenant_id: profile.empresa_id,
                model_a: normalizeDeviceModel(newAlias.model_a),
                model_b: normalizeDeviceModel(newAlias.model_b),
                notes: newAlias.notes
            });

            if (error) throw error;
            toast.success("Apelido de modelo adicionado!");
            setNewAlias({ model_a: "", model_b: "", notes: "" });
            loadAliases();
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Remover este apelido?")) return;
        try {
            await supabase.from('device_model_aliases').delete().eq('id', id);
            toast.success("Removido com sucesso");
            loadAliases();
        } catch (e) {
            toast.error("Erro ao remover");
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-indigo-500" /> Novo Apelido de Modelo
                </h3>
                <form onSubmit={handleAddAlias} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Modelo A</label>
                        <input
                            type="text"
                            placeholder="Ex: iPhone 11"
                            value={newAlias.model_a}
                            onChange={e => setNewAlias({ ...newAlias, model_a: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Modelo B (Equivalente)</label>
                        <input
                            type="text"
                            placeholder="Ex: iPhone XR"
                            value={newAlias.model_b}
                            onChange={e => setNewAlias({ ...newAlias, model_b: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notas (Opcional)</label>
                            <input
                                type="text"
                                placeholder="Notas..."
                                value={newAlias.notes}
                                onChange={e => setNewAlias({ ...newAlias, notes: e.target.value })}
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="h-11 px-6 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Salvar
                        </button>
                    </div>
                </form>
                <p className="text-[10px] text-slate-400 mt-3 italic">
                    * Isso fará com que buscas por "Modelo A" também mostrem peças vinculadas ao "Modelo B" e vice-versa.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Modelo Original</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Equivalência</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Referência</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Notas</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <Loader2 className="animate-spin mx-auto text-indigo-500" />
                                </td>
                            </tr>
                        ) : aliases.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm italic">
                                    Nenhum apelido cadastrado.
                                </td>
                            </tr>
                        ) : (
                            aliases.map(alias => (
                                <tr key={alias.id} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Smartphone size={14} className="text-slate-300" />
                                            {alias.model_a}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
                                            <ArrowRightLeft size={14} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Smartphone size={14} className="text-slate-300" />
                                            {alias.model_b}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{alias.notes || "-"}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(alias.id)}
                                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
