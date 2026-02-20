"use client";

import { useState, useRef, useEffect } from "react";

interface TesteTouchProps {
    onResult: (ok: boolean) => void;
}

export function TesteTouch({ onResult }: TesteTouchProps) {
    const [touched, setTouched] = useState<Set<number>>(new Set());
    const zones = 9; // 3x3 grid
    const allTouched = touched.size >= zones;

    const handleTouch = (zone: number) => {
        setTouched(prev => {
            const next = new Set(prev);
            next.add(zone);
            return next;
        });
    };

    useEffect(() => {
        if (allTouched) {
            // Vibrar ao completar
            if (navigator.vibrate) navigator.vibrate(100);
        }
    }, [allTouched]);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Touch</h3>
                <p className="text-white/60 text-sm">
                    Toque em <strong className="text-white">todos os quadrados</strong> abaixo.
                    Eles ficarão verdes ao serem tocados.
                </p>
                <p className="text-indigo-400 text-xs mt-1 font-bold">{touched.size}/{zones} zonas tocadas</p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full aspect-square max-w-xs">
                {Array.from({ length: zones }).map((_, i) => (
                    <button
                        key={i}
                        onTouchStart={() => handleTouch(i)}
                        onMouseDown={() => handleTouch(i)}
                        className={`rounded-xl border-2 transition-all duration-200 active:scale-95 flex items-center justify-center text-2xl font-bold ${touched.has(i)
                                ? 'bg-emerald-500 border-emerald-400 text-white scale-95'
                                : 'bg-white/10 border-white/20 text-white/40'
                            }`}
                    >
                        {touched.has(i) ? '✓' : i + 1}
                    </button>
                ))}
            </div>

            {allTouched && (
                <div className="w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <p className="text-emerald-400 text-center font-bold mb-3">✅ Todas as zonas responderam!</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                            ✅ Touch OK
                        </button>
                        <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                            ❌ Com Problema
                        </button>
                    </div>
                </div>
            )}

            {!allTouched && (
                <button onClick={() => onResult(false)} className="text-white/40 text-xs underline mt-4">
                    Pular (marcar como defeito)
                </button>
            )}
        </div>
    );
}
