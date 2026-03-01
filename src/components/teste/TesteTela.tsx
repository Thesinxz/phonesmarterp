"use client";

import { useState } from "react";

interface TesteTelaProps {
    onResult: (ok: boolean) => void;
}

const CORES = [
    { nome: "Vermelho", hex: "#FF0000", desc: "Verifique se há manchas ou faixas" },
    { nome: "Verde", hex: "#00FF00", desc: "Procure por pixels mortos" },
    { nome: "Azul", hex: "#0000FF", desc: "Verifique a uniformidade" },
    { nome: "Branco", hex: "#FFFFFF", desc: "Verifique dead pixels e brilho" },
    { nome: "Preto", hex: "#000000", desc: "Verifique backlight bleed" },
];

export function TesteTela({ onResult }: TesteTelaProps) {
    const [corAtual, setCorAtual] = useState(-1); // -1 = instruções, 0-4 = cores
    const [fullscreen, setFullscreen] = useState(false);

    const iniciarTeste = () => {
        setCorAtual(0);
        setFullscreen(true);
        // Tenta fullscreen real
        document.documentElement.requestFullscreen?.().catch(() => { });
    };

    const proximaCor = () => {
        if (corAtual < CORES.length - 1) {
            setCorAtual(prev => prev + 1);
        } else {
            setFullscreen(false);
            document.exitFullscreen?.().catch(() => { });
            setCorAtual(-1);
        }
    };

    if (fullscreen && corAtual >= 0) {
        const cor = CORES[corAtual];
        return (
            <div
                className="fixed inset-0 z-[100] flex items-end justify-center"
                style={{ backgroundColor: cor.hex }}
                onClick={proximaCor}
            >
                <div className="bg-black/70 backdrop-blur-md text-white p-4 rounded-t-2xl w-full max-w-sm text-center mb-0 safe-area-bottom">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                        Cor {corAtual + 1}/{CORES.length}
                    </p>
                    <p className="font-bold">{cor.nome}</p>
                    <p className="text-xs text-white/60 mt-0.5">{cor.desc}</p>
                    <p className="text-xs text-white/40 mt-2">Toque para avançar →</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Tela / Display</h3>
                <p className="text-white/60 text-sm">
                    A tela ficará completamente preenchida com <strong className="text-white">5 cores diferentes</strong>.
                    Verifique se há manchas, dead pixels ou faixas estranhas.
                </p>
            </div>

            <div className="flex gap-2 justify-center">
                {CORES.map((cor, i) => (
                    <div
                        key={i}
                        className="w-10 h-10 rounded-lg border-2 border-white/20"
                        style={{ backgroundColor: cor.hex }}
                    />
                ))}
            </div>

            <button
                onClick={iniciarTeste}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
            >
                🎨 Iniciar Teste de Cores
            </button>

            <div className="flex gap-3 w-full mt-2">
                <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ✅ Tela OK
                </button>
                <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ❌ Com Defeito
                </button>
            </div>
        </div>
    );
}
