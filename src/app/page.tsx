"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Zap,
    Shield,
    Smartphone,
    TrendingUp,
    Check,
    ArrowRight,
    Users,
    Star,
    Globe,
    MessageCircle,
    Package,
    DollarSign,
    ClipboardList,
    History
} from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassCard } from "@/components/ui/GlassCard";

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const features = [
        {
            icon: ClipboardList,
            title: "Gestão de OS",
            description: "Acompanhamento em tempo real, checklists personalizados e assinatura digital diretamente no tablet ou celular."
        },
        {
            icon: Package,
            title: "Estoque Inteligente",
            description: "Controle de peças, acessórios e aparelhos com baixa automática e alertas de reposição por IA."
        },
        {
            icon: DollarSign,
            title: "Financeiro Completo",
            description: "Fluxo de caixa sincronizado, DRE automático e controle de contas a pagar/receber para sua tranquilidade."
        },
        {
            icon: Users,
            title: "CRM e Fidelidade",
            description: "Base de clientes segmentada, histórico de atendimentos e sistema de pontos para fidelizar seus clientes."
        },
        {
            icon: MessageCircle,
            title: "WhatsApp API",
            description: "Notificações automáticas de status de OS e comprovantes de venda enviados instantaneamente."
        },
        {
            icon: History,
            title: "Auditoria e Segurança",
            description: "Logs detalhados de todas as ações no sistema, garantindo transparência e integridade dos seus dados."
        }
    ];

    const pricing = [
        {
            name: "Starter",
            price: "R$ 97",
            period: "/mês",
            recommended: false,
            features: [
                "Até 2 usuários",
                "Gestão de OS Ilimitada",
                "Estoque Simples",
                "Financeiro Básico",
                "Suporte via Email"
            ]
        },
        {
            name: "Profissional",
            price: "R$ 197",
            period: "/mês",
            recommended: true,
            features: [
                "Usuários Ilimitados",
                "CRM Completo",
                "Fidelidade e Pontos",
                "Notificações WhatsApp",
                "Emissão de NFC-e/NF-e",
                "Suporte Prioritário"
            ]
        },
        {
            name: "Enterprise",
            price: "Consultar",
            period: "",
            recommended: false,
            features: [
                "Múltiplas Unidades",
                "Relatórios Customizados",
                "API de Integração",
                "Gerente de Conta",
                "Treinamento VIP"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden selection:bg-brand-500 selection:text-white">
            {/* Navbar */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between",
                scrolled ? "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm" : "bg-transparent"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand-glow">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black text-slate-800 tracking-tight">Phone Smart <span className="text-brand-500">ERP</span></span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                    <a href="#features" className="hover:text-brand-500 transition-colors">Funcionalidades</a>
                    <a href="#testimonials" className="hover:text-brand-500 transition-colors">Depoimentos</a>
                    <a href="#pricing" className="hover:text-brand-500 transition-colors">Preços</a>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-brand-500 transition-colors px-4">Entrar</Link>
                    <Link href="/login" className="btn-primary py-2 px-6">Começar Grátis</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 text-center lg:text-left space-y-8 animate-slide-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-600 text-xs font-bold uppercase tracking-widest border border-brand-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                            </span>
                            Novo: Scanner OCR e IA Generativa
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
                            A Inteligência que a sua <span className="text-brand-500">Assistência</span> merece.
                        </h1>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            O primeiro ERP para assistências técnicas de celulares que utiliza Inteligência Artificial para gerar descrições, faturar automático e automatizar seu WhatsApp.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
                            <Link href="/login" className="btn-primary text-lg px-10 py-4 w-full sm:w-auto">
                                Testar por 14 dias grátis
                                <ArrowRight size={20} />
                            </Link>
                            <button className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                                Ver Demonstração
                            </button>
                        </div>
                        <div className="flex items-center gap-6 pt-6 justify-center lg:justify-start opacity-70">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
                                ))}
                            </div>
                            <p className="text-sm text-slate-600 font-medium">
                                <span className="text-brand-600 font-bold">+500 técnicos</span> já utilizam
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="relative z-10 rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(30,41,59,0.2)] border border-white/40">
                            {/* Placeholder for the generated image or mockup */}
                            <div className="bg-slate-900 aspect-square lg:aspect-video flex items-center justify-center">
                                <Zap className="w-20 h-20 text-brand-500 animate-pulse" />
                            </div>
                        </div>
                        {/* Floating Cards */}
                        <div className="absolute -bottom-6 -left-6 z-20 glass-card p-4 animate-bounce-slow">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Lucro do Mês</p>
                                    <p className="text-lg font-black text-slate-800">+ R$ 12.450</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-6 -right-6 z-20 glass-card p-4 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                                    <MessageCircle size={20} />
                                </div>
                                <p className="text-xs font-bold text-slate-700">Notificação Enviada!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
                    <h2 className="text-sm font-bold text-brand-600 uppercase tracking-[0.2em]">O Grande Gargalo</h2>
                    <h3 className="text-3xl lg:text-5xl font-black text-slate-900 leading-tight">
                        Cansado de perder tempo com papéis e planilhas que não conversam?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                        <div className="space-y-3">
                            <div className="text-red-500 text-4xl font-bold italic opacity-30">#01</div>
                            <p className="font-bold text-slate-800">Clientes te cobrando no WhatsApp toda hora</p>
                            <p className="text-sm text-slate-500">A falta de status automático gera ansiedade no cliente e interrompe sua bancada.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="text-red-500 text-4xl font-bold italic opacity-30">#02</div>
                            <p className="font-bold text-slate-800">Peças sumindo do estoque ou faltando na hora H</p>
                            <p className="text-sm text-slate-500">Sem controle real de venda e entrada, o prejuízo é invisível e diário.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="text-red-500 text-4xl font-bold italic opacity-30">#03</div>
                            <p className="font-bold text-slate-800">Noite em claro fazendo fechamento de caixa</p>
                            <p className="text-sm text-slate-500">O que entrou? O que saiu? Qual a comissão do técnico? O Phone Smart resolve isso em segundos.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-sm font-bold text-brand-600 uppercase tracking-[0.2em]">Funcionalidades</h2>
                    <h3 className="text-4xl font-black text-slate-900">Tudo o que sua loja precisa.</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feat, i) => {
                        const Icon = feat.icon;
                        return (
                            <div key={i} className="glass-card group p-8 hover:bg-brand-500 transition-all duration-500">
                                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6 group-hover:bg-white/20 group-hover:text-white transition-colors">
                                    <Icon size={28} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-white transition-colors">{feat.title}</h4>
                                <p className="text-slate-500 group-hover:text-white/80 transition-colors leading-relaxed">
                                    {feat.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Counter Section */}
            <section className="py-20 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
                    <div className="space-y-2">
                        <p className="text-4xl lg:text-6xl font-black text-brand-400">1M+</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">OS Processadas</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl lg:text-6xl font-black text-brand-400">98%</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Satisfação Clientes</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl lg:text-6xl font-black text-brand-400">2.5h</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Economia Diária</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl lg:text-6xl font-black text-brand-400">24/7</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Monitoramento</p>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-sm font-bold text-brand-600 uppercase tracking-[0.2em]">Prova Social</h2>
                        <h3 className="text-4xl font-black text-slate-900">Quem usa, recomenda.</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { name: "Ricardo Alves", role: "Proprietário, FixCell", comment: "O sistema de pontos de fidelidade mudou meu negócio. Meus clientes agora voltam só para resgatar os bônus!" },
                            { name: "Mariana Costa", role: "Gerente, TechSmart", comment: "O faturamento automático no WhatsApp economizou pelo menos 2h por dia da minha recepção." },
                            { name: "Felipe Mendes", role: "Técnico Master, iPhonePro", comment: "Scanner de preços via foto é mágica. Antigamente levava uma manhã inteira para atualizar o estoque." }
                        ].map((t, i) => (
                            <GlassCard key={i} className="p-8 italic relative">
                                <div className="absolute -top-4 -left-4 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-brand-glow font-serif text-2xl">
                                    "
                                </div>
                                <div className="flex gap-1 mb-6 text-amber-500">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill="currentColor" />)}
                                </div>
                                <p className="text-slate-600 mb-8 leading-relaxed">"{t.comment}"</p>
                                <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">{t.role}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-sm font-bold text-brand-600 uppercase tracking-[0.2em]">Planos e Preços</h2>
                        <h3 className="text-4xl font-black text-slate-900">Justo e transparente.</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {pricing.map((p, i) => (
                            <div key={i} className={cn(
                                "glass-card p-10 flex flex-col relative overflow-hidden transition-all duration-500",
                                p.recommended ? "bg-slate-900 text-white border-brand-500 border-2 scale-105 shadow-2xl" : "hover:scale-[1.02]"
                            )}>
                                {p.recommended && (
                                    <div className="absolute top-4 right-[-35px] rotate-45 bg-brand-500 text-white text-[10px] font-bold py-1 px-10">
                                        RECOMENDADO
                                    </div>
                                )}
                                <h4 className={cn("text-xl font-bold mb-2", p.recommended ? "text-brand-400" : "text-slate-900")}>{p.name}</h4>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-black">{p.price}</span>
                                    <span className={cn("text-sm font-medium", p.recommended ? "text-slate-400" : "text-slate-500")}>{p.period}</span>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {p.features.map((f, j) => (
                                        <div key={j} className="flex items-center gap-3 text-sm">
                                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", p.recommended ? "bg-brand-500/20 text-brand-400" : "bg-emerald-100 text-emerald-600")}>
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                            <span className={p.recommended ? "text-slate-300" : "text-slate-600"}>{f}</span>
                                        </div>
                                    ))}
                                </div>
                                <button className={cn(
                                    "w-full mt-10 py-4 rounded-xl font-bold transition-all",
                                    p.recommended ? "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-glow" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                )}>
                                    Escolher Plano
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 pt-20 pb-10 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
                                <Zap className="w-5 h-5" />
                            </div>
                            <span className="text-lg font-black text-slate-800 tracking-tight">Phone Smart <span className="text-brand-500">ERP</span></span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            O sistema de gestão oficial para assistências que buscam excelência, automação e crescimento real.
                        </p>
                        <div className="flex gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-colors cursor-pointer" />)}
                        </div>
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Produto</h5>
                        <ul className="space-y-4 text-sm text-slate-500 font-medium">
                            <li className="hover:text-brand-500 cursor-pointer">Funcionalidades</li>
                            <li className="hover:text-brand-500 cursor-pointer">Segurança</li>
                            <li className="hover:text-brand-500 cursor-pointer">Novidades</li>
                            <li className="hover:text-brand-500 cursor-pointer">Roadmap</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Empresa</h5>
                        <ul className="space-y-4 text-sm text-slate-500 font-medium">
                            <li className="hover:text-brand-500 cursor-pointer">Sobre nós</li>
                            <li className="hover:text-brand-500 cursor-pointer">Clientes</li>
                            <li className="hover:text-brand-500 cursor-pointer">Contato</li>
                            <li className="hover:text-brand-500 cursor-pointer">Carreiras</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Legal</h5>
                        <ul className="space-y-4 text-sm text-slate-500 font-medium">
                            <li className="hover:text-brand-500 cursor-pointer">Privacidade</li>
                            <li className="hover:text-brand-500 cursor-pointer">Termos de Uso</li>
                            <li className="hover:text-brand-500 cursor-pointer">Cookies</li>
                            <li className="hover:text-brand-500 cursor-pointer">Contrato</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <p>© 2026 Phone Smart ERP. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-2">
                        <Globe size={14} />
                        Brasil (Português)
                    </div>
                </div>
            </footer>

            {/* Float CTA Mobile */}
            <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden animate-slide-up">
                <Link href="/login" className="btn-primary w-full py-4 text-lg shadow-2xl justify-center">
                    Começar Grátis Agora
                </Link>
            </div>
        </div>
    );
}
