"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface PasswordRevealProps {
    value: string;
}

export function PasswordReveal({ value }: PasswordRevealProps) {
    const [visible, setVisible] = useState(false);

    if (!value) return <span className="text-slate-400 font-medium italic">Não informada</span>;

    return (
        <div className="flex items-center gap-3 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50 w-fit">
            <span className="font-mono text-sm font-bold text-indigo-700 tracking-wider">
                {visible ? value : "••••••••"}
            </span>
            <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="p-1 hover:bg-white rounded-md transition-all text-indigo-400 hover:text-indigo-600"
                title={visible ? "Ocultar" : "Revelar"}
            >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    );
}
