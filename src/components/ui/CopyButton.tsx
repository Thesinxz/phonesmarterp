"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
    value: string;
    label?: string;
}

export function CopyButton({ value, label }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title={`Copiar ${label ?? value}`}
            className={`flex items-center justify-center p-1 rounded-md border border-slate-200 transition-all ${
                copied 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
        >
            {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
        </button>
    );
}
