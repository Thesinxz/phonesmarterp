"use client";

import {
    Calculator,
    Zap,
    Scan,
    Globe,
    ArrowRight,
    TrendingUp,
    FileSpreadsheet,
    Smartphone
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";

const TOOLS = [
    {
        title: "Calculadora de Venda",
        desc: "Cálculo reverso de margem e precificação até 21x no cartão.",
        href: "/ferramentas/calculadora",
        icon: TrendingUp,
        color: "bg-blue-500",
        shadow: "shadow-blue-glow"
    },
    {
        title: "Cálculo em Massa",
        desc: "Processamento de listas e invoices via OCR com inteligência artificial.",
        href: "/ferramentas/calculo-em-massa",
        icon: FileSpreadsheet,
        color: "bg-emerald-500",
        shadow: "shadow-emerald-glow"
    },
    {
        title: "Importação iPhone USA",
        desc: "Planejamento de custos, câmbio e logística de produtos importados.",
        href: "/ferramentas/importacao",
        icon: Smartphone,
        color: "bg-purple-500",
        shadow: "shadow-purple-glow"
    }
];

export default function FerramentasHub() {
    return (
        <div className="space-y-8 page-enter pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Centro de Inteligência</h1>
                    <p className="text-slate-500 text-sm mt-1">Ferramentas avançadas para otimizar sua lucratividade e processos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TOOLS.map((tool) => (
                    <Link key={tool.href} href={tool.href} className="group">
                        <GlassCard className="h-full p-8 flex flex-col items-start gap-4 transition-all group-hover:scale-[1.02] group-hover:shadow-glass-lg cursor-pointer">
                            <div className={`w-14 h-14 rounded-2xl ${tool.color} ${tool.shadow} flex items-center justify-center text-white mb-2 transition-transform group-hover:rotate-3`}>
                                <tool.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{tool.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{tool.desc}</p>
                            </div>
                            <div className="mt-auto flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest pt-4">
                                Abrir ferramenta <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </div>
                        </GlassCard>
                    </Link>
                ))}
            </div>

            {/* Quick Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
                <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10">
                        <div className="bg-brand-500 w-10 h-10 rounded-xl flex items-center justify-center mb-6">
                            <Zap size={20} />
                        </div>
                        <h2 className="text-2xl font-black mb-4">Dica de Gestão: Margem Real</h2>
                        <p className="text-white/60 text-sm leading-relaxed mb-6 italic">
                            "Muitos lojistas calculam a margem sobre o custo (Markup), mas esquecem que as taxas de cartão e impostos incidem sobre o preço de venda final. Use a nossa Calculadora de Venda para garantir que sua margem seja líquida de verdade."
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
                                <p className="text-[10px] uppercase font-bold text-white/40">Markup Típico</p>
                                <p className="text-lg font-black text-white/90">1.4x a 2.1x</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/40 border border-white/60 backdrop-blur-md rounded-[32px] p-8 relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Cotação do Dia</h2>
                            <p className="text-slate-500 text-xs">Câmbio comercial atualizado</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Dólar (USD)</p>
                            <p className="text-2xl font-black text-slate-800">R$ 5,12</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Guarani (PYG)</p>
                            <p className="text-2xl font-black text-slate-800">R$ 0,00071</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
