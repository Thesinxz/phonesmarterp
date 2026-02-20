"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha`,
        });

        if (error) {
            setError("Erro ao enviar email. Verifique o endereço e tente novamente.");
            setLoading(false);
            return;
        }

        setSent(true);
        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-brand-glow mb-4">
                        <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
                    <p className="text-white/60 text-sm mt-1">
                        Enviaremos um link para redefinir sua senha
                    </p>
                </div>

                <div className="glass-dark rounded-3xl p-8">
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold">Email enviado!</p>
                            <p className="text-white/60 text-sm">
                                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar ao login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-white/70 text-sm font-medium">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-brand-glow"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Enviar link de recuperação"
                                )}
                            </button>

                            <Link
                                href="/login"
                                className="flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar ao login
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
