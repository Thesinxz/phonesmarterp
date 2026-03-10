"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-10 max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="text-red-500" size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Erro inesperado</h2>
                    <p className="text-sm text-slate-500">
                        Ocorreu um problema ao carregar esta página.
                    </p>
                </div>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <RotateCcw size={18} />
                    Tentar Novamente
                </button>
            </div>
        </div>
    );
}
