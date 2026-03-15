"use client";

import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { 
    CheckCircle2, 
    MessageCircle, 
    AtSign, 
    Smartphone, 
    ArrowLeft,
    Loader2,
    ShieldCheck,
    Lock
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PLAN_NAMES, PLAN_FEATURES, Plan } from "@/lib/plans/features";
import { useState } from "react";
import { registrarInteresse } from "@/app/actions/plans";
import { toast } from "sonner";

const PLAN_PRICES = {
    starter: 2490,
    essencial: 4990,
    pro: 9990,
    enterprise: 24900
};

export default function CheckoutPage() {
    const { plano } = useParams();
    const router = useRouter();
    const { user, empresa } = useAuth();
    const [loading, setLoading] = useState(false);
    const [telefone, setTelefone] = useState("");
    const [success, setSuccess] = useState(false);

    const planId = plano as Plan;
    const planName = PLAN_NAMES[planId] || "Plano";
    const planPrice = PLAN_PRICES[planId] || 0;

    const handleInteresse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setLoading(true);
        try {
            await registrarInteresse({
                userId: user.id,
                empresaId: empresa?.id,
                empresaNome: empresa?.nome,
                planoDesejado: planId,
                telefone
            });
            setSuccess(true);
            toast.success("Interesse registrado! Entraremos em contato em breve.");
        } catch (error) {
            toast.error("Ocorreu um erro ao registrar seu interesse.");
        } finally {
            setLoading(false);
        }
    };

    const whatsappUrl = `https://wa.me/5567991444131?text=${encodeURIComponent(
        `Olá! Estou usando o SmartOS ERP e quero assinar o plano ${planName.toUpperCase()}. Meu e-mail é ${user?.email}.`
    )}`;

    if (success) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
                <GlassCard className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Solicitação Enviada!</h2>
                        <p className="text-slate-500 mt-2">
                            Recebemos seu interesse no plano <strong>{planName}</strong>. 
                            Nossa equipe entrará em contato via WhatsApp no número {telefone} o mais rápido possível.
                        </p>
                    </div>
                    <Link href="/dashboard" className="btn-primary w-full block">
                        Voltar ao Dashboard
                    </Link>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header com botão voltar */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <ArrowLeft size={20} className="text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Finalizar Assinatura</h1>
                    <p className="text-slate-500 text-sm">Você está a um passo de turbinar sua loja</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna da Esquerda: Resumo do Plano */}
                <div className="space-y-6">
                    <GlassCard className="p-6 border-2 border-brand-100 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -translate-y-12 translate-x-12 -z-10" />
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800">{planName}</h3>
                                <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Assinatura Mensal</p>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-sm font-bold text-slate-400">R$</span>
                            <span className="text-5xl font-black text-slate-900">{(planPrice / 100).toFixed(2).replace('.', ',')}</span>
                            <span className="text-sm font-bold text-slate-500">/mês</span>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">O que está incluído:</p>
                            {PLAN_FEATURES[planId]?.slice(0, 6).map((feat) => (
                                <div key={feat} className="flex items-center gap-2 text-sm text-slate-600">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                    <span className="capitalize">{feat.replace(/_/g, ' ')}</span>
                                </div>
                            ))}
                            <p className="text-[10px] text-slate-400 italic mt-2">...e muito mais recursos avançados.</p>
                        </div>
                    </GlassCard>

                    <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-4 border border-slate-200">
                        <Lock size={20} className="text-slate-400 mt-1 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-slate-800">Pagamento Seguro</p>
                            <p className="text-xs text-slate-500">
                                Seus dados estão protegidos. Atualmente operamos com faturamento manual via Boleto, PIX ou Cartão após validação do suporte.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Coluna da Direita: Ações de Checkout */}
                <div className="space-y-6">
                    <GlassCard title="Como você prefere assinar?" className="p-6">
                        <div className="space-y-6">
                            {/* Opção 1: WhatsApp (Mais rápida) */}
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Opção rápida (Recomendada)</p>
                                <a 
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                            <MessageCircle size={24} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-emerald-900">Ativação via WhatsApp</p>
                                            <p className="text-xs text-emerald-700">Fale com um consultor agora</p>
                                        </div>
                                    </div>
                                    <ArrowLeft size={20} className="text-emerald-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-400 font-bold">Ou</span>
                                </div>
                            </div>

                            {/* Opção 2: Formulário Interno */}
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quero ser contactado</p>
                                <form onSubmit={handleInteresse} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Seu WhatsApp</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="text" 
                                                required
                                                className="input-glass w-full pl-12 h-14" 
                                                placeholder="(00) 00000-0000"
                                                value={telefone}
                                                onChange={e => setTelefone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={loading || !telefone}
                                        className="w-full h-14 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <AtSign size={20} />}
                                        Registrar Interesse
                                    </button>
                                    <p className="text-[10px] text-slate-400 text-center px-4">
                                        Ao clicar, nossa equipe receberá seu contato e o plano desejado ({planName}) para processar a ativação.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
