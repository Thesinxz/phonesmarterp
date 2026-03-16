"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/utils/cn";

interface PatternLockProps {
    value: string; // Sequence like "1-2-3"
    onChange?: (value: string) => void;
    className?: string;
    readOnly?: boolean;
}

export function PatternLock({ value, onChange, className, readOnly = false }: PatternLockProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [path, setPath] = useState<number[]>([]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Node centers for drawing lines
    const nodes = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9], []);

    useEffect(() => {
        if (value) {
            const initialPath = value.split("-").map(Number).filter(n => !isNaN(n));
            setPath(initialPath);
        } else {
            setPath([]);
        }
    }, [value]);

    const getNodePosition = (node: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const size = rect.width;
        const cellSize = size / 3;

        const row = Math.floor((node - 1) / 3);
        const col = (node - 1) % 3;

        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2
        };
    };

    const handleStart = (node: number) => {
        if (readOnly) return;
        setIsDrawing(true);
        setPath([node]);
        onChange?.(node.toString());
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly || !isDrawing || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        let clientX, clientY;

        if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;
        setMousePos({ x, y });

        // Check if cursor is over a new node
        const size = rect.width;
        const cellSize = size / 3;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);

        if (col >= 0 && col < 3 && row >= 0 && row < 3) {
            const node = row * 3 + col + 1;
            if (!path.includes(node)) {
                const newPath = [...path, node];
                setPath(newPath);
                onChange?.(newPath.join("-"));
            }
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    return (
        <div
            className={cn("relative w-[180px] h-[180px] mx-auto touch-none select-none p-4 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner", className)}
            onMouseMove={handleMove}
            onTouchMove={handleMove}
            onMouseLeave={handleEnd}
            onMouseUp={handleEnd}
            onTouchEnd={handleEnd}
            ref={containerRef}
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Fixed Lines */}
                {path.length > 1 && path.map((node, i) => {
                    if (i === 0) return null;
                    const start = getNodePosition(path[i - 1]);
                    const end = getNodePosition(node);
                    return (
                        <line
                            key={`line-${i}`}
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            stroke="#6366f1"
                            strokeWidth="6"
                            strokeLinecap="round"
                            filter="url(#glow)"
                            className="opacity-80"
                        />
                    );
                })}

                {/* Loose Line */}
                {isDrawing && path.length > 0 && (
                    <line
                        x1={getNodePosition(path[path.length - 1]).x}
                        y1={getNodePosition(path[path.length - 1]).y}
                        x2={mousePos.x}
                        y2={mousePos.y}
                        stroke="#818cf8"
                        strokeWidth="4"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        className="opacity-60"
                    />
                )}
            </svg>

            <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
                {nodes.map(node => {
                    const active = path.includes(node);
                    const last = path[path.length - 1] === node;

                    return (
                        <div
                            key={node}
                            className="flex items-center justify-center"
                            onMouseDown={() => handleStart(node)}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                handleStart(node);
                            }}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-full transition-all duration-300 relative",
                                active ? "bg-indigo-600 scale-125 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-slate-300 scale-100",
                                last && isDrawing && "animate-pulse"
                            )}>
                                {active && (
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-20" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={() => {
                        setPath([]);
                        onChange?.("");
                    }}
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-indigo-500 transition-colors"
                >
                    Limpar Desenho
                </button>
            )}
        </div>
    );
}
