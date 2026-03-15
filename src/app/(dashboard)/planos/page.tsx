"use client";

import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Zap, Check, X, Star, ShieldCheck, Crown,
    Users, ClipboardList, Package, ArrowRight,
    Search, Lightbulb
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useState, useEffect, Suspense } from "react";
import { PLAN_FEATURES, PLAN_LIMITS, Feature, Plan, getPlanForFeature, PLAN_NAMES } from "@/lib/plans/features";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const plans = [
    {
        id: "starter",
        name: "Starter",
        price: 2490,
        priceAnual: 1990,
        description: "Para quem está começando",
        icon: Zap,
        color: "text-slate-600",
        bg: "bg-slate-100",
        borderColor: "border-slate-200",
        limits: { usuarios: 2, tecnicos: 1, os: 80, storage: "500MB" },
        features: [
            { text: "Ordens de Serviço (Kanban + Lista)", included: true },
            { text: "PDV Simplificado", included: true },
            { text: "Gestão de Clientes", included: true },
            { text: "Orçamento Rápido", included: true },
            { text: "WhatsApp Automático (básico)", included: true },
            { text: "App no Celular (PWA)", included: true },
            { text: "Notas Fiscais", included: false },
            { text: "Módulo Financeiro", included: false },
            { text: "Relatórios", included: false },
            { text: "Multi-Empresa", included: false },
        ],
    },
    {
        id: "essencial",
        name: "Essencial",
        price: 4990,
        priceAnual: 3990,
        description: "Para assistências em crescimento",
        icon: Star,
        color: "text-brand-600",
        bg: "bg-brand-50",
        borderColor: "border-brand-300",
        recommended: true,
        limits: { usuarios: 5, tecnicos: 3, os: 200, storage: "1GB" },
        features: [
            { text: "Tudo do Starter", included: true },
            { text: "PDV Completo + Caixa", included: true },
            { text: "Notas Fiscais (NF-e, NFC-e, NFS-e)", included: true },
            { text: "Gestão de Estoque + Alertas", included: true },
            { text: "Financeiro (Receber + Pagar)", included: true },
            { text: "Relatórios e Filtros Avançados", included: true },
            { text: "Push Notifications", included: true },
            { text: "Películas e Acessórios", included: true },
            { text: "Multi-Empresa", included: false },
            { text: "Hub Contabilidade", included: false },
        ],
    },
    {
        id: "pro",
        name: "Pro",
        price: 9990,
        priceAnual: 7990,
        description: "Para operações completas",
        icon: Crown,
        color: "text-purple-600",
        bg: "bg-purple-50",
        borderColor: "border-purple-200",
        limits: { 
            usuarios: PLAN_LIMITS.pro.maxUsuarios, 
            tecnicos: PLAN_LIMITS.pro.maxTecnicos, 
            os: PLAN_LIMITS.pro.maxOsPerMonth || "Ilimitadas", 
            storage: `${PLAN_LIMITS.pro.maxStorageMB / 1024}GB` 
        },
        features: [
            { text: "Tudo do Essencial", included: true },
            { text: "Multi-Empresa (até 3 lojas)", included: true },
            { text: "Captura Automática NF-e (MD-e)", included: true },
            { text: "DRE Completo", included: true },
            { text: "CRM 360° (Visão Cliente)", included: true },
            { text: "Hub Contabilidade (envio XML)", included: true },
            { text: "Prateleira / Abandonos", included: true },
            { text: "Gestão de Equipe + Permissões", included: true },
            { text: "Garantia Estendida", included: true },
            { text: "Suporte Prioritário", included: true },
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: 24900,
        priceAnual: 19900,
        description: "Para redes e franquias",
        icon: ShieldCheck,
        color: "text-amber-600",
        bg: "bg-amber-50",
        borderColor: "border-amber-200",
        limits: { 
            usuarios: PLAN_LIMITS.enterprise.maxUsuarios || "Ilimitados", 
            tecnicos: PLAN_LIMITS.enterprise.maxTecnicos || "Ilimitados", 
            os: PLAN_LIMITS.enterprise.maxOsPerMonth || "Ilimitadas", 
            storage: `${PLAN_LIMITS.enterprise.maxStorageMB / 1024}GB` 
        },
        features: [
            { text: "Tudo do Pro", included: true },
            { text: "Lojas Ilimitadas", included: true },
            { text: "OS Ilimitadas", included: true },
            { text: "Suporte VIP via WhatsApp", included: true },
            { text: "Acesso Antecipado a Novos Recursos", included: true },
            { text: "API de Integração", included: true },
            { text: "Treinamento Personalizado", included: true },
            { text: "Backup Dedicado", included: true },
        ],
    },
];

function formatPrice(centavos: number) {
    const reais = Math.floor(centavos / 100);
    const cents = centavos % 100;
    return { reais, cents: cents.toString().padStart(2, "0") };
}

function PlanosContent() {
    const { empresa } = useAuth();
    const searchParams = useSearchParams();
    const currentPlan = empresa?.plano || "starter";
    const [isAnual, setIsAnual] = useState(false);

    const upgradeFeature = searchParams.get('upgrade');
    const fromPath = searchParams.get('from');

    const recommendedPlanId = upgradeFeature 
        ? getPlanForFeature(upgradeFeature as Feature) 
        : 'essencial';

    useEffect(() => {
        if (recommendedPlanId) {
            const element = document.getElementById(`plano-${recommendedPlanId}`);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    }, [recommendedPlanId]);

    return (
        <div className="space-y-8 page-enter pb-12">
            {/* Contexto de Upgrade */}
            {upgradeFeature && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-500/20 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Lightbulb className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-xl font-black uppercase tracking-tight">Você tentou acessar: <span className="underline decoration-indigo-300">{upgradeFeature.replace(/_/g, ' ')}</span></h2>
                            <p className="text-indigo-100 text-sm mt-1">Este recurso está disponível a partir do plano <strong>{PLAN_NAMES[recommendedPlanId]}</strong>.</p>
                        </div>
                        {fromPath && (
                            <Link href={fromPath} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/20">
                                Voltar onde eu estava
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-black text-slate-800">Planos SmartOS</h1>
                <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
                    Escolha o plano ideal para o seu negócio crescer. Todos os planos incluem atualizações gratuitas.
                </p>

                {/* Toggle Mensal/Anual */}
                <div className="flex items-center justify-center gap-3 mt-6">
                    <span className={cn("text-sm font-bold", !isAnual ? "text-slate-800" : "text-slate-400")}>Mensal</span>
                    <button
                        onClick={() => setIsAnual(!isAnual)}
                        className={cn(
                            "relative w-14 h-7 rounded-full transition-colors",
                            isAnual ? "bg-brand-500" : "bg-slate-300"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform",
                            isAnual ? "translate-x-7" : "translate-x-0.5"
                        )} />
                    </button>
                    <span className={cn("text-sm font-bold", isAnual ? "text-slate-800" : "text-slate-400")}>
                        Anual
                    </span>
                    {isAnual && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                            Até 20% OFF
                        </span>
                    )}
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {plans.map((plan) => {
                    const PlanIcon = plan.icon;
                    const isCurrent = currentPlan === plan.id;
                    const isRecommendedForFeature = recommendedPlanId === plan.id;
                    const price = isAnual ? plan.priceAnual : plan.price;
                    const { reais, cents } = formatPrice(price);
                    const originalPrice = isAnual ? formatPrice(plan.price) : null;

                    return (
                        <div key={plan.id} id={`plano-${plan.id}`} className="relative flex">
                            {plan.recommended && !upgradeFeature && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30 z-10 uppercase tracking-wider">
                                    Mais Popular
                                </div>
                            )}
                            {isRecommendedForFeature && upgradeFeature && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30 z-10 uppercase tracking-wider">
                                    Plano Necessário
                                </div>
                            )}
                            <GlassCard className={cn(
                                "flex-1 flex flex-col p-6 transition-all border-2",
                                plan.recommended && !upgradeFeature && "border-brand-400 shadow-brand-glow ring-1 ring-brand-200",
                                isRecommendedForFeature && upgradeFeature && "border-indigo-500 shadow-indigo-glow scale-105 z-20",
                                isCurrent && !isRecommendedForFeature && "border-emerald-400 shadow-emerald-glow",
                                !isCurrent && !isRecommendedForFeature && !plan.recommended && "border-slate-200"
                            )}>
                                {/* Icon + Name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", plan.bg)}>
                                        <PlanIcon className={cn("w-5 h-5", plan.color)} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">{plan.name}</h3>
                                        <p className="text-[11px] text-slate-400">{plan.description}</p>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="mb-1">
                                    {originalPrice && (
                                        <span className="text-sm text-slate-400 line-through mr-2">
                                            R$ {originalPrice.reais},{originalPrice.cents}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-0.5 mb-1">
                                    <span className="text-sm font-bold text-slate-500">R$</span>
                                    <span className="text-4xl font-black text-slate-900">{reais}</span>
                                    <span className="text-lg font-bold text-slate-700">,{cents}</span>
                                    <span className="text-xs text-slate-400 ml-1">/mês</span>
                                </div>
                                {isAnual && (
                                    <p className="text-[10px] text-emerald-600 font-bold mb-4">
                                        Cobrado anualmente · R$ {((price * 12) / 100).toFixed(2).replace('.', ',')}/ano
                                    </p>
                                )}
                                {!isAnual && <div className="mb-4" />}

                                {/* Limits */}
                                <div className="grid grid-cols-2 gap-2 mb-5 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <Users size={12} className="text-slate-400" />
                                        <span className="font-bold text-slate-700">{plan.limits.usuarios}</span>
                                        <span className="text-slate-400">usuários</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <ClipboardList size={12} className="text-slate-400" />
                                        <span className="font-bold text-slate-700">{plan.limits.os}</span>
                                        <span className="text-slate-400">OS/mês</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <Users size={12} className="text-slate-400" />
                                        <span className="font-bold text-slate-700">{plan.limits.tecnicos}</span>
                                        <span className="text-slate-400">técnicos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <Package size={12} className="text-slate-400" />
                                        <span className="font-bold text-slate-700">{plan.limits.storage}</span>
                                        <span className="text-slate-400">anexos</span>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="space-y-2.5 flex-1 mb-6">
                                    {plan.features.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[13px]">
                                            {f.included ? (
                                                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <X className="w-2.5 h-2.5 text-slate-300" strokeWidth={3} />
                                                </div>
                                            )}
                                            <span className={cn(f.included ? "text-slate-700" : "text-slate-400")}>
                                                {f.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <Link
                                    href={`/planos/checkout/${plan.id}`}
                                    className={cn(
                                        "w-full py-3 rounded-xl font-bold text-sm transition-all text-center",
                                        isCurrent
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                            : plan.recommended || isRecommendedForFeature
                                                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-xl"
                                                : "bg-slate-800 text-white hover:bg-slate-900 shadow-lg hover:shadow-xl"
                                    )}
                                >
                                    {isCurrent ? "✓ Plano Atual" : "Assinar Agora"}
                                </Link>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>

            {/* Comparison Table */}
            <GlassCard className="overflow-hidden p-0">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <h2 className="text-lg font-bold text-slate-800">Comparação Detalhada</h2>
                    <p className="text-sm text-slate-500">Veja tudo que cada plano inclui</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-6 py-4 text-slate-500 font-bold text-xs uppercase tracking-wider">Recurso</th>
                                {plans.map(p => (
                                    <th key={p.id} className={cn("px-4 py-4 text-center font-bold", p.recommended ? "text-brand-600" : "text-slate-700")}>
                                        {p.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { label: "Ordens de Serviço", values: [PLAN_LIMITS.starter.maxOsPerMonth + "/mês", PLAN_LIMITS.essencial.maxOsPerMonth + "/mês", "Ilimitadas", "Ilimitadas"] },
                                { label: "PDV (Ponto de Venda)", values: ["Simplificado", "Completo + Caixa", "✅", "✅"] },
                                { label: "Notas Fiscais", values: [PLAN_FEATURES.starter.includes('nfe') ? "✅" : "—", "NF-e/NFC-e/NFS-e", "✅", "✅"] },
                                { label: "Gestão de IMEIs", values: ["—", "✅", "✅", "✅"] },
                                { label: "Financeiro", values: ["—", "✅ Completo", "✅", "✅"] },
                                { label: "Multi-Empresa", values: ["—", "—", "Até 3 lojas", "Ilimitadas"] },
                                { label: "Automações Marketing", values: ["—", "—", "✅", "✅"] },
                                { label: "Balanço de Estoque", values: ["—", "—", "✅", "✅"] },
                                { label: "Hub Contabilidade", values: ["—", "—", "—", "✅"] },
                                { label: "Suporte VIP", values: ["—", "—", "—", "✅"] },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-3 font-medium text-slate-700">{row.label}</td>
                                    {row.values.map((v, j) => (
                                        <td key={j} className="px-4 py-3 text-center text-slate-600 text-xs font-bold">
                                            {v === "—" ? <span className="text-slate-300">—</span> :
                                                v === "✅" ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : v}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}

export default function PlanosPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        }>
            <PlanosContent />
        </Suspense>
    );
}
