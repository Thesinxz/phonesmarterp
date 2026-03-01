"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface PermissionGuardProps {
    modulo: "vendas" | "financeiro" | "estoque" | "ordens_servico" | "configuracoes" | "equipe";
    action?: "view" | "create" | "edit" | "delete";
    children: ReactNode;
    fallback?: "error" | "redirect" | "none";
    redirectTo?: string;
}

export function PermissionGuard({
    modulo,
    action = "view",
    children,
    fallback = "error",
    redirectTo = "/dashboard"
}: PermissionGuardProps) {
    const { can } = usePermissions();
    const router = useRouter();
    const hasPermission = can(modulo, action);

    useEffect(() => {
        if (!hasPermission && fallback === "redirect") {
            router.push(redirectTo);
        }
    }, [hasPermission, fallback, router, redirectTo]);

    if (hasPermission) {
        return <>{children}</>;
    }

    if (fallback === "redirect") {
        return null; // Será redirecionado pelo useEffect
    }

    if (fallback === "none") {
        return null;
    }

    // Default fallback: Error Message
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-sm border border-red-100/50">
                <ShieldAlert size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
                Você não tem permissão para acessar o módulo de <span className="font-bold text-slate-700">{modulo.replace('_', ' ')}</span>.
                Entre em contato com o administrador da empresa.
            </p>
            <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20"
            >
                <ArrowLeft size={16} />
                Voltar ao Dashboard
            </button>
        </div>
    );
}
