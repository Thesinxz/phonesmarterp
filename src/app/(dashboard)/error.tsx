"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[DashboardError]", error);
    }, [error]);

    return (
        <div className="ml-[260px] pt-16 min-h-screen flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-10 max-w-md w-full text-center space-y-6 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="text-red-500" size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
                    <p className="text-sm text-slate-500">
                        Ocorreu um erro inesperado nesta página. Você pode tentar novamente sem precisar recarregar.
                    </p>
                </div>
                {process.env.NODE_ENV === "development" && (
                    <pre className="text-xs text-left text-red-600 bg-red-50 rounded-xl p-4 overflow-auto max-h-32">
                        {error.message}
                    </pre>
                )}
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 bg-brand-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95"
                >
                    <RotateCcw size={18} />
                    Tentar Novamente
                </button>
            </div>
        </div>
    );
}
