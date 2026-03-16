"use client";

import React from "react";
import Link from "next/link";
import { Zap, Shield, Lock, Cloud, Database, ArrowLeft, Globe } from "lucide-react";

const securityFeatures = [
    {
        icon: Shield,
        title: "Criptografia de Ponta a Ponta",
        desc: "Todos os seus dados de clientes, financeiro e OS são criptografados em repouso e em trânsito."
    },
    {
        icon: Cloud,
        title: "Backup Automático",
        desc: "Realizamos backups diários de toda a sua base de dados, garantindo que você nunca perca uma OS."
    },
    {
        icon: Lock,
        title: "Controle de Acessos (RBAC)",
        desc: "Defina exatamente o que cada técnico ou gerente pode ver ou editar no sistema."
    },
    {
        icon: Database,
        title: "Infraestrutura Google Cloud",
        desc: "Hospedado nos servidores mais seguros do mundo, com 99.9% de uptime garantido."
    }
];

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-slate-50 selection:bg-brand-500 selection:text-white">
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

            <header className="py-24 px-6 text-center max-w-4xl mx-auto space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <Shield size={48} />
                </div>
                <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter">Sua Segurança é nossa <br /><span className="text-brand-500">Prioridade #1.</span></h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">Implementamos protocolos de nível bancário para garantir a integridade e privacidade dos dados da sua assistência.</p>
            </header>

            <main className="max-w-6xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {securityFeatures.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div key={i} className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                                <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-8 group-hover:bg-brand-500 group-hover:text-white transition-all">
                                    <Icon size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4">{f.title}</h3>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-24 bg-slate-900 rounded-[48px] p-12 lg:p-20 text-center text-white space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 blur-[100px] rounded-full" />
                    <h2 className="text-4xl font-black italic">LGPD Compliance</h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">O Smart OS está totalmente adequado à Lei Geral de Proteção de Dados, garantindo o direito de privacidade dos seus clientes e da sua empresa.</p>
                </div>
            </main>

            <footer className="bg-slate-50 py-12 px-6 text-center border-t border-slate-200">
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
