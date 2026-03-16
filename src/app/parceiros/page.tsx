"use client";

import React from "react";
import Link from "next/link";
import { Zap, Handshake, TrendingUp, Users, ArrowLeft, Globe, QrCode } from "lucide-react";

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-slate-900 selection:bg-brand-500 selection:text-white text-white">
            <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">Smart <span className="text-brand-500">OS</span></span>
                </Link>
                <Link href="/" className="text-sm font-bold text-slate-400 hover:text-brand-500 flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Voltar para Home
                </Link>
            </nav>

            <header className="py-32 px-6 text-center max-w-5xl mx-auto space-y-12">
                <div className="w-24 h-24 rounded-[32px] bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-8 border border-brand-500/20 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
                    <Handshake size={48} />
                </div>
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-none italic uppercase">Cresça <span className="text-brand-500">Conosco.</span></h1>
                <p className="text-2xl text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto">Programa de Parceiros Smart OS. Ideal para contadores, revendedores e consultores de tecnologia que buscam gerar valor para seus clientes.</p>
            </header>

            <main className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="bg-white/5 p-12 rounded-[48px] border border-white/10 space-y-6 hover:bg-white/10 transition-colors group">
                        <TrendingUp size={40} className="text-brand-500" />
                        <h3 className="text-2xl font-black">Comissões Recorrentes</h3>
                        <p className="text-slate-400 font-medium leading-relaxed">Receba comissão sobre todas as mensalidades das empresas indicadas por você, sem limite de tempo.</p>
                    </div>
                    <div className="bg-white/5 p-12 rounded-[48px] border border-white/10 space-y-6 hover:bg-white/10 transition-colors">
                        <Users size={40} className="text-emerald-500" />
                        <h3 className="text-2xl font-black">Dashboard Parceiro</h3>
                        <p className="text-slate-400 font-medium leading-relaxed">Tenha acesso a um portal exclusivo para gerenciar suas indicações, ganhos e materiais de apoio.</p>
                    </div>
                    <div className="bg-white/5 p-12 rounded-[48px] border border-white/10 space-y-6 hover:bg-white/10 transition-colors">
                        <QrCode size={40} className="text-brand-500" />
                        <h3 className="text-2xl font-black">Materiais Mkt</h3>
                        <p className="text-slate-400 font-medium leading-relaxed">Acesso total a apresentações, folders e artes para redes sociais prontas para uso.</p>
                    </div>
                </div>

                <div className="mt-32 p-1 px-1 rounded-[64px] bg-gradient-to-r from-brand-600 to-indigo-600">
                    <div className="bg-slate-900 rounded-[63px] p-12 lg:p-24 text-center space-y-12">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight italic">Seja um embaixador do Smart OS.</h2>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link href="/contato" className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all text-lg shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]">
                                Inscrição Rápida
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-12 px-6 text-center border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <p>© 2026 Smart OS. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-3 text-slate-400">
                        <Globe size={14} />
                        Orgulhosamente Brasileiro
                    </div>
                </div>
            </footer>
        </div>
    );
}
