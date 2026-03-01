"use client";

import { useState, useRef, useEffect } from "react";

interface TesteTouchProps {
    onResult: (ok: boolean) => void;
}

export function TesteTouch({ onResult }: TesteTouchProps) {
    const [touched, setTouched] = useState<boolean[]>(new Array(100).fill(false));
    const [touchPercent, setTouchPercent] = useState(0);

    const handleTouch = (index: number) => {
        if (touched[index]) return;
        setTouched((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    };

    useEffect(() => {
        const filled = touched.filter((v) => v).length;
        setTouchPercent(Math.round((filled / 100) * 100));

        if (filled >= 100) {
            if (navigator.vibrate) navigator.vibrate(100);
        }
    }, [touched]);

    const allTouched = touchPercent === 100;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 touch-none select-none">
            {/* Grid de Touch - Tela Inteira */}
            <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
                {touched.map((filled, i) => (
                    <div
                        key={i}
                        onMouseEnter={(e) => {
                            if (e.buttons === 1) handleTouch(i);
                        }}
                        onMouseDown={() => handleTouch(i)}
                        onTouchStart={() => handleTouch(i)}
                        onTouchMove={(e) => {
                            const touch = e.touches[0];
                            const el = document.elementFromPoint(
                                touch.clientX,
                                touch.clientY
                            ) as HTMLElement;
                            if (el && el.dataset.index) {
                                handleTouch(parseInt(el.dataset.index));
                            }
                        }}
                        data-index={i}
                        className={`w-full h-full border-[0.5px] border-white/5 transition-colors duration-150 ${filled ? "bg-emerald-500/90" : "bg-white"
                            }`}
                    />
                ))}
            </div>

            {/* Overlay de Informações */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {!allTouched ? (
                    <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                            Teste de Touch
                        </h3>
                        <div className="flex flex-col items-center">
                            <span className="text-6xl font-black text-indigo-400 tabular-nums">
                                {touchPercent}%
                            </span>
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
                                Área Coberta
                            </span>
                        </div>
                        <p className="text-white/70 text-sm font-medium max-w-[200px] text-center leading-tight">
                            Pinte toda a tela de <strong className="text-emerald-400">verde</strong> para validar o touch.
                        </p>
                        <button
                            onClick={() => onResult(false)}
                            className="pointer-events-auto mt-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Pular (Defeito)
                        </button>
                    </div>
                ) : (
                    <div className="bg-emerald-500 p-10 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-in zoom-in duration-300 pointer-events-auto flex flex-col items-center gap-4">
                        <div className="text-white font-black text-xl uppercase tracking-widest">
                            Sucesso!
                        </div>
                        <button
                            onClick={() => onResult(true)}
                            className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-black text-2xl shadow-xl active:scale-95 transition-all"
                        >
                            CONTINUAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
