"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        nomeEmpresa: "",
        nome: "",
        email: "",
        senha: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleCadastro(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.senha,
                options: {
                    data: { nome: form.nome, nome_empresa: form.nomeEmpresa },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (authError) {
                // Tratar erros comuns em português
                if (authError.message.includes("already registered")) {
                    setError("Este email já está cadastrado. Faça login ou recupere sua senha.");
                } else if (authError.message.includes("password")) {
                    setError("A senha deve ter pelo menos 6 caracteres.");
                } else {
                    setError(authError.message);
                }
                setLoading(false);
                return;
            }

            if (!authData.user) {
                setError("Erro ao criar conta. Tente novamente.");
                setLoading(false);
                return;
            }

            // 2. Verificar se o Supabase exige confirmação de email
            // Se authData.session é null, confirmação é obrigatória
            const needsEmailConfirmation = !authData.session;

            if (needsEmailConfirmation) {
                // Não tenta criar empresa/usuário agora — será feito após confirmar
                // Salvar dados no localStorage para provisionar após confirmação
                try {
                    localStorage.setItem("smartos_pending_signup", JSON.stringify({
                        nome: form.nome,
                        nomeEmpresa: form.nomeEmpresa,
                        email: form.email,
                        authUserId: authData.user.id,
                    }));
                } catch { /* ignore */ }

                router.push("/verificar-email");
                return;
            }

            // 3. Sessão criada imediatamente (confirmação desabilitada no Supabase)
            // Criar empresa e usuário público
            const subdominio = form.nomeEmpresa
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: empresaData, error: empresaError } = await (supabase.from("empresas") as any).insert({
                nome: form.nomeEmpresa,
                subdominio,
                plano: "starter",
            }).select().single();

            if (empresaError || !empresaData) {
                setError("Conta criada, mas houve um erro ao configurar a empresa. Entre em contato com o suporte.");
                setLoading(false);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: usuarioError } = await (supabase.from("usuarios") as any).insert({
                empresa_id: empresaData.id,
                auth_user_id: authData.user.id,
                nome: form.nome,
                email: form.email,
                papel: "admin",
                permissoes_json: {},
                ativo: true,
            });

            if (usuarioError) {
                console.error("Erro ao criar usuário público:", usuarioError);
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            console.error("Cadastro network error:", err);
            setError("Falha na conexão. Verifique se o Supabase está configurado corretamente no .env.local.");
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-brand-glow mb-4">
                        <Zap className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Criar conta gratuita</h1>
                    <p className="text-white/60 text-sm mt-1">14 dias de teste grátis, sem cartão</p>
                </div>

                <div className="glass-dark rounded-3xl p-8">
                    <form onSubmit={handleCadastro} className="space-y-4">
                        {/* Nome da empresa */}
                        <div className="space-y-1.5">
                            <label className="text-white/70 text-sm font-medium">Nome da empresa</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    name="nomeEmpresa"
                                    value={form.nomeEmpresa}
                                    onChange={handleChange}
                                    placeholder="Minha Assistência Técnica"
                                    required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Nome */}
                        <div className="space-y-1.5">
                            <label className="text-white/70 text-sm font-medium">Seu nome</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    name="nome"
                                    value={form.nome}
                                    onChange={handleChange}
                                    placeholder="João Silva"
                                    required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-white/70 text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div className="space-y-1.5">
                            <label className="text-white/70 text-sm font-medium">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    name="senha"
                                    type="password"
                                    value={form.senha}
                                    onChange={handleChange}
                                    placeholder="Mínimo 8 caracteres"
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
                            disabled={loading}
                            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-brand-glow"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Criar conta grátis
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-white/50 text-sm mt-6">
                        Já tem conta?{" "}
                        <Link href="/login" className="text-brand-300 hover:text-white font-medium transition-colors">
                            Fazer login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
