"use client";

import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { Zap, Check, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/utils/cn";

export default function PlanosPage() {
    const { empresa } = useAuth();
    const currentPlan = empresa?.plano || "starter";

    const plans = [
        {
            id: "starter",
            name: "Starter",
            price: "R$ 0",
            description: "Para quem está começando",
            features: [
                "Até 50 OS/mês",
                "Gestão de Vendas Básica",
                "Financeiro Simplificado",
                "1 Usuário Admin"
            ],
            icon: Zap,
            color: "text-slate-500",
            bg: "bg-slate-50"
        },
        {
            id: "profissional",
            name: "Profissional",
            price: "R$ 149,90",
            description: "Para assistências em crescimento",
            features: [
                "OS Ilimitadas",
                "Controle de Estoque Avançado",
                "Emissão de NF-e/NFC-e",
                "Até 5 Usuários",
                "Suporte Prioritário"
            ],
            icon: Star,
            color: "text-brand-500",
            bg: "bg-brand-50",
            recommended: true
        },
        {
            id: "enterprise",
            name: "Enterprise",
            price: "Sob Consulta",
            description: "Para grandes operações",
            features: [
                "Multi-lojas",
                "API de Integração",
                "Treinamento VIP",
                "Usuários Ilimitados",
                "SLA de 99.9%"
            ],
            icon: ShieldCheck,
            color: "text-amber-500",
            bg: "bg-amber-50"
        }
    ];

    return (
        <div className="space-y-6 page-enter pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Planos e Assinatura</h1>
                <p className="text-slate-500 text-sm mt-0.5">Escolha o plano ideal para a sua assistência crescer</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    const isCurrent = currentPlan === plan.id;

                    return (
                        <div key={plan.id} className="relative">
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10">
                                    MAIS POPULAR
                                </div>
                            )}
                            <GlassCard className={cn(
                                "h-full flex flex-col p-6 transition-all hover:scale-[1.02]",
                                isCurrent && "border-2 border-brand-500 shadow-brand-glow"
                            )}>
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", plan.bg)}>
                                    <PlanIcon className={cn("w-6 h-6", plan.color)} />
                                </div>

                                <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                                    {plan.price.includes("R$") && <span className="text-slate-400 text-xs font-normal">/mês</span>}
                                </div>
                                <p className="text-slate-500 text-sm mt-2 mb-6">{plan.description}</p>

                                <div className="space-y-3 flex-1 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                            </div>
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className={cn(
                                        "w-full py-3 rounded-xl font-bold text-sm transition-all",
                                        isCurrent
                                            ? "bg-slate-100 text-slate-500 cursor-default"
                                            : plan.recommended
                                                ? "bg-brand-500 text-white shadow-brand-glow hover:bg-brand-600"
                                                : "bg-slate-800 text-white hover:bg-slate-900 shadow-lg"
                                    )}
                                >
                                    {isCurrent ? "Plano Atual" : "Upgrade Agora"}
                                </button>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
