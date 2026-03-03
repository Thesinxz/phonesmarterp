"use client";

import { useState } from "react";
import { type OrdemServico } from "@/types/database";
import { updateOS } from "@/services/os";
import { GlassCard } from "@/components/ui/GlassCard";
import { X, Save, RefreshCw, Hash, User, Smartphone, Wrench, FileText, DollarSign, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface EditOSModalProps {
    os: any;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditOSModal({ os, onClose, onSuccess }: EditOSModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        numero: os.numero,
        problema_relatado: os.problema_relatado || "",
        diagnostico: os.diagnostico || "",
        marca_equipamento: os.marca_equipamento || os.equipamento?.marca || "",
        modelo_equipamento: os.modelo_equipamento || os.equipamento?.modelo || "",
        cor_equipamento: os.cor_equipamento || os.equipamento?.cor || "",
        imei_equipamento: os.imei_equipamento || os.equipamento?.imei || os.numero_serie || "",
        senha_dispositivo: os.senha_dispositivo || "",
        valor_total_centavos: os.valor_total_centavos || 0,
        garantia_dias: os.garantia_dias || 90,
        unidade_garantia: "dias"
    });

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateOS(os.id, {
                numero: Number(formData.numero),
                problema_relatado: formData.problema_relatado,
                diagnostico: formData.diagnostico,
                marca_equipamento: formData.marca_equipamento,
                modelo_equipamento: formData.modelo_equipamento,
                cor_equipamento: formData.cor_equipamento,
                imei_equipamento: formData.imei_equipamento,
                senha_dispositivo: formData.senha_dispositivo,
                valor_total_centavos: Number(formData.valor_total_centavos),
                garantia_dias: Number(formData.garantia_dias)
            });
            toast.success("Ordem de Serviço atualizada com sucesso!");
            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao atualizar OS: " + (error.message || "Erro desconhecido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Editar Ordem de Serviço
                        </h2>
                        <p className="text-xs text-slate-500">Altere os dados principais da OS</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Identificação */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <Hash size={10} /> Número da OS
                                </label>
                                <input
                                    type="number"
                                    value={formData.numero}
                                    onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                                <p className="text-[9px] text-amber-600 mt-1 font-medium italic">* Cuidado ao alterar sequências numéricas.</p>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <Shield size={10} /> Garantia (Dias)
                                </label>
                                <input
                                    type="number"
                                    value={formData.garantia_dias}
                                    onChange={e => setFormData({ ...formData, garantia_dias: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Valor */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <DollarSign size={10} /> Valor Total (Centavos)
                                </label>
                                <input
                                    type="number"
                                    value={formData.valor_total_centavos}
                                    onChange={e => setFormData({ ...formData, valor_total_centavos: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">Ex: 15000 = R$ 150,00</p>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <Smartphone size={10} /> Senha do Dispositivo
                                </label>
                                <input
                                    type="text"
                                    value={formData.senha_dispositivo}
                                    onChange={e => setFormData({ ...formData, senha_dispositivo: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all uppercase placeholder:normal-case"
                                    placeholder="PIN ou Senha"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-6">
                        {/* Equipamento */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-tighter mb-2 flex items-center gap-1">
                                <Smartphone size={12} /> Dados do Equipamento
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Marca</label>
                                    <input
                                        type="text"
                                        value={formData.marca_equipamento}
                                        onChange={e => setFormData({ ...formData, marca_equipamento: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Modelo</label>
                                    <input
                                        type="text"
                                        value={formData.modelo_equipamento}
                                        onChange={e => setFormData({ ...formData, modelo_equipamento: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">IMEI / Serial</label>
                                <input
                                    type="text"
                                    value={formData.imei_equipamento}
                                    onChange={e => setFormData({ ...formData, imei_equipamento: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Relatos */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-tighter mb-2 flex items-center gap-1">
                                <Wrench size={12} /> Diagnóstico e Problema
                            </h3>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Defeito Informado</label>
                                <textarea
                                    value={formData.problema_relatado}
                                    onChange={e => setFormData({ ...formData, problema_relatado: e.target.value })}
                                    className="w-full h-20 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <FileText size={10} /> Diagnóstico Técnico / Laudo
                        </label>
                        <textarea
                            value={formData.diagnostico}
                            onChange={e => setFormData({ ...formData, diagnostico: e.target.value })}
                            placeholder="Descreva o que foi encontrado e o serviço necessário..."
                            className="w-full h-24 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="h-11 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
}
