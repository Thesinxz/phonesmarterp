"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check } from "lucide-react";
import { cn } from "@/utils/cn";

interface AssinaturaPadProps {
    value: string | null;
    onChange: (base64: string | null) => void;
    readOnly?: boolean;
    label?: string;
}

export function AssinaturaPad({ value, onChange, readOnly = false, label = "Assinatura do Cliente" }: AssinaturaPadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(!!value);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Setup canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#1e293b";

        // Load existing value
        if (value) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
            };
            img.src = value;
        }
    }, []);

    const getCoord = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: (e as React.MouseEvent).clientX - rect.left,
            y: (e as React.MouseEvent).clientY - rect.top
        };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;
        e.preventDefault();
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCoord(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || readOnly) return;
        e.preventDefault();
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const { x, y } = getCoord(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasContent(true);
    };

    const endDraw = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const base64 = canvas.toDataURL("image/png");
            onChange(base64);
        }
    }, [isDrawing, onChange]);

    const limpar = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        setHasContent(false);
        onChange(null);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                {!readOnly && hasContent && (
                    <button
                        type="button"
                        onClick={limpar}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
                    >
                        <Eraser size={12} /> Limpar
                    </button>
                )}
            </div>
            <div className={cn(
                "relative border-2 border-dashed rounded-xl overflow-hidden bg-white transition-colors",
                isDrawing ? "border-indigo-400" : "border-slate-200",
                readOnly && "opacity-80"
            )}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-32 cursor-crosshair touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
                {!hasContent && !readOnly && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-300 text-sm italic">Assine aqui com o dedo ou o mouse</p>
                    </div>
                )}
                {hasContent && !readOnly && (
                    <div className="absolute bottom-2 right-2">
                        <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                            <Check size={14} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
