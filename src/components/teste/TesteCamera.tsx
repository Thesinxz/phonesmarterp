"use client";

import { useState, useRef, useEffect } from "react";
import { Camera } from "lucide-react";

interface TesteCameraProps {
    tipo: "traseira" | "frontal";
    onResult: (ok: boolean) => void;
}

export function TesteCamera({ tipo, onResult }: TesteCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [cameraIndex, setCameraIndex] = useState(0);

    const [streaming, setStreaming] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    // Listar câmeras do tipo solicitado
    useEffect(() => {
        async function getCameras() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === "videoinput");

                // Filtro heurístico baseado nas labels dos dispositivos (se conseguir)
                // Se label for vazio ou não der pra distinguir, tentaremos abrir na hora usando o facingMode.
                // Idealmente em mobile, getUserMedia já lida melhor. Mas vamos salvar todos e permitir o usuário alternar.

                setCameras(videoDevices);
            } catch {
                setErro("Erro ao listar as câmeras disponíveis.");
            }
        }
        getCameras();
    }, []);

    const iniciar = async (deviceId?: string) => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : { facingMode: tipo === "traseira" ? "environment" : "user", width: { ideal: 1280 } }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setStreaming(true);
            setErro(null);
        } catch (err) {
            setErro("Falha ao abrir câmera. Verifique permissões.");
            setStreaming(false);
        }
    };

    const nextCamera = () => {
        if (cameras.length === 0) return;
        const nextIndex = (cameraIndex + 1) % cameras.length;
        setCameraIndex(nextIndex);
        iniciar(cameras[nextIndex].deviceId);
    };

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    const finish = (result: boolean) => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        onResult(result);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                    Câmera {tipo === "traseira" ? "Traseira" : "Frontal"}
                </h3>
                <p className="text-white/60 text-sm">
                    {streaming
                        ? cameras.length > 1 ? "Verifique todas as lentes traseiras do aparelho caso existam várias." : "Verifique se a imagem está limpa e sem manchas."
                        : "Toque abaixo para abrir e testar."}
                </p>
                {streaming && cameras.length > 1 && (
                    <p className="text-indigo-400 text-xs font-bold mt-2">
                        Câmera {cameraIndex + 1} de {cameras.length}
                    </p>
                )}
            </div>

            <div className="w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border-4 border-white/10 relative shadow-xl">
                {streaming ? (
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <Camera size={48} className="text-white/30" />
                        {erro && <p className="text-red-400 text-xs px-4 text-center bg-red-500/10 py-2 rounded-xl border border-red-500/20">{erro}</p>}
                    </div>
                )}
            </div>

            {streaming && cameras.length > 1 && (
                <button
                    onClick={nextCamera}
                    className="w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm active:scale-95 transition-transform"
                >
                    🔄 Testar Próxima Lente ({cameraIndex + 1}/{cameras.length})
                </button>
            )}

            {!streaming && !erro && (
                <button
                    onClick={() => iniciar()}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                    📸 Ativar Câmera
                </button>
            )}

            {streaming && (
                <div className="flex gap-3 w-full animate-in slide-in-from-bottom-4 fade-in">
                    <button onClick={() => finish(true)} className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-emerald-500/30">
                        ✅ OK
                    </button>
                    <button onClick={() => finish(false)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-red-500/30">
                        ❌ Defeito
                    </button>
                </div>
            )}

            {erro && (
                <button onClick={() => finish(false)} className="text-white/40 text-xs underline mt-4 bg-black/20 px-4 py-2 rounded-full">
                    Pular e Marcar como Defeito
                </button>
            )}
        </div>
    );
}
