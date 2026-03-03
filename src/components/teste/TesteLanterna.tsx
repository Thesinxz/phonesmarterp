"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, ZapOff } from "lucide-react";

interface TesteLanternaProps {
    onResult: (ok: boolean) => void;
}

export function TesteLanterna({ onResult }: TesteLanternaProps) {
    const [ativo, setAtivo] = useState(false);
    const [suportado, setSuportado] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    const toggleLanterna = async () => {
        try {
            if (!ativo) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                streamRef.current = stream;
                const track = stream.getVideoTracks()[0];

                // Verificar se o track suporta torch
                const capabilities = (track as any).getCapabilities?.();

                if (capabilities && capabilities.torch) {
                    await (track as any).applyConstraints({
                        advanced: [{ torch: true }]
                    });
                    setAtivo(true);
                } else {
                    setSuportado(false);
                    // No iOS, se não suportar a API, abrimos a câmera para o usuário ver se o flash pisca 
                    // (embora não consigamos ligar manualmente via JS na maioria das versões do Safari)
                }
            } else {
                if (streamRef.current) {
                    const track = streamRef.current.getVideoTracks()[0];
                    await (track as any).applyConstraints({
                        advanced: [{ torch: false }]
                    });
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }
                setAtivo(false);
            }
        } catch (err) {
            console.error("Erro lanterna:", err);
            setSuportado(false);
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${ativo ? 'bg-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.5)]' : 'bg-white/5 border border-white/10'
                }`}>
                {ativo ? <Zap size={56} className="text-white fill-white" /> : <ZapOff size={56} className="text-white/20" />}
            </div>

            <div className="text-center">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Flash / Lanterna</h3>
                <p className="text-white/60 text-sm">
                    Toque no botão para ligar o flash traseiro.
                </p>
                {!suportado && (
                    <p className="mt-2 text-amber-500 text-[10px] font-bold uppercase p-2 bg-amber-500/10 rounded-lg">
                        ⚠️ Controle de lanterna não suportado neste navegador. <br /> Verifique manualmente se o flash dispara ao abrir a câmera.
                    </p>
                )}
            </div>

            <button
                onClick={toggleLanterna}
                className={`w-full py-5 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 ${ativo ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'
                    }`}
            >
                {ativo ? "DESLIGAR LANTERNA" : "LIGAR LANTERNA"}
            </button>

            <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                <button onClick={() => onResult(true)} className="py-5 rounded-2xl bg-emerald-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-emerald-500/20">
                    OK
                </button>
                <button onClick={() => onResult(false)} className="py-5 rounded-2xl bg-red-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-red-500/20">
                    FALHA
                </button>
            </div>
        </div>
    );
}
