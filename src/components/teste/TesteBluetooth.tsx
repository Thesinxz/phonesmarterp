"use client";

import { useState } from "react";
import { Bluetooth, Check, X } from "lucide-react";

interface TesteBluetoothProps {
    onResult: (ok: boolean) => void;
}

export function TesteBluetooth({ onResult }: TesteBluetoothProps) {
    const [estado, setEstado] = useState<"idle" | "scanning" | "ok" | "erro">("idle");
    const [erro, setErro] = useState("");

    const testar = async () => {
        setEstado("scanning");
        setErro("");

        if (!navigator.bluetooth) {
            setEstado("erro");
            setErro("Bluetooth não suportado neste navegador ou aparelho.");
            return;
        }

        try {
            // No Web Bluetooth, para "testar" se funciona, geralmente precisamos pedir um dispositivo.
            // Mas podemos apenas verificar se o adaptador está ligado.
            const available = await navigator.bluetooth.getAvailability();

            if (available) {
                // Tentar uma requisição simples apenas para ver se o browser abre o prompt
                // O usuário não precisa parear nada, só ver se o sistema de bluetooth responde
                try {
                    await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true
                    });
                    setEstado("ok");
                } catch (e: any) {
                    if (e.name === "NotFoundError") {
                        // Usuário cancelou ou nenhum dispositivo encontrado, mas o Bluetooth FUNCIONA 
                        // (senão daria erro de "Bluetooth adapter not available")
                        setEstado("ok");
                    } else {
                        throw e;
                    }
                }
            } else {
                setEstado("erro");
                setErro("Adaptador Bluetooth desligado.");
            }
        } catch (err: any) {
            console.error(err);
            setEstado("erro");
            setErro("Bluetooth indisponível ou permissão negada.");
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${estado === "scanning" ? "bg-blue-500/30 animate-pulse" :
                    estado === "ok" ? "bg-emerald-500/20" :
                        estado === "erro" ? "bg-red-500/20" : "bg-indigo-500/20"
                }`}>
                <Bluetooth size={48} className={
                    estado === "scanning" ? "text-blue-400" :
                        estado === "ok" ? "text-emerald-400" :
                            estado === "erro" ? "text-red-400" : "text-indigo-400"
                } />
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Bluetooth</h3>
                <p className="text-white/60 text-sm">
                    {estado === "idle" && "Verificando se o rádio Bluetooth está ativo no aparelho."}
                    {estado === "scanning" && "Verificando disponibilidade..."}
                    {estado === "ok" && "Bluetooth detectado e funcionando!"}
                    {estado === "erro" && erro}
                </p>
            </div>

            {estado === "idle" && (
                <button
                    onClick={testar}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                    🔍 Verificar Bluetooth
                </button>
            )}

            {estado === "ok" && (
                <div className="flex gap-3 w-full animate-in slide-in-from-bottom-4 fade-in">
                    <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                        ✅ Bluetooth OK
                    </button>
                </div>
            )}

            {estado === "erro" && (
                <div className="flex flex-col gap-3 w-full">
                    <button onClick={testar} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm">
                        Tentar Novamente
                    </button>
                    <button onClick={() => onResult(false)} className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                        ❌ Falha no Bluetooth
                    </button>
                </div>
            )}
        </div>
    );
}
