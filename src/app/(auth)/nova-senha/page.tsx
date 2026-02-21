"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Lock, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NovaSenhaPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionReady, setSessionReady] = useState(false);

    // Verificar se o usuário tem uma sessão válida (veio do link de reset)
    useEffect(() => {
        const supabase = createClient();

        // Verificar sessão atual (pode já estar ativa se veio do /auth/callback)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            }
        });

        // Escutar evento PASSWORD_RECOVERY — disparado automaticamente pelo Supabase
        // quando o link de recuperação é acessado (mesmo via hash token)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                setSessionReady(true);
                setError(null);
            }
        });

        // Timeout: se após 3 segundos ainda não há sessão, mostrar erro
        const timer = setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session) {
                    setError("Link de redefinição inválido ou expirado. Solicite um novo link.");
                }
            });
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }

        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres.");
            return;
        }

        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
            password,
        });

        if (updateError) {
            setError("Erro ao atualizar senha: " + updateError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);

        // Redirecionar para dashboard após 3 segundos
        setTimeout(() => {
            router.push("/dashboard");
        }, 3000);
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
                    <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
                    <p className="text-white/60 text-sm mt-1">
                        Escolha uma nova senha segura
                    </p>
                </div>

                <div className="glass-dark rounded-3xl p-8">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-white font-semibold">Senha atualizada!</p>
                            <p className="text-white/60 text-sm">
                                Sua senha foi alterada com sucesso. Redirecionando...
                            </p>
                        </div>
                    ) : !sessionReady && error ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                            <p className="text-white font-semibold">Link expirado</p>
                            <p className="text-white/60 text-sm">{error}</p>
                            <Link
                                href="/recuperar-senha"
                                className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm transition-colors"
                            >
                                Solicitar novo link
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-white/70 text-sm font-medium">Nova senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 8 caracteres"
                                        required
                                        minLength={8}
                                        className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-white/70 text-sm font-medium">Confirmar nova senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a senha"
                                        required
                                        minLength={8}
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
                                disabled={loading || !sessionReady}
                                className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-brand-glow"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Redefinir senha"
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
