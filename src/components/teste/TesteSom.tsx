"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, Play, Square } from "lucide-react";

interface TesteSomProps {
    tipo: "inferior" | "auricular";
    onResult: (ok: boolean) => void;
}

export function TesteSom({ tipo, onResult }: TesteSomProps) {
    const [tocando, setTocando] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // URL de uma música de teste curta e leve (Royalty Free)
    const AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    const tocar = () => {
        if (tocando) {
            audioRef.current?.pause();
            setTocando(false);
            return;
        }

        const audio = new Audio(AUDIO_URL);
        audioRef.current = audio;

        // No auricular, o som deve ser emitido pelo alto-falante de chamadas.
        // Em navegadores mobile, isso nem sempre é possível controlar via software (JS),
        // mas podemos baixar o volume significativamente para simular o uso no ouvido.
        audio.volume = tipo === "auricular" ? 0.15 : 0.8;

        audio.play().catch(e => {
            console.error("Erro ao tocar áudio:", e);
            alert("Toque na tela para permitir a reprodução de áudio.");
        });

        setTocando(true);

        audio.onended = () => {
            setTocando(false);
        };
    };

    const parar = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setTocando(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${tocando ? 'bg-indigo-500/30 scale-110' : 'bg-white/5 border border-white/10'
                }`}>
                <div className={`${tocando ? 'animate-bounce' : ''}`}>
                    <Volume2 size={56} className="text-indigo-400" />
                </div>
            </div>

            <div className="text-center max-w-xs">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">
                    {tipo === "inferior" ? "Alto-falante" : "Som Auricular"}
                </h3>
                <p className="text-white/60 text-sm leading-tight">
                    {tipo === "inferior"
                        ? "Reproduza a música para verificar a qualidade do alto-falante principal (campainha)."
                        : "Coloque o aparelho no ouvido. Você deve ouvir a música em volume reduzido pelo auricular."}
                </p>
            </div>

            {!tocando ? (
                <button
                    onClick={tocar}
                    className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-xl active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
                >
                    <Play size={24} fill="currentColor" /> REPRODUZIR MÚSICA
                </button>
            ) : (
                <button
                    onClick={parar}
                    className="w-full py-5 rounded-3xl bg-indigo-900 text-indigo-300 font-black text-xl active:scale-95 transition-all border-2 border-indigo-500/30 flex items-center justify-center gap-3"
                >
                    <Square size={24} fill="currentColor" /> PARAR MÚSICA
                </button>
            )}

            <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                <button
                    onClick={() => { parar(); onResult(true); }}
                    className="py-5 rounded-2xl bg-emerald-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
                >
                    OK
                </button>
                <button
                    onClick={() => { parar(); onResult(false); }}
                    className="py-5 rounded-2xl bg-red-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-red-500/20"
                >
                    FALHA
                </button>
            </div>
        </div>
    );
}
