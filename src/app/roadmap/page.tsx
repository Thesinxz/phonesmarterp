"use client";

import React from "react";
import Link from "next/link";
import { Zap, Clock, CheckCircle2, Circle, ArrowLeft, Globe } from "lucide-react";

const roadmapData = [
    {
        quarter: "Q1 2026",
        status: "completed",
        title: "Lançamento Smart OS 2.0",
        items: ["Gestão de IMEIs", "Fiscal (NFe/NFCe)", "Novo PDV Rápido"]
    },
    {
        quarter: "Q2 2026",
        status: "current",
        title: "Ecossistema & Mobile",
        items: ["App Nativo iOS/Android", "Integração via Webhooks", "Hub de Marketplaces"]
    },
    {
        quarter: "Q3 2026",
        status: "planned",
        title: "IA & Automação",
        items: ["Diagnóstico por IA", "Previsão de Estoque", "Suporte GPT Integrado"]
    },
    {
        quarter: "Q4 2026",
        status: "planned",
        title: "Expansão Global",
        items: ["Multi-moedas", "Dashboards Customizados", "Nova API Pública"]
    }
];

export default function RoadmapPage() {
    return (
        <div className="min-h-screen bg-white selection:bg-brand-500 selection:text-white">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-black text-slate-800 tracking-tight">Smart <span className="text-brand-500">OS</span></span>
                </Link>
                <Link href="/" className="text-sm font-bold text-slate-500 hover:text-brand-500 flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Voltar para Home
                </Link>
            </nav>

            <header className="py-24 px-6 text-center max-w-4xl mx-auto space-y-6">
                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter italic uppercase">Roadmap <span className="text-brand-500">2026</span></h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">Acompanhe nossa evolução. Estamos construindo o futuro das assistências técnicas com tecnologia de ponta.</p>
            </header>

            <main className="max-w-4xl mx-auto px-6 pb-32">
                <div className="space-y-12 relative">
                    <div className="absolute left-[27px] top-4 bottom-4 w-1 bg-slate-100 hidden md:block" />
                    
                    {roadmapData.map((phase, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-8 relative">
                            <div className="hidden md:flex shrink-0 w-14 h-14 bg-white border-4 border-slate-50 rounded-full items-center justify-center z-10">
                                {phase.status === 'completed' ? (
                                    <CheckCircle2 className="text-emerald-500" size={28} />
                                ) : phase.status === 'current' ? (
                                    <Clock className="text-brand-500 animate-spin-slow" size={28} />
                                ) : (
                                    <Circle className="text-slate-300" size={28} />
                                )}
                            </div>
                            
                            <div className={`p-10 rounded-[40px] border flex-1 transition-all duration-500 ${
                                phase.status === 'current' 
                                    ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow scale-105' 
                                    : 'bg-slate-50 border-slate-100 text-slate-900'
                            }`}>
                                <div className="flex items-center justify-between mb-6">
                                    <span className={`text-xs font-black uppercase tracking-[0.3em] ${phase.status === 'current' ? 'text-white/60' : 'text-slate-400'}`}>
                                        {phase.quarter}
                                    </span>
                                    {phase.status === 'current' && (
                                        <div className="bg-white/20 text-[10px] font-black py-1 px-3 rounded-full uppercase tracking-widest">
                                            Em Desenvolvimento
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-3xl font-black mb-6">{phase.title}</h3>
                                <ul className="space-y-3">
                                    {phase.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-3 font-bold">
                                            <div className={`w-2 h-2 rounded-full ${phase.status === 'current' ? 'bg-white' : 'bg-brand-500'}`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="bg-white py-12 px-6 text-center border-t border-slate-100 mt-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    <p>© 2026 Smart OS. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-3">
                        <Globe size={14} />
                        Orgulhosamente Brasileiro
                    </div>
                </div>
            </footer>
        </div>
    );
}
