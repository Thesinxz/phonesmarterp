"use client";

import React from "react";
import Link from "next/link";
import { Zap, Star, Layout, Quote, ArrowLeft, Globe, ArrowRight } from "lucide-react";

const testimonials = [
    {
        name: "Carlos Eduardo",
        store: "Cadu iPhones",
        text: "O Smart OS mudou completamente a organização da minha loja. Hoje não perco mais tempo procurando OS em papel.",
        rating: 5
    },
    {
        name: "Roberta Silva",
        store: "CellTech Assistência",
        text: "O sistema de notas fiscais automático é o diferencial. Consigo emitir tudo em segundos pelo PDV.",
        rating: 5
    },
    {
        name: "Marcos Oliveira",
        store: "Global Reparos",
        text: "A gestão de IMEIs trouxe uma segurança que eu não tinha antes. Sei exatamente a procedência de cada aparelho.",
        rating: 5
    }
];

export default function ClientsPage() {
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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 text-yellow-600 text-[10px] font-black uppercase tracking-widest border border-yellow-100 mb-4 text-center">
                    <Star size={12} className="fill-current" />
                    +500 Assistências em todo o Brasil
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter">Ouvimos quem entende do <span className="text-brand-500">Negócio.</span></h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">Assistências de todos os tamanhos confiam no Smart OS para gerir suas operações diárias.</p>
            </header>

            <main className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <div key={i} className="bg-slate-50 p-12 rounded-[48px] border border-slate-100 relative group hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <Quote className="absolute top-8 right-10 text-brand-500/10 group-hover:text-brand-500/20 transition-colors" size={64} />
                            <div className="flex gap-1 mb-8">
                                {Array.from({ length: t.rating }).map((_, j) => (
                                    <Star key={j} size={16} className="fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <p className="text-lg text-slate-700 font-bold leading-relaxed mb-8 italic">"{t.text}"</p>
                            <div>
                                <h4 className="font-black text-slate-900 text-xl">{t.name}</h4>
                                <p className="text-brand-500 font-bold text-sm">{t.store}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-32 rounded-[64px] bg-gradient-to-br from-slate-900 to-brand-900 p-12 lg:p-24 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black italic">Sua assistência é a próxima.</h2>
                        <p className="text-xl text-white/70 max-w-2xl mx-auto font-medium">Digitalize sua operação hoje e veja a diferença no fechamento do mês.</p>
                        <Link href="/login" className="inline-flex bg-white text-slate-900 text-lg px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl items-center gap-3">
                            Começar 14 Dias Grátis
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="bg-white py-12 px-6 text-center border-t border-slate-100">
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
