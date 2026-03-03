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

    const [camerasDoTipo, setCamerasDoTipo] = useState<MediaDeviceInfo[]>([]);
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

                // No iOS/Safari, labels como 'front' ou 'back' nem sempre estão presentes de forma clara inicialmente.
                // Mas ao usar facingMode as câmeras retornadas costumam ser filtradas pelo sistema.
                // Vamos tentar identificar se é frontal ou traseira buscando palavras chave nos labels (quando disponíveis).

                let filtradas = videoDevices;

                // Tentar filtrar baseando-se no label se o browser fornecer
                if (videoDevices.some(d => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('back'))) {
                    filtradas = videoDevices.filter(d => {
                        const label = d.label.toLowerCase();
                        if (tipo === "frontal") {
                            return label.includes("front") || label.includes("user") || label.includes("selfie");
                        } else {
                            return label.includes("back") || label.includes("rear") || label.includes("environment");
                        }
                    });
                }

                // Se o filtro via label resultou em nada ou se o iOS não deu labels úteis ainda,
                // vamos confiar nas constraints de facingMode na hora do 'getUserMedia' e 
                // não listar todas as câmeras indiscriminadamente.
                setCamerasDoTipo(filtradas.length > 0 ? filtradas : videoDevices);
            } catch (err: any) {
                console.error("Enum devices error:", err);
            }
        }
        getCameras();
    }, [tipo]);

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
                video: {
                    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: tipo === "traseira" ? "environment" : "user" }),
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (e) {
                    console.log("Auto-play blocked");
                }
            }
            setStreaming(true);
            setErro(null);
        } catch (err: any) {
            console.error("Camera error:", err);
            setErro(`Não foi possível abrir a câmera ${tipo}.`);
            setStreaming(false);
        }
    };

    const nextCamera = () => {
        if (camerasDoTipo.length < 2) return;
        const nextIdx = (cameraIndex + 1) % camerasDoTipo.length;
        setCameraIndex(nextIdx);
        iniciar(camerasDoTipo[nextIdx].deviceId);
    };

    const finish = (result: boolean) => {
        stopStream();
        onResult(result);
    };

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2 italic uppercase tracking-tighter">
                    Câmera {tipo === "traseira" ? "Traseira" : "Frontal"}
                </h3>
                <p className="text-white/60 text-sm">
                    {streaming
                        ? tipo === "traseira"
                            ? "Verifique as lentes traseiras. Use o botão abaixo para alternar entre os sensores (Macro, Wide, etc)."
                            : "Verifique se a imagem da câmera frontal está nítida."
                        : "Toque abaixo para abrir e testar."}
                </p>
                {streaming && camerasDoTipo.length > 1 && tipo === "traseira" && (
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-2">
                        Sensor {cameraIndex + 1} de {camerasDoTipo.length}
                    </p>
                )}
            </div>

            <div className="w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden border-4 border-white/10 relative shadow-2xl">
                {streaming ? (
                    <video
                        ref={videoRef}
                        className={`w-full h-full object-cover ${tipo === "frontal" ? "scale-x-[-1]" : ""}`}
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

            {/* Apenas mostrar botão de trocar câmera se houver mais de uma E for a traseira ou se realmente houver múltiplas frontais detectadas */}
            {streaming && camerasDoTipo.length > 1 && (
                <button
                    onClick={nextCamera}
                    className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <RefreshCcw size={16} />
                    Próximo Sensor ({cameraIndex + 1}/{camerasDoTipo.length})
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
