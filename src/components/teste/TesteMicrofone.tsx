"use client";

import { useState, useRef } from "react";
import { Mic, Play, Check, X, RefreshCw } from "lucide-react";

interface TesteMicrofoneProps {
    onResult: (ok: boolean) => void;
}

export function TesteMicrofone({ onResult }: TesteMicrofoneProps) {
    const [estado, setEstado] = useState<"idle" | "gravando" | "reproduzindo" | "pronto">("idle");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const gravar = async () => {
        try {
            setErro(null);
            chunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Tentar mime types diferentes para compatibilidade
            const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            let selectedMimeType = '';

            for (const mime of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mime)) {
                    selectedMimeType = mime;
                    break;
                }
            }

            const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: selectedMimeType || "audio/wav" });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setEstado("pronto");
            };

            recorder.start();
            setEstado("gravando");

            // Gravar por 3 segundos
            setTimeout(() => {
                if (recorder.state === "recording") {
                    recorder.stop();
                }
            }, 3000);
        } catch (err: any) {
            console.error("Mic error:", err);
            setErro(`Falha: ${err.name}. Verifique permissões de microfone.`);
        }
    };

    const reproduzir = () => {
        if (audioUrl) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setEstado("reproduzindo");

            audio.play().catch(e => {
                console.error("Playback error:", e);
                setErro("Erro na reprodução. Tente gravar novamente.");
                setEstado("pronto");
            });

            audio.onended = () => {
                setEstado("pronto");
            };
        }
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${estado === "gravando" ? "bg-red-500/40 animate-pulse scale-110" :
                    estado === "reproduzindo" ? "bg-indigo-500/40 animate-bounce" : "bg-white/5 border border-white/10"
                }`}>
                <Mic size={48} className={estado === "gravando" ? "text-red-400" : "text-indigo-400"} />
            </div>

            <div className="text-center max-w-xs">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Microfone</h3>
                <p className="text-white/60 text-sm leading-tight">
                    {estado === "idle" && "Fale algo alto por 3 segundos para testar a captura de áudio."}
                    {estado === "gravando" && "🔴 Capturando áudio... fale agora!"}
                    {estado === "reproduzindo" && "🔊 Reproduzindo som capturado..."}
                    {estado === "pronto" && "Áudio capturado! Ouça agora para validar."}
                </p>
                {erro && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-4 bg-red-500/10 py-2 rounded-lg border border-red-500/20 px-3">{erro}</p>}
            </div>

            {estado === "idle" && (
                <button
                    onClick={gravar}
                    className="w-full py-5 rounded-3xl bg-red-600 text-white font-black text-xl active:scale-95 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-3"
                >
                    <Mic size={24} /> INICIAR GRAVAÇÃO
                </button>
            )}

            {estado === "gravando" && (
                <div className="w-full space-y-4">
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-red-500 rounded-full" style={{ animation: "mic-progress 3s linear forwards" }} />
                    </div>
                    <p className="text-center text-red-400 font-black text-xs animate-pulse">GRAVANDO...</p>
                    <style jsx>{`
                        @keyframes mic-progress {
                            from { width: 0%; }
                            to { width: 100%; }
                        }
                    `}</style>
                </div>
            )}

            {estado === "pronto" && (
                <button
                    onClick={reproduzir}
                    className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-xl active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
                >
                    <Play size={24} fill="currentColor" /> OUVIR GRAVAÇÃO
                </button>
            )}

            {(estado === "pronto" || estado === "reproduzindo") && (
                <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <button
                        onClick={() => onResult(true)}
                        className="py-5 rounded-2xl bg-emerald-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
                    >
                        OK
                    </button>
                    <button
                        onClick={() => onResult(false)}
                        className="py-5 rounded-2xl bg-red-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-red-500/20"
                    >
                        FALHA
                    </button>
                </div>
            )}

            {estado === "pronto" && (
                <button onClick={gravar} className="text-white/30 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-white/50 transition-colors">
                    <RefreshCw size={12} /> Gravar Novamente
                </button>
            )}
        </div>
    );
}
