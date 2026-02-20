"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";

interface TesteVibracaoProps {
    onResult: (ok: boolean) => void;
}

export function TesteVibracao({ onResult }: TesteVibracaoProps) {
    const [vibrou, setVibrou] = useState(false);

    const vibrar = () => {
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 400]);
            setVibrou(true);
        } else {
            setVibrou(true);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center ${vibrou ? 'animate-[vibrate_0.3s_infinite]' : ''}`}>
                <Smartphone size={48} className="text-purple-400" />
            </div>

            <style jsx>{`
                @keyframes vibrate {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-3px) rotate(-1deg); }
                    75% { transform: translateX(3px) rotate(1deg); }
                }
            `}</style>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Vibração</h3>
                <p className="text-white/60 text-sm">
                    Toque abaixo para acionar o motor de vibração. Verifique se o aparelho vibra normalmente.
                </p>
            </div>

            <button
                onClick={vibrar}
                className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-purple-500/30"
            >
                📳 Vibrar Aparelho
            </button>

            {!navigator.vibrate && (
                <p className="text-amber-400 text-xs text-center">
                    ⚠️ API de vibração não suportada neste navegador. Teste manualmente.
                </p>
            )}

            <div className="flex gap-3 w-full">
                <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ✅ Vibrou OK
                </button>
                <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ❌ Não Vibrou
                </button>
            </div>
        </div>
    );
}
