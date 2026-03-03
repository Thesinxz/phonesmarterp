"use client";

import { useState, useEffect } from "react";
import { MousePointer2, ChevronUp, ChevronDown, Power } from "lucide-react";

interface TesteBotoesProps {
    onResult: (ok: boolean) => void;
}

export function TesteBotoes({ onResult }: TesteBotoesProps) {
    const [botoes, setBotoes] = useState({
        volUp: false,
        volDown: false,
        power: false
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alguns navegadores mobile emitem eventos para volume
            if (e.key === "AudioVolumeUp") {
                setBotoes(prev => ({ ...prev, volUp: true }));
                e.preventDefault();
            }
            if (e.key === "AudioVolumeDown") {
                setBotoes(prev => ({ ...prev, volDown: true }));
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const tudoAtivo = botoes.volUp && botoes.volDown && botoes.power;

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Botões Físicos</h3>
                <p className="text-white/60 text-sm">
                    Pressione os botões laterais do aparelho.
                </p>
                <p className="text-white/40 text-[10px] uppercase font-bold mt-1">
                    Nota: O botão Power deve ser marcado manualmente.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-[200px]">
                {/* Volume Up */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${botoes.volUp ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 opacity-50'
                    }`}>
                    <span className="text-white font-bold text-sm">Volume (+)</span>
                    <ChevronUp className={botoes.volUp ? "text-emerald-400" : "text-white/20"} />
                </div>

                {/* Volume Down */}
                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${botoes.volDown ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10 opacity-50'
                    }`}>
                    <span className="text-white font-bold text-sm">Volume (-)</span>
                    <ChevronDown className={botoes.volDown ? "text-emerald-400" : "text-white/20"} />
                </div>

                {/* Power (Manual Check) */}
                <button
                    onClick={() => setBotoes(prev => ({ ...prev, power: !prev.power }))}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${botoes.power ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/10'
                        }`}
                >
                    <span className="text-white font-bold text-sm">Botão Power</span>
                    <Power size={18} className={botoes.power ? "text-emerald-400" : "text-white/20"} />
                </button>
            </div>

            <p className="text-white/30 text-[10px] text-center max-w-[220px]">
                Se o navegador não detectar o volume automaticamente, teste-os e marque os botões acima.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                <button onClick={() => onResult(true)} className={`py-5 rounded-2xl text-white font-black text-xl active:scale-95 transition-transform shadow-lg ${tudoAtivo ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-white/10'
                    }`}>
                    OK
                </button>
                <button onClick={() => onResult(false)} className="py-5 rounded-2xl bg-red-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-red-500/20">
                    FALHA
                </button>
            </div>
        </div>
    );
}
