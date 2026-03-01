"use client";

import { useState, useRef } from "react";
import { Mic } from "lucide-react";

interface TesteMicrofoneProps {
    onResult: (ok: boolean) => void;
}

export function TesteMicrofone({ onResult }: TesteMicrofoneProps) {
    const [estado, setEstado] = useState<"idle" | "gravando" | "reproduzindo" | "pronto">("idle");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const gravar = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                setEstado("pronto");
            };

            recorder.start();
            setEstado("gravando");

            setTimeout(() => {
                if (recorder.state === "recording") {
                    recorder.stop();
                }
            }, 3000);
        } catch (err) {
            setErro("Não foi possível acessar o microfone.");
        }
    };

    const reproduzir = () => {
        if (audioRef.current) {
            audioRef.current.play();
            setEstado("reproduzindo");
            audioRef.current.onended = () => setEstado("pronto");
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${estado === "gravando" ? "bg-red-500/30 animate-pulse" : "bg-indigo-500/20"
                }`}>
                <Mic size={48} className={estado === "gravando" ? "text-red-400" : "text-indigo-400"} />
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Teste de Microfone</h3>
                <p className="text-white/60 text-sm">
                    {estado === "idle" && "Grave 3 segundos de áudio e reproduza para verificar o microfone."}
                    {estado === "gravando" && "🔴 Gravando... Fale algo no microfone!"}
                    {estado === "reproduzindo" && "🔊 Reproduzindo gravação..."}
                    {estado === "pronto" && "Gravação concluída! Reproduza para verificar."}
                </p>
                {erro && <p className="text-red-400 text-xs mt-2">{erro}</p>}
            </div>

            {estado === "idle" && (
                <button onClick={gravar} className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-red-500/30">
                    🎤 Gravar 3 Segundos
                </button>
            )}

            {estado === "gravando" && (
                <div className="w-full">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full animate-[progress_3s_linear]" style={{ animation: "progress 3s linear forwards" }} />
                    </div>
                    <style jsx>{`@keyframes progress { from { width: 0%; } to { width: 100%; } }`}</style>
                </div>
            )}

            {estado === "pronto" && (
                <button onClick={reproduzir} className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30">
                    🔊 Reproduzir Gravação
                </button>
            )}

            {(estado === "pronto" || estado === "reproduzindo") && (
                <div className="flex gap-3 w-full">
                    <button onClick={() => onResult(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                        ✅ Microfone OK
                    </button>
                    <button onClick={() => onResult(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                        ❌ Defeito
                    </button>
                </div>
            )}
        </div>
    );
}
