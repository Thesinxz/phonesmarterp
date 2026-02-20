"use client";

import { useState, useEffect } from "react";
import { Wifi } from "lucide-react";

interface TesteConectividadeProps {
    onResult: (ok: boolean) => void;
}

export function TesteConectividade({ onResult }: TesteConectividadeProps) {
    const [testando, setTestando] = useState(false);
    const [resultado, setResultado] = useState<{ online: boolean; latencia: number | null } | null>(null);

    const testar = async () => {
        setTestando(true);
        const online = navigator.onLine;
        let latencia: number | null = null;

        if (online) {
            try {
                const start = performance.now();
                await fetch("https://www.google.com/favicon.ico", { mode: "no-cors", cache: "no-store" });
                latencia = Math.round(performance.now() - start);
            } catch {
                latencia = null;
            }
        }

        setResultado({ online, latencia });
        setTestando(false);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${resultado?.online ? "bg-emerald-500/20" : "bg-indigo-500/20"
                }`}>
                <Wifi size={48} className={resultado?.online ? "text-emerald-400" : "text-indigo-400"} />
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Wi-Fi / Internet</h3>
                <p className="text-white/60 text-sm">
                    Verifica se o aparelho está conectado à internet e mede a latência.
                </p>
            </div>

            {resultado && (
                <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-white/60 text-sm">Conexão</span>
                        <span className={`font-bold ${resultado.online ? "text-emerald-400" : "text-red-400"}`}>
                            {resultado.online ? "✅ Online" : "❌ Offline"}
                        </span>
                    </div>
                    {resultado.latencia !== null && (
                        <div className="flex justify-between items-center">
                            <span className="text-white/60 text-sm">Latência</span>
                            <span className="font-bold text-indigo-400">{resultado.latencia}ms</span>
                        </div>
                    )}
                </div>
            )}

            {!resultado && (
                <button
                    onClick={testar}
                    disabled={testando}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                    {testando ? "Testando..." : "📶 Testar Conexão"}
                </button>
            )}

            <div className="flex gap-3 w-full">
                <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ✅ Wi-Fi OK
                </button>
                <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ❌ Sem Conexão
                </button>
            </div>
        </div>
    );
}
