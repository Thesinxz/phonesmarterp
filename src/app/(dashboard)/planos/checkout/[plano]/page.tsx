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
    Lock,
    CreditCard,
    QrCode
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PLAN_NAMES, PLAN_FEATURES, Plan } from "@/lib/plans/features";
import { useState, Suspense } from "react";
import { registrarInteresse } from "@/app/actions/plans";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

const PLAN_PRICES = {
    starter: { monthly: 2490, yearly: 1990 },
    essencial: { monthly: 4990, yearly: 3990 },
    pro: { monthly: 9990, yearly: 7990 },
    enterprise: { monthly: 24900, yearly: 19900 }
};

function CheckoutContent() {
    const { plano } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, empresa } = useAuth();
    
    const [loadingStripe, setLoadingStripe] = useState(false);
    const [loadingInteresse, setLoadingInteresse] = useState(false);
    const [telefone, setTelefone] = useState("");
    const [successInteresse, setSuccessInteresse] = useState(false);

    const isAnual = searchParams.get('anual') === 'true';
    const planId = plano as Plan;
    const planName = PLAN_NAMES[planId] || "Plano";
    const prices = PLAN_PRICES[planId] || { monthly: 0, yearly: 0 };
    const planPrice = isAnual ? prices.yearly : prices.monthly;

    const handleStripeCheckout = async () => {
        if (!empresa?.id) {
            console.error("[Checkout] Empresa ID não encontrado:", { empresa });
            toast.error("Erro: Empresa não identificada.");
            return;
        }

        console.log("[Checkout] Iniciando processo de pagamento:", {
            planId,
            isAnual,
            empresaId: empresa.id,
            userEmail: user?.email
        });

        setLoadingStripe(true);
        try {
            console.log("[Checkout] Chamando API /api/stripe/checkout...");
            const response = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresaId: empresa.id,
                    email: user?.email,
                    planId: planId,
                    isAnual: isAnual
                }),
            });

            console.log("[Checkout] Resposta recebida da API:", {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            const data = await response.json();
            console.log("[Checkout] Dados da resposta:", data);

            if (data.url) {
                console.log("[Checkout] Redirecionando para Stripe:", data.url);
                window.location.href = data.url;
            } else {
                console.error("[Checkout] Erro retornado pela API:", data.error || data);
                toast.error(data.error || "Erro ao iniciar checkout.");
                setLoadingStripe(false);
            }
        } catch (error: any) {
            console.error("[Checkout] Erro catastrófico no fetch:", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            toast.error("Erro na conexão com o servidor de pagamentos.");
            setLoadingStripe(false);
        }
    };

    const handleInteresse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setLoadingInteresse(true);
        try {
            await registrarInteresse({
                userId: user.id,
                empresaId: empresa?.id,
                empresaNome: empresa?.nome,
                planoDesejado: planId,
                telefone
            });
            setSuccessInteresse(true);
            toast.success("Interesse registrado! Entraremos em contato em breve.");
        } catch (error) {
            toast.error("Ocorreu um erro ao registrar seu interesse.");
        } finally {
            setLoadingInteresse(false);
        }
    };

    const whatsappUrl = `https://wa.me/5567991444131?text=${encodeURIComponent(
        `Olá! Estou usando o SmartOS ERP e quero assinar o plano ${planName.toUpperCase()} (${isAnual ? 'ANUAL' : 'MENSAL'}). Meu e-mail é ${user?.email}.`
    )}`;

    if (successInteresse) {
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
                                <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Assinatura {isAnual ? 'Anual' : 'Mensal'}</p>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-sm font-bold text-slate-400">R$</span>
                            <span className="text-5xl font-black text-slate-900">{(planPrice / 100).toFixed(2).replace('.', ',')}</span>
                            <span className="text-sm font-bold text-slate-500">/mês</span>
                        </div>
                        {isAnual && (
                            <p className="text-xs text-emerald-600 font-bold mb-8">
                                Valor total: R$ {((planPrice * 12) / 100).toFixed(2).replace('.', ',')} /ano
                            </p>
                        )}
                        {!isAnual && <div className="mb-8" />}

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
                            <p className="text-sm font-bold text-slate-800">Pagamento Seguro via Stripe</p>
                            <p className="text-xs text-slate-500">
                                Seus dados de pagamento são processados de forma criptografada pelo Stripe, líder mundial em pagamentos online.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Coluna da Direita: Ações de Checkout */}
                <div className="space-y-6">
                    <GlassCard title="Escolha a forma de pagamento" className="p-6">
                        <div className="space-y-6">
                            {/* Opção 1: Stripe (Cartão ou PIX) */}
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pagamento Automático</p>
                                <button 
                                    onClick={handleStripeCheckout}
                                    disabled={loadingStripe}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-2xl transition-all group",
                                        loadingStripe && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                                            {loadingStripe ? <Loader2 className="animate-spin" size={24} /> : <CreditCard size={24} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-brand-900">Cartão ou PIX</p>
                                            <p className="text-xs text-brand-700">Ativação imediata via Stripe</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <CreditCard size={18} className="text-brand-300" />
                                        <QrCode size={18} className="text-brand-300" />
                                    </div>
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-400 font-bold">Ou outras opções</span>
                                </div>
                            </div>

                            {/* Opção 2: WhatsApp */}
                            <div>
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
                                            <p className="font-black text-emerald-900">Suporte WhatsApp</p>
                                            <p className="text-xs text-emerald-700">Fale com um consultor</p>
                                        </div>
                                    </div>
                                    <ArrowLeft size={20} className="text-emerald-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>

                            {/* Opção 3: Formulário Interno */}
                            <div className="pt-4 border-t border-slate-50">
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
                                        disabled={loadingInteresse || !telefone}
                                        className="w-full h-14 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingInteresse ? <Loader2 className="animate-spin" size={20} /> : <AtSign size={20} />}
                                        Registrar Interesse
                                    </button>
                                </form>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-brand-500" size={32} />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
