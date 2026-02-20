"use client";

import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";

interface TesteCameraProps {
    tipo: "traseira" | "frontal";
    onResult: (ok: boolean) => void;
}

export function TesteCamera({ tipo, onResult }: TesteCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streaming, setStreaming] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const iniciar = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: tipo === "traseira" ? "environment" : "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setStreaming(true);
        } catch (err) {
            setErro("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    };

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                    Câmera {tipo === "traseira" ? "Traseira" : "Frontal"}
                </h3>
                <p className="text-white/60 text-sm">
                    {streaming
                        ? "A câmera está ativa. Verifique se a imagem é clara e sem distorções."
                        : "Toque abaixo para abrir a câmera e verificar o funcionamento."}
                </p>
            </div>

            <div className="w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative">
                {streaming ? (
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <Camera size={48} className="text-white/30" />
                        {erro && <p className="text-red-400 text-xs px-4 text-center">{erro}</p>}
                    </div>
                )}
            </div>

            {!streaming && !erro && (
                <button
                    onClick={iniciar}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                    📸 Abrir Câmera {tipo === "traseira" ? "Traseira" : "Frontal"}
                </button>
            )}

            <div className="flex gap-3 w-full">
                <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onResult(true); }} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ✅ OK
                </button>
                <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onResult(false); }} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform">
                    ❌ Defeito
                </button>
            </div>
        </div>
    );
}
