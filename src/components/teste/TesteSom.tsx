"use client";

import { useState, useRef } from "react";
import { Volume2 } from "lucide-react";

interface TesteSomProps {
    tipo: "inferior" | "auricular";
    onResult: (ok: boolean) => void;
}

export function TesteSom({ tipo, onResult }: TesteSomProps) {
    const [tocando, setTocando] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const tocar = () => {
        setTocando(true);
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = tipo === "auricular" ? "sine" : "square";
        osc.frequency.value = tipo === "auricular" ? 1000 : 440;
        gain.gain.value = tipo === "auricular" ? 0.3 : 0.8;

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        setTimeout(() => {
            osc.stop();
            ctx.close();
            setTocando(false);
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Volume2 size={48} className={`text-indigo-400 ${tocando ? 'animate-pulse' : ''}`} />
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                    {tipo === "inferior" ? "Alto-falante Inferior" : "Auricular (Topo)"}
                </h3>
                <p className="text-white/60 text-sm">
                    {tipo === "inferior"
                        ? "Toque o botão abaixo. Você deve ouvir um som pelo alto-falante inferior."
                        : "Toque o botão abaixo. Você deve ouvir um som baixo pelo auricular (alto-falante de ligação)."}
                </p>
            </div>

            {!tocando ? (
                <button
                    onClick={tocar}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                    🔊 Tocar Som
                </button>
            ) : (
                <div className="w-full py-4 rounded-2xl bg-indigo-900 text-indigo-300 font-bold text-lg text-center animate-pulse">
                    Tocando...
                </div>
            )}

            <div className="flex gap-3 w-full">
                <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ✅ Funcionou
                </button>
                <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ❌ Não Funcionou
                </button>
            </div>
        </div>
    );
}
