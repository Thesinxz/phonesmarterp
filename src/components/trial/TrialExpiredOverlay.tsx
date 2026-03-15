"use client";

import { useAuth } from "@/context/AuthContext";
import { Zap, AlertTriangle, LogOut, CheckCircle2, CreditCard } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useState } from "react";
import { toast } from "sonner";

export function TrialExpiredOverlay() {
    const { empresa, user, signOut } = useAuth();
    const [loadingCheckout, setLoadingCheckout] = useState(false);

    if (!empresa) return null;

    async function handleStripeCheckout() {
        if (!empresa || !user) return;
        setLoadingCheckout(true);

        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresaId: empresa.id,
                    email: user.email,
                    subdominio: empresa.subdominio
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Erro ao criar sessão de pagamento.");
            }
        } catch (err: any) {
            console.error("Erro no checkout:", err);
            toast.error(err.message || "Erro ao processar pagamento. Chame o suporte.");
            // Fallback para whatsapp em caso de erro na API/lib
            window.location.href = `https://wa.me/5567993024221?text=Erro+no+Stripe+Checkout.+Quero+assinar+o+Phone+Smart+ERP+para+a+loja+${empresa.nome}`;
        } finally {
            setLoadingCheckout(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full animate-in zoom-in-95 fade-in duration-300">
                <GlassCard className="border-brand-500/30 overflow-hidden">
                    <div className="relative p-8 text-center">
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-500 shadow-lg shadow-brand-500/20 mb-6 relative">
                            <AlertTriangle className="w-10 h-10 text-white animate-pulse" />
                        </div>

                        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-2">
                            Seu teste grátis <span className="text-brand-600">venceu!</span>
                        </h2>

                        <p className="text-slate-500 font-medium mb-8">
                            Agradecemos por testar o <span className="font-bold text-slate-700">Phone Smart ERP</span>.
                            Seus 14 dias terminaram, mas seus dados estão seguros! Assine agora para continuar crescendo.
                        </p>

                        <div className="space-y-3 mb-8 text-left max-w-[280px] mx-auto">
                            <div className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <span className="text-sm font-semibold">IA e WhatsApp integrados</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <span className="text-sm font-semibold">Controle total de estoque e OS</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <span className="text-sm font-semibold">Faturamento e NFe-C ilimitados</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={handleStripeCheckout}
                                disabled={loadingCheckout}
                                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                            >
                                {loadingCheckout ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        PAGAR E ATIVAR AGORA
                                        <CreditCard className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => window.location.href = `https://wa.me/5567993024221?text=Assinar+com+Pix+Manual.+Quero+assinar+o+Phone+Smart+ERP+para+a+loja+${empresa.nome}`}
                                className="w-full border-2 border-slate-200 hover:border-brand-200 hover:text-brand-600 text-slate-500 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                            >
                                Falha no Cartão? Pagar via WhatsApp
                            </button>

                            <button
                                onClick={signOut}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all mt-2"
                            >
                                <LogOut size={18} />
                                Sair do Sistema
                            </button>
                        </div>

                        <p className="mt-6 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                            Fale com nosso suporte para ativar sua conta
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
