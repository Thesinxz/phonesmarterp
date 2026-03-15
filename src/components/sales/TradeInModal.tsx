"use client";

import { useState } from "react";
import { X, Smartphone, Check, Star, Camera, ArrowRight, Loader2, Package } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { createTradeIn } from "@/app/actions/trade-in";
import { checkTradeInImei } from "@/app/actions/imei";
import { toast } from "sonner";
import { useEffect } from "react";
import { Info, AlertTriangle, RefreshCw as RefreshIcon } from "lucide-react";

interface TradeInModalProps {
    tenantId: string;
    unitId: string;
    clienteId?: string;
    onClose: () => void;
    onApplied: (tradeIn: { 
        id: string, 
        device_name: string, 
        device_imei?: string, 
        applied_value: number, 
        condition: string 
    }) => void;
}

export function TradeInModal({ tenantId, unitId, clienteId, onClose, onApplied }: TradeInModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form data
    const [deviceName, setDeviceName] = useState("");
    const [deviceImei, setDeviceImei] = useState("");
    const [condition, setCondition] = useState<'otimo' | 'bom' | 'regular' | 'ruim'>('bom');
    const [notes, setNotes] = useState("");
    const [evaluatedValue, setEvaluatedValue] = useState<number>(0);
    const [appliedValue, setAppliedValue] = useState<number>(0);
    const [destination, setDestination] = useState<'estoque_direto' | 'assistencia'>('estoque_direto');

    // Historical data
    const [imeiData, setImeiData] = useState<any>(null);
    const [checkingImei, setCheckingImei] = useState(false);

    useEffect(() => {
        if (deviceImei.length === 15) {
            handleCheckImei(deviceImei);
        } else {
            setImeiData(null);
        }
    }, [deviceImei]);

    const handleCheckImei = async (imei: string) => {
        setCheckingImei(true);
        try {
            const data = await checkTradeInImei(tenantId, imei);
            setImeiData(data);
            if (data?.deviceName && !deviceName) {
                setDeviceName(data.deviceName);
            }
        } catch (error) {
            console.error("Error checking IMEI:", error);
        } finally {
            setCheckingImei(false);
        }
    };

    const handleApply = async () => {
        if (!deviceName) {
            toast.error("Informe o modelo do aparelho.");
            return;
        }
        if (appliedValue <= 0) {
            toast.error("O valor aplicado deve ser maior que zero.");
            return;
        }

        setLoading(true);
        try {
            const { tradeInId } = await createTradeIn({
                tenantId,
                unitId,
                clienteId,
                deviceName,
                deviceImei,
                deviceCondition: condition,
                deviceNotes: notes,
                evaluatedValue: Math.round(evaluatedValue * 100),
                appliedValue: Math.round(appliedValue * 100),
                destination,
                evaluatedBy: "me", // Handled by server action logic or could pass actual ID
            });

            onApplied({
                id: tradeInId,
                device_name: deviceName,
                device_imei: deviceImei,
                applied_value: Math.round(appliedValue * 100),
                condition: condition
            });
            toast.success("Trade-in aplicado ao pedido!");
            onClose();
        } catch (error: any) {
            console.error("[TradeInModal] Error:", error);
            toast.error(error.message || "Erro ao salvar trade-in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <GlassCard className="w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative border-brand-500/20 px-0 py-0">
                {/* Header */}
                <div className="p-6 border-b border-white/20 flex items-center justify-between bg-white/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Avaliação de Trade-in</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passo {step} de 3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4 text-left">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Aparelho Recebido</label>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nome / Modelo *</p>
                                    <input 
                                        autoFocus
                                        className="input-glass h-14 text-lg font-bold w-full" 
                                        placeholder="Ex: iPhone 12 Pro Max 256GB"
                                        value={deviceName}
                                        onChange={e => setDeviceName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">IMEI (Recomendado)</p>
                                        <button className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700">
                                            <Camera size={12} /> ESCANEAR
                                        </button>
                                    </div>
                                    <input 
                                        className="input-glass h-12 text-base font-mono w-full" 
                                        placeholder="35..."
                                        value={deviceImei}
                                        onChange={e => setDeviceImei(e.target.value.replace(/\D/g, '').substring(0, 15))}
                                    />
                                    {checkingImei ? (
                                        <div className="flex items-center gap-2 text-[10px] text-brand-600 font-bold animate-pulse">
                                            <Loader2 size={12} className="animate-spin" /> CONSULTANDO HISTÓRICO...
                                        </div>
                                    ) : imeiData?.status === 'vendido' ? (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center gap-2 text-emerald-700">
                                                <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                                    <Check size={14} />
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-tight leading-none">Aparelho identificado — vendido por vocês</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-400 font-bold uppercase">Originalmente em</p>
                                                    <p className="text-slate-700 font-black">{new Date(imeiData.lastSale.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-400 font-bold uppercase">Valor da Venda</p>
                                                    <p className="text-slate-700 font-black">R$ {(imeiData.lastSale.value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-400 font-bold uppercase">Cliente Original</p>
                                                    <p className="text-slate-700 font-black truncate">{imeiData.lastSale.customer}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-400 font-bold uppercase">Vendedor</p>
                                                    <p className="text-slate-700 font-black">{imeiData.lastSale.vendedor || "Sistema"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500 bg-white/50 p-2 rounded-lg border border-emerald-100/50">
                                                <Info size={12} className="text-emerald-500" />
                                                <p>O aparelho pode ser recebido normalmente como trade-in.</p>
                                            </div>
                                        </div>
                                    ) : imeiData?.status === 'em_estoque' || imeiData?.status === 'trade_in' ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertTriangle size={16} />
                                                <span className="text-xs font-black uppercase tracking-tight">Aparelho já consta no estoque</span>
                                            </div>
                                            <p className="text-[10px] text-amber-600 font-medium italic">
                                                Este IMEI já está registrado na {imeiData.lastSale?.unit || "unidade atual"}. Verifique se o código foi digitado corretamente.
                                            </p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setDeviceImei("")}
                                                    className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                                                >
                                                    CORRIGIR IMEI
                                                </button>
                                            </div>
                                        </div>
                                    ) : imeiData?.status === 'bloqueado' ? (
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 animate-in fade-in">
                                            <div className="flex items-center gap-2 text-red-700">
                                                <AlertTriangle size={16} />
                                                <span className="text-xs font-black uppercase tracking-tight text-red-700">IMEI BLOQUEADO (ANATEL)</span>
                                            </div>
                                            <p className="text-[10px] text-red-600 font-medium">
                                                Motivo: {imeiData.reason || "Não especificado"}. Este aparelho não pode ser recebido.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-[9px] text-slate-400 italic font-medium">ⓘ Peça para o cliente digitar *#06# no discador.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4 text-left">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Condição Física</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'otimo', label: 'Ótimo', stars: 4, desc: 'Impecável' },
                                        { id: 'bom', label: 'Bom', stars: 3, desc: 'Marcas leves' },
                                        { id: 'regular', label: 'Regular', stars: 2, desc: 'Marcas visíveis' },
                                        { id: 'ruim', label: 'Ruim', stars: 1, desc: 'Defeitos/Trincas' },
                                    ].map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setCondition(c.id as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1",
                                                condition === c.id 
                                                    ? "border-brand-500 bg-brand-50 shadow-sm"
                                                    : "border-slate-100 bg-white/50 hover:bg-white"
                                            )}
                                        >
                                            <div className="flex text-amber-400 mb-1">
                                                {[...Array(c.stars)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                            </div>
                                            <span className={cn("text-xs font-black", condition === c.id ? "text-brand-700" : "text-slate-600")}>{c.label}</span>
                                            <span className="text-[9px] text-slate-400 text-center">{c.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Observações Detalhadas</p>
                                    <textarea 
                                        className="input-glass w-full p-4 min-h-[100px] text-sm font-medium resize-none"
                                        placeholder="Ex: Tela com risco leve no canto superior, saúde da bateria 88%..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-6 text-left">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Valor Avaliado</p>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                            <input 
                                                type="number"
                                                className="input-glass h-14 pl-12 text-xl font-black w-full" 
                                                value={evaluatedValue || ""}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEvaluatedValue(val);
                                                    setAppliedValue(val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-brand-600 font-bold uppercase tracking-widest">Valor Aplicado (Desconto)</p>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-bold text-sm">R$</span>
                                            <input 
                                                type="number"
                                                className="input-glass h-14 pl-12 text-xl font-black w-full border-brand-500/30" 
                                                value={appliedValue || ""}
                                                onChange={e => setAppliedValue(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Destino do Aparelho</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setDestination('estoque_direto')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all text-left",
                                                destination === 'estoque_direto' ? "border-brand-500 bg-brand-50" : "border-slate-100 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Package size={16} className={destination === 'estoque_direto' ? "text-brand-600" : "text-slate-400"} />
                                                <span className="font-bold text-xs">Estoque Direto</span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 leading-tight">Entra no inventário para precificação e revenda.</p>
                                        </button>
                                        <button 
                                            onClick={() => setDestination('assistencia')}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all text-left",
                                                destination === 'assistencia' ? "border-brand-500 bg-brand-50" : "border-slate-100 bg-white"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Loader2 size={16} className={destination === 'assistencia' ? "text-brand-600" : "text-slate-400"} />
                                                <span className="font-bold text-xs">Assistência Técnica</span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 leading-tight">Cria uma OS para revisão antes de entrar em estoque.</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    {step > 1 ? (
                        <button 
                            onClick={() => setStep(step - 1)}
                            className="px-6 h-12 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Voltar
                        </button>
                    ) : (
                        <div />
                    )}
                    
                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(step + 1)}
                            disabled={(step === 1 && (!deviceName || imeiData?.status === 'bloqueado'))}
                            className="px-8 h-12 btn-primary font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                        >
                            Avançar <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleApply}
                            disabled={loading || appliedValue <= 0}
                            className="px-10 h-12 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            Aplicar Trade-in
                        </button>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
