"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCcw } from "lucide-react";

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
                // Pedir permissão primeiro para ver os nomes das câmeras
                await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === "videoinput");

                // Em iPhones, as labels são genéricas. 
                // Vamos tentar filtrar o que parece ser traseira/frontal se possível, 
                // mas a melhor forma é o facingMode no iniciar().
                setCameras(videoDevices);
            } catch (err: any) {
                console.error("Enum devices error:", err);
                // Se falhar o enum, não bloqueamos, o iniciar() tentará o default
            }
        }
        getCameras();
    }, []);

    useEffect(() => {
        iniciar();
        return () => {
            stopStream();
        };
    }, []);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const iniciar = async (deviceId?: string) => {
        try {
            stopStream();

            const constraints: MediaStreamConstraints = {
                video: deviceId
                    ? { deviceId: { exact: deviceId } }
                    : {
                        facingMode: { ideal: tipo === "traseira" ? "environment" : "user" },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Forçar o play
                try {
                    await videoRef.current.play();
                } catch (e) {
                    console.log("Auto-play blocked, waiting for interaction");
                }
            }
            setStreaming(true);
            setErro(null);
        } catch (err: any) {
            console.error("Camera error:", err);
            setErro(`Não foi possível abrir a câmera ${tipo}. Erro: ${err.name}`);
            setStreaming(false);
        }
    };

    const nextCamera = () => {
        if (cameras.length < 2) return;
        const nextIdx = (cameraIndex + 1) % cameras.length;
        setCameraIndex(nextIdx);
        iniciar(cameras[nextIdx].deviceId);
    };

    const finish = (result: boolean) => {
        stopStream();
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
                        ? "Verifique se a imagem está limpa. Se houver várias lentes traseiras, alterne abaixo se necessário."
                        : "Toque abaixo para abrir e testar."}
                </p>
                {streaming && cameras.length > 1 && (
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-2">
                        Sensor {cameraIndex + 1} de {cameras.length}
                    </p>
                )}
            </div>

            <div className="w-full aspect-square md:aspect-video bg-black rounded-3xl overflow-hidden border-4 border-white/10 relative shadow-2xl">
                {streaming ? (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <Camera size={48} className="text-white/20" />
                        {erro && (
                            <div className="px-6 text-center">
                                <p className="text-red-400 text-xs mb-4">{erro}</p>
                                <button
                                    onClick={() => iniciar()}
                                    className="px-4 py-2 bg-white/10 rounded-full text-white text-xs font-bold"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {streaming && cameras.length > 1 && (
                <button
                    onClick={nextCamera}
                    className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <RefreshCcw size={16} />
                    Mudar Lente / Sensor ({cameraIndex + 1}/{cameras.length})
                </button>
            )}

            {!streaming && !erro && (
                <button
                    onClick={() => iniciar()}
                    className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-transform shadow-xl shadow-indigo-500/30"
                >
                    📸 Abrir Câmera
                </button>
            )}

            {streaming && (
                <div className="grid grid-cols-2 gap-3 w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <button onClick={() => finish(true)} className="py-5 rounded-2xl bg-emerald-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-emerald-500/30">
                        OK
                    </button>
                    <button onClick={() => finish(false)} className="py-5 rounded-2xl bg-red-600 text-white font-black text-xl active:scale-95 transition-transform shadow-lg shadow-red-500/30">
                        FALHA
                    </button>
                </div>
            )}

            {(erro || !streaming) && (
                <button onClick={() => finish(false)} className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2 hover:text-white/50 transition-colors">
                    Pular e Marcar como Defeito
                </button>
            )}
        </div>
    );
}
