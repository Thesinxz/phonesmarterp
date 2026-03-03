"use client";

import { useState, useRef, useEffect } from "react";

interface TesteTouchProps {
    onResult: (ok: boolean) => void;
}

export function TesteTouch({ onResult }: TesteTouchProps) {
    // Aumentando a grade para 10x15 para melhor cobertura em mobile portrait
    const COLS = 10;
    const ROWS = 15;
    const TOTAL = COLS * ROWS;

    const [touched, setTouched] = useState<boolean[]>(new Array(TOTAL).fill(false));
    const [touchPercent, setTouchPercent] = useState(0);

    const handleTouch = (index: number) => {
        if (index < 0 || index >= TOTAL || touched[index]) return;
        setTouched((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    };

    useEffect(() => {
        const filled = touched.filter((v) => v).length;
        setTouchPercent(Math.round((filled / TOTAL) * 100));

        if (filled >= TOTAL) {
            if (navigator.vibrate) navigator.vibrate(150);
        }
    }, [touched]);

    const allTouched = touchPercent === 100;

    // Detectar touch por coordenadas para garantir que arraste funcione bem
    const handleGlobalTouch = (e: React.TouchEvent | React.MouseEvent) => {
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            if (e.buttons !== 1) return;
            x = e.clientX;
            y = e.clientY;
        }

        const el = document.elementFromPoint(x, y) as HTMLElement;
        if (el && el.dataset.index) {
            handleTouch(parseInt(el.dataset.index));
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black touch-none select-none overscroll-none overflow-hidden"
            onMouseMove={handleGlobalTouch}
            onTouchMove={handleGlobalTouch}
            onMouseDown={handleGlobalTouch}
            onTouchStart={handleGlobalTouch}
        >
            {/* Grid de Touch */}
            <div
                className="grid w-screen h-screen"
                style={{
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`
                }}
            >
                {touched.map((filled, i) => (
                    <div
                        key={i}
                        data-index={i}
                        className={`w-full h-full border-[0.1px] border-white/5 transition-colors duration-75 ${filled ? "bg-emerald-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" : "bg-white/5"
                            }`}
                    />
                ))}
            </div>

            {/* Overlay de Informações */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {!allTouched ? (
                    <div className="bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500 text-center">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">
                            Teste de Touch
                        </h3>

                        <div className="flex flex-col items-center -my-2">
                            <span className="text-7xl font-black text-indigo-400 tabular-nums tracking-tighter">
                                {touchPercent}%
                            </span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] -mt-2">
                                Checkpoint
                            </span>
                        </div>

                        <p className="text-white/60 text-xs font-medium max-w-[220px] leading-relaxed mt-2">
                            Arraste o dedo por <strong className="text-white">toda a tela</strong> até preencher os espaços em <strong className="text-emerald-400">verde</strong>.
                        </p>

                        <button
                            onClick={() => onResult(false)}
                            className="pointer-events-auto mt-4 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all"
                        >
                            Pular (Relatar Defeito)
                        </button>
                    </div>
                ) : (
                    <div className="bg-emerald-500 p-12 rounded-[3rem] shadow-[0_0_80px_rgba(16,185,129,0.6)] animate-in zoom-in spin-in-6 duration-500 pointer-events-auto flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <div className="text-center">
                            <div className="text-white font-black text-3xl uppercase tracking-tighter italic">
                                SUCESSO!
                            </div>
                            <div className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Sensor de toque validado
                            </div>
                        </div>

                        <button
                            onClick={() => onResult(true)}
                            className="bg-white text-emerald-600 px-12 py-5 rounded-[1.5rem] font-black text-2xl shadow-2xl active:scale-90 transition-all uppercase tracking-tight"
                        >
                            CONTINUAR
                        </button>
                    </div>
                )}
            </div>

            {/* Safe Area Masks (opcional para esconder notches se não estiver em fullscreen real) */}
            <div className="absolute top-0 left-0 right-0 h-safe-top bg-black/20 pointer-events-none" />
        </div>
    );
}
