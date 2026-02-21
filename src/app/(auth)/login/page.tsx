"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detectar erros do callback
    useEffect(() => {
        const callbackError = searchParams.get("error");
        if (callbackError === "auth_callback_error") {
            setError("Erro ao processar link de autenticação. Tente novamente.");
        }
    }, [searchParams]);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                // Traduzir erros comuns do Supabase para português
                if (authError.message.includes("Email not confirmed")) {
                    setError("Seu email ainda não foi confirmado. Verifique sua caixa de entrada (e spam).");
                } else if (authError.message.includes("Invalid login")) {
                    setError("Email ou senha inválidos. Tente novamente.");
                } else {
                    setError("Email ou senha inválidos. Tente novamente.");
                }
                setLoading(false);
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            console.error("Login network error:", err);
            setError("Falha na conexão. Verifique se o Supabase está configurado corretamente.");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
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
                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition-all"
                    />
                </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
                <label className="text-white/70 text-sm font-medium">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
                <Link
                    href="/recuperar-senha"
                    className="text-brand-300 hover:text-white text-xs transition-colors"
                >
                    Esqueci minha senha
                </Link>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-brand-glow"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        Entrar
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-brand-glow mb-4">
                        <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Phone Smart ERP</h1>
                    <p className="text-white/60 text-sm mt-1">Faça login na sua conta</p>
                </div>

                {/* Card */}
                <div className="glass-dark rounded-3xl p-8">
                    <Suspense fallback={<div className="text-white/50 text-center py-4">Carregando...</div>}>
                        <LoginForm />
                    </Suspense>

                    {/* Register link */}
                    <p className="text-center text-white/50 text-sm mt-6">
                        Não tem conta?{" "}
                        <Link href="/cadastro" className="text-brand-300 hover:text-white font-medium transition-colors">
                            Criar conta gratuita
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
