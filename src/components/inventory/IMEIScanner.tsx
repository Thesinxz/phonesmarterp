"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    Barcode, 
    Camera, 
    Keyboard, 
    CheckCircle2, 
    AlertCircle, 
    ShieldAlert, 
    Loader2, 
    Search,
    RefreshCw
} from "lucide-react";
import { cn } from "@/utils/cn";
import { validateIMEIFull } from "@/app/actions/imei";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { validateIMEILuhn } from "@/utils/tac-lookup";

interface IMEIScannerProps {
    value: string;
    onChange: (imei: string) => void;
    onValidated?: (result: any) => void;
    tenantId: string;
    currentItemId?: string;
}

type Tab = "reader" | "camera" | "manual";

export function IMEIScanner({ value, onChange, onValidated, tenantId, currentItemId }: IMEIScannerProps) {
    const [activeTab, setActiveTab] = useState<Tab>("reader");
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Camera state
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

    // Physical reader focus
    const readerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab === "reader") {
            readerInputRef.current?.focus();
        }
    }, [activeTab]);

    const handleValidate = async (imeiToValidate: string) => {
        if (!imeiToValidate || imeiToValidate.length < 15) return;
        
        setIsValidating(true);
        setError(null);
        try {
            const result = await validateIMEIFull(tenantId, imeiToValidate, currentItemId);
            setValidationResult(result);
            if (onValidated) onValidated(result);
        } catch (err) {
            setError("Erro ao validar IMEI. Tente novamente.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleCameraToggle = async () => {
        if (isCameraActive) {
            setIsCameraActive(false);
            codeReaderRef.current = null;
        } else {
            setIsCameraActive(true);
            try {
                const codeReader = new BrowserMultiFormatReader();
                codeReaderRef.current = codeReader;
                
                if (videoRef.current) {
                    await codeReader.decodeFromVideoDevice(
                        undefined, 
                        videoRef.current, 
                        (result, err) => {
                            if (result) {
                                const code = result.getText();
                                if (/^\d{15}$/.test(code)) {
                                    onChange(code);
                                    handleValidate(code);
                                    setIsCameraActive(false);
                                }
                            }
                        }
                    );
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Não foi possível acessar a câmera.");
                setIsCameraActive(false);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (isCameraActive) {
                // Cleanup camera on unmount
                codeReaderRef.current = null;
            }
        };
    }, [isCameraActive]);

    return (
        <div className="space-y-4 w-full">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: "reader", icon: Barcode, label: "Leitor" },
                    { id: "camera", icon: Camera, label: "Câmera" },
                    { id: "manual", icon: Keyboard, label: "Manual" }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setActiveTab(t.id as Tab);
                            setIsCameraActive(false);
                        }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                            activeTab === t.id 
                                ? "bg-white text-brand-600 shadow-sm" 
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm min-h-[140px] flex flex-col justify-center">
                
                {activeTab === "reader" && (
                    <div className="space-y-3 text-center">
                        <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Barcode size={24} className="text-brand-600 animate-pulse" />
                        </div>
                        <p className="text-sm text-slate-500">Aponte o leitor para o código de barras do IMEI</p>
                        <input
                            ref={readerInputRef}
                            type="text"
                            value={value}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 15);
                                onChange(val);
                                if (val.length === 15) handleValidate(val);
                            }}
                            className="absolute opacity-0 pointer-events-none"
                            autoFocus
                        />
                        {value && (
                            <div className="text-2xl font-black tracking-widest text-slate-800 font-mono">
                                {value.match(/.{1,4}/g)?.join(" ") || value}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "camera" && (
                    <div className="space-y-4">
                        {!isCameraActive ? (
                            <button 
                                onClick={handleCameraToggle}
                                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                                <Camera size={32} className="text-slate-400" />
                                <span className="text-sm font-semibold text-slate-500">Ativar Câmera</span>
                            </button>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                <video ref={videoRef} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 border-2 border-brand-500/50 flex items-center justify-center">
                                    <div className="w-48 h-32 border-2 border-white/50 rounded-lg" />
                                </div>
                                <button 
                                    onClick={handleCameraToggle}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold"
                                >
                                    Parar Câmera
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "manual" && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Digite os 15 dígitos do IMEI"
                                value={value}
                                onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 15))}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-mono tracking-wider focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                            />
                            <button
                                onClick={() => handleValidate(value)}
                                disabled={value.length < 15 || isValidating}
                                className="bg-brand-600 text-white px-6 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 disabled:grayscale transition-all"
                            >
                                {isValidating ? <Loader2 className="animate-spin" size={20} /> : "Validar"}
                            </button>
                        </div>
                        {value && value.length === 15 && (
                          <p className={cn(
                            "text-[10px] font-bold mt-1",
                            validateIMEILuhn(value) ? "text-emerald-600" : "text-red-500"
                          )}>
                            {validateIMEILuhn(value) ? "✓ IMEI válido" : "✗ IMEI inválido — verifique os dígitos"}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Dica: O IMEI está na caixa do aparelho ou digite *#06#</p>
                    </div>
                )}
            </div>

            {/* Validation Feedback */}
            {isValidating && (
                <div className="flex items-center gap-2 text-brand-600 animate-in fade-in slide-in-from-top-1">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-bold">Verificando IMEI...</span>
                </div>
            )}

            {validationResult && !isValidating && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    {/* Status Summary */}
                    <div className={cn(
                        "p-3 rounded-xl border flex items-start gap-3",
                        validationResult.canProceed 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                            : "bg-red-50 border-red-100 text-red-800"
                    )}>
                        <div className="mt-0.5">
                            {validationResult.canProceed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold">
                                {validationResult.canProceed ? "IMEI Válido e Disponível" : "Este IMEI possui restrições"}
                            </p>
                            <p className="text-[10px] opacity-80 mt-0.5">
                                {validationResult.anatel.fromCache ? "Verificado via cache Anatel (24h)" : "Verificado agora via API Anatel"}
                            </p>
                        </div>
                    </div>

                    {/* Warnings/Errors List */}
                    {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                        <div className="space-y-1">
                            {validationResult.errors.map((err: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                    <ShieldAlert size={12} />
                                    {err}
                                </div>
                            ))}
                            {validationResult.warnings.map((warn: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                    <AlertCircle size={12} />
                                    {warn}
                                </div>
                            ))}
                        </div>
                    )}

                    {!validationResult.canProceed && (
                        <p className="text-[10px] text-slate-400 italic">
                            Apenas administradores podem forçar o cadastro de IMEIs com erro.
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="text-xs font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}
        </div>
    );
}
