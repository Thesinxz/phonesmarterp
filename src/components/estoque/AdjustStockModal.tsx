"use client";

import { useState } from "react";
import { X, Building2, Package, RefreshCw, MessageSquare } from "lucide-react";
import { adjustUnitStock } from "@/app/actions/parts";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface AdjustStockModalProps {
    itemId: string;
    units: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export function AdjustStockModal({ itemId, units, onClose, onSuccess }: AdjustStockModalProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        unitId: units[0]?.id || "",
        type: "entrada" as "entrada" | "saida" | "ajuste",
        qty: "1",
        reason: ""
    });

    async function handleAdjust() {
        if (!profile) return;
        if (!form.unitId || !form.qty || !form.reason) {
            toast.error("Preencha todos os campos");
            return;
        }

        setLoading(true);
        try {
            await adjustUnitStock(
                profile.empresa_id,
                itemId,
                form.unitId,
                form.type,
                parseInt(form.qty),
                form.reason,
                profile.id
            );
            toast.success("Estoque ajustado!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao ajustar estoque");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shadow-inner">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Ajuste de Estoque</h2>
                            <p className="text-xs text-slate-500">Movimente o estoque entre unidades</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                            <Building2 size={12} /> Unidade
                        </label>
                        <select 
                            value={form.unitId}
                            onChange={(e) => setForm(prev => ({ ...prev, unitId: e.target.value }))}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                        >
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                <Package size={12} /> Tipo
                            </label>
                            <select 
                                value={form.type}
                                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                            >
                                <option value="entrada">Entrada (+)</option>
                                <option value="saida">Saída (-)</option>
                                <option value="ajuste">Ajuste Fixo (=)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                Quantidade
                            </label>
                            <input 
                                type="number"
                                value={form.qty}
                                onChange={(e) => setForm(prev => ({ ...prev, qty: e.target.value }))}
                                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                            <MessageSquare size={12} /> Motivo / Observação
                        </label>
                        <textarea 
                            value={form.reason}
                            onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Ex: Recebido da Loja 1, Erro de contagem..."
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleAdjust}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition-all disabled:opacity-50"
                    >
                        {loading ? "Processando..." : "Confirmar Ajuste"}
                    </button>
                </div>
            </div>
        </div>
    );
}
