"use client";

import { useState, useEffect } from "react";
import { BatteryCharging, Battery, BatteryFull, AlertCircle } from "lucide-react";

interface TesteCarregamentoProps {
    onResult: (ok: boolean) => void;
}

export function TesteCarregamento({ onResult }: TesteCarregamentoProps) {
    const [status, setStatus] = useState<{ charging: boolean; level: number } | null>(null);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        let batteryObj: any = null;

        const updateBattery = (battery: any) => {
            setStatus({
                charging: battery.charging,
                level: Math.round(battery.level * 100)
            });
        };

        if ((navigator as any).getBattery) {
            (navigator as any).getBattery().then((battery: any) => {
                batteryObj = battery;
                updateBattery(battery);

                battery.addEventListener('chargingchange', () => updateBattery(battery));
                battery.addEventListener('levelchange', () => updateBattery(battery));
            });
        } else {
            setErro(true);
        }

        return () => {
            if (batteryObj) {
                batteryObj.removeEventListener('chargingchange', () => { });
                batteryObj.removeEventListener('levelchange', () => { });
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 scale-110 ${status?.charging ? 'bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-white/5 border border-white/10'
                }`}>
                {status?.charging ? (
                    <BatteryCharging size={56} className="text-emerald-400 animate-pulse" />
                ) : (
                    <Battery size={56} className="text-white/20" />
                )}
            </div>

            <div className="text-center">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Carregamento</h3>

                {erro ? (
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-amber-500 text-sm font-bold">
                            ⚠️ API de Bateria não suportada no seu navegador.
                        </p>
                        <p className="text-white/60 text-xs">
                            Conecte o carregador e verifique manualmente se o raio aparece no ícone de bateria do sistema.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-white/60 text-sm">
                            Conecte o cabo de carga no aparelho.
                        </p>
                        {status && (
                            <div className="mt-4 flex flex-col items-center">
                                <span className={`text-4xl font-black ${status.charging ? 'text-emerald-400' : 'text-white/40'}`}>
                                    {status.level}%
                                </span>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${status.charging ? 'text-emerald-400' : 'text-white/30'}`}>
                                    {status.charging ? "⚡ Carregando Agora" : "Plugue o Carregador..."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                <button onClick={() => onResult(true)} className={`py-5 rounded-2xl text-white font-black text-xl active:scale-95 transition-transform shadow-lg ${status?.charging ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-white/10 opacity-50'
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
