"use client";

import Link from "next/link";
import { Zap, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function VerificarEmailPage() {
    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-brand-glow mb-4">
                        <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Conta criada!</h1>
                    <p className="text-white/60 text-sm mt-1">
                        Falta um passo para acessar o sistema
                    </p>
                </div>

                <div className="glass-dark rounded-3xl p-8">
                    <div className="text-center space-y-6">
                        {/* Success Icon */}
                        <div className="relative">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Mail className="w-10 h-10 text-emerald-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 left-0 right-0 mx-auto w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center border-4 border-[#0f172a]" style={{ left: "calc(50% + 16px)" }}>
                                <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-bold text-white">
                                Verifique seu email
                            </h2>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Enviamos um link de confirmação para o email cadastrado.
                                <br />
                                <strong className="text-white/80">Clique no link</strong> para ativar sua conta e acessar o sistema.
                            </p>
                        </div>

                        {/* Tips */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Dica</p>
                            <ul className="text-white/60 text-sm space-y-1.5">
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-400 mt-1">•</span>
                                    Verifique também a pasta de <strong className="text-white/80">spam</strong>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-400 mt-1">•</span>
                                    O link expira em <strong className="text-white/80">24 horas</strong>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand-400 mt-1">•</span>
                                    Após confirmar, faça login normalmente
                                </li>
                            </ul>
                        </div>

                        {/* Action */}
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Ir para o login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
