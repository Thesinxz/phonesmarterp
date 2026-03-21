"use client";

import { ImageIcon, Upload, X, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { useState } from "react";
import { cn } from "@/utils/cn";

interface ProductMediaSectionProps {
    imageUrl: string;
    onUpload: (file: File) => Promise<string>;
    onChange: (url: string) => void;
    disabled?: boolean;
}

export function ProductMediaSection({
    imageUrl,
    onUpload,
    onChange,
    disabled
}: ProductMediaSectionProps) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await onUpload(file);
            onChange(url);
        } catch (error) {
            console.error("Erro no upload:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <GlassCard title="Foto do Produto" icon={ImageIcon}>
            <div className="space-y-4">
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-200 group transition-all hover:border-brand-300">
                    {imageUrl ? (
                        <>
                            <img
                                src={imageUrl}
                                alt="Produto"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label className="p-3 bg-white rounded-2xl text-slate-700 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                                    <Upload size={20} />
                                    <input type="checkbox" className="hidden" /> {/* dummy for peer */}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={disabled || uploading}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => onChange("")}
                                    className="p-3 bg-white rounded-2xl text-red-500 hover:scale-110 active:scale-95 transition-all shadow-xl"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6 text-center">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-brand-500 group-hover:scale-110 transition-all border border-slate-100">
                                {uploading ? <RefreshCw size={24} className="animate-spin" /> : <Upload size={24} />}
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-brand-600 transition-colors">
                                {uploading ? "Enviando..." : "Clique para enviar foto"}
                            </span>
                            <span className="text-[10px] text-slate-300 mt-2">PNG, JPG ou WEBP (Max. 5MB)</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={disabled || uploading}
                            />
                        </label>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
