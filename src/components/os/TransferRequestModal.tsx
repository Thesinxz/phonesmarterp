"use client";

import { useState, useEffect } from "react";
import { X, Send, Loader2, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TransferRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (toUnitId: string, notes: string) => void;
    currentUnitId: string;
    tenantId: string;
}

export function TransferRequestModal({ isOpen, onClose, onConfirm, currentUnitId, tenantId }: TransferRequestModalProps) {
    const [units, setUnits] = useState<{ id: string, name: string }[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadUnits();
        }
    }, [isOpen]);

    async function loadUnits() {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await (supabase.from('units') as any)
                .select('id, name')
                .eq('empresa_id', tenantId)
                .eq('is_active', true)
                .eq('has_repair_lab', true)
                .neq('id', currentUnitId);
            setUnits(data || []);
            if (data && (data as any).length > 0) setSelectedUnitId((data as any)[0].id);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Send size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Enviar para Outra Unidade</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Selecione a Unidade de Destino</label>
                        {loading ? (
                            <div className="h-14 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
                                <Loader2 className="animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {units.map(unit => (
                                    <button
                                        key={unit.id}
                                        onClick={() => setSelectedUnitId(unit.id)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                            selectedUnitId === unit.id 
                                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm" 
                                            : "border-slate-100 hover:border-slate-200 text-slate-600"
                                        }`}
                                    >
                                        <Store size={18} className={selectedUnitId === unit.id ? "text-indigo-600" : "text-slate-400"} />
                                        <span className="font-bold">{unit.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Observações do Envio</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: Caixa lacrada, nota fiscal em cima..."
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 h-24 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!selectedUnitId || loading}
                            onClick={() => onConfirm(selectedUnitId, notes)}
                            className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-xs flex items-center justify-center gap-2"
                        >
                            Confirmar Envio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
