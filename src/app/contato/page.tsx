"use client";

import React from "react";
import Link from "next/link";
import { Zap, Mail, Phone, MapPin, ArrowLeft, Globe, Send, MessageCircle } from "lucide-react";

export default function ContactPage() {
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

            <header className="py-24 px-6 text-center max-w-4xl mx-auto space-y-6">
                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter">Vamos Conversar?</h1>
                <p className="text-xl text-slate-500 font-medium">Nossa equipe de especialistas está pronta para tirar suas dúvidas e ajudar sua assistência a crescer.</p>
            </header>

            <main className="max-w-6xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                                    <MessageCircle size={24} />
                                </div>
                                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Suporte WhatsApp</h3>
                                <p className="text-lg font-bold text-slate-600 block">(11) 99999-9999</p>
                            </div>
                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                                    <Mail size={24} />
                                </div>
                                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">E-mail Comercial</h3>
                                <p className="text-lg font-bold text-slate-600 block">contato@smartos.com.br</p>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-10 rounded-[40px] text-white space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[60px] rounded-full" />
                            <h3 className="text-2xl font-black">Horário de Atendimento</h3>
                            <ul className="space-y-3 text-slate-400 font-bold">
                                <li className="flex justify-between"><span>Segunda - Sexta</span> <span>09:00 - 18:00</span></li>
                                <li className="flex justify-between"><span>Sábado</span> <span>09:00 - 13:00</span></li>
                            </ul>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white p-12 rounded-[48px] border border-slate-200 shadow-xl">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Seu Nome</label>
                                <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="Ex: João Silva" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Seu E-mail</label>
                                <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="joao@empresa.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem</label>
                                <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all min-h-[150px]" placeholder="Como podemos te ajudar?" />
                            </div>
                            <button className="w-full bg-brand-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-brand-glow flex items-center justify-center gap-3">
                                <Send size={20} />
                                Enviar Mensagem
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="bg-white py-12 px-6 text-center border-t border-slate-200 mt-20">
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
