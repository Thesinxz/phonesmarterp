"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OSWizard } from "@/components/os/wizard/OSWizard";

export default function NovaOSPage() {
    return (
        <div className="space-y-8 page-enter min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-4 px-4">
                <Link href="/os" className="p-2 hover:bg-white/50 rounded-xl transition-all hover:scale-110 active:scale-90 border border-transparent hover:border-slate-100">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Nova Ordem de Serviço</h1>
                    <p className="text-slate-400 text-sm font-medium">Wizard Inteligente de Abertura de OS</p>
                </div>
            </div>

            {/* Wizard Component */}
            <OSWizard />
        </div>
    );
}
