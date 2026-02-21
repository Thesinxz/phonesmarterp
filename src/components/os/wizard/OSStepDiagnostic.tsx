"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Smartphone, Move, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

interface OSStepDiagnosticProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStepDiagnostic({ data, onChange }: OSStepDiagnosticProps) {
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>("");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Touch Diagnostic State
    const [touchGrid, setTouchGrid] = useState<boolean[]>(new Array(100).fill(false));
    const [touchPercent, setTouchPercent] = useState(0);

    // Load Cameras
    useEffect(() => {
        async function getDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === "videoinput");
                setCameras(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error("Erro ao listar câmeras:", err);
            }
        }
        getDevices();
    }, []);

    // Switch Camera
    useEffect(() => {
        if (!selectedCamera) return;

        async function startCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedCamera } }
                });
                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
            } catch (err) {
                console.error("Erro ao abrir câmera:", err);
            }
        }

        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [selectedCamera]);

    const handleTouch = (index: number) => {
        if (touchGrid[index]) return;
        const next = [...touchGrid];
        next[index] = true;
        setTouchGrid(next);

        const filled = next.filter(v => v).length;
        setTouchPercent(Math.round((filled / 100) * 100));
    };

    const resetTouch = () => {
        setTouchGrid(new Array(100).fill(false));
        setTouchPercent(0);
    };

    // QR Code URL - Using public API to avoid local npm install issues
    const qrData = JSON.stringify({
        id: "DRAFT-OS",
        marca: data.marca,
        modelo: data.modelo,
        ts: Date.now()
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Teste de Câmeras */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Camera size={16} /> Verificação de Lentes e Foco
                    </label>
                    <GlassCard className="p-0 overflow-hidden bg-black aspect-video relative group">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Selector Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                            <select
                                value={selectedCamera}
                                onChange={(e) => setSelectedCamera(e.target.value)}
                                className="flex-1 h-10 px-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-white text-xs font-bold outline-none"
                            >
                                {cameras.map(cam => (
                                    <option key={cam.deviceId} value={cam.deviceId}>
                                        {cam.label || `Câmera ${cam.deviceId.slice(0, 4)}`}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setSelectedCamera(prev => cameras[(cameras.findIndex(c => c.deviceId === prev) + 1) % cameras.length]?.deviceId || prev)}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* QR Code Validation Overlay (Miniature) */}
                        <div className="absolute top-4 right-4 w-24 h-24 bg-white p-2 rounded-xl shadow-2xl transition-transform hover:scale-110">
                            <img src={qrUrl} alt="QR Validation" className="w-full h-full" />
                            <p className="text-[8px] font-black text-center mt-1 text-slate-400">TESTE FOCO</p>
                        </div>
                    </GlassCard>
                    <p className="text-xs text-slate-400 italic">Alterne entre as câmeras para testar o foco e se há manchas em alguma lente específica.</p>
                </div>

                {/* 2. Teste de Touch */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Smartphone size={16} /> Mapeamento de Touch
                        </label>
                        <button
                            onClick={resetTouch}
                            className="text-[10px] font-black text-indigo-500 uppercase hover:text-indigo-700"
                        >
                            Resetar
                        </button>
                    </div>

                    <div className="relative aspect-square max-w-[320px] mx-auto bg-slate-100 rounded-3xl border-4 border-slate-200 overflow-hidden flex flex-col items-center justify-center p-1">
                        <div className="grid grid-cols-10 grid-rows-10 gap-0.5 w-full h-full">
                            {touchGrid.map((filled, i) => (
                                <div
                                    key={i}
                                    onMouseMove={(e) => { if (e.buttons === 1) handleTouch(i) }}
                                    onTouchMove={() => handleTouch(i)}
                                    className={cn(
                                        "w-full h-full transition-colors duration-300",
                                        filled ? "bg-indigo-500" : "bg-white/80 hover:bg-slate-50"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Progress Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-xl flex flex-col items-center gap-1 border border-indigo-100">
                                <p className="text-3xl font-black text-indigo-600 tabular-nums">{touchPercent}%</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Touch OK</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* validation Message */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="bg-indigo-600 border-none text-white p-6">
                    <Layers className="mb-4 opacity-50" size={32} />
                    <h3 className="font-bold text-lg mb-2">QR Code de Teste</h3>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                        Aponte a câmera do dispositivo para o código acima. Se o foco não conseguir lê-lo, registre como "Câmera com defeito".
                    </p>
                </GlassCard>

                <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 flex items-center justify-center text-center">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Finalizar Diagnóstico de Hardware</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Garanta que você testou todas as câmeras e que cobriu a maior parte da tela no teste de touch antes de prosseguir.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
