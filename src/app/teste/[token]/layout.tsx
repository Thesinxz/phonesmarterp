import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Teste de Diagnóstico - SmartOS",
};

export default function TesteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {children}
        </div>
    );
}
