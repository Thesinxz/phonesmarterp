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
    History,
    Layout,
    BarChart3,
    QrCode,
    FileText
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
            title: "Gestão de OS (Kanban)",
            description: "Organize sua bancada com um Kanban inteligente. Checklists, fotos e assinatura digital em um só lugar."
        },
        {
            icon: Package,
            title: "Estoque e IMEIs",
            description: "Controle individual por número de série. Saiba exatamente qual peça foi usada em qual aparelho."
        },
        {
            icon: FileText,
            title: "Fiscal Completo",
            description: "Emissão de NF-e, NFC-e e NFS-e simplificada. Fique em dia com o fisco sem dor de cabeça."
        },
        {
            icon: MessageCircle,
            title: "WhatsApp e Marketing",
            description: "Notificações automáticas de status e pós-venda. Fidelize seus clientes com automação real."
        },
        {
            icon: BarChart3,
            title: "Relatórios e DRE",
            description: "Visão macro da sua lucratividade. Relatórios de peças, comissões e produtividade técnica."
        },
        {
            icon: Layout,
            title: "Multi-unidades",
            description: "Gerencie várias lojas e estoques independentes em uma única conta centralizada."
        }
    ];

    const pricing = [
        {
            name: "Starter",
            price: "R$ 24,90",
            period: "/mês",
            recommended: false,
            desc: "Para pequenas assistências começando agora.",
            features: [
                "Gestão de OS (Kanban)",
                "Vendas e PDV",
                "Estoque Geral",
                "1 Loja / 1 Técnico",
                "Até 80 OS/mês"
            ]
        },
        {
            name: "Essencial",
            price: "R$ 49,90",
            period: "/mês",
            recommended: true,
            desc: "O melhor custo-benefício para lojas profissionais.",
            features: [
                "Tudo do Starter +",
                "Emissão de NFe/NFCe/NFSe",
                "Gestão de IMEIs e Peças",
                "Contas a Pagar/Receber",
                "Até 200 OS/mês"
            ]
        },
        {
            name: "Pro",
            price: "R$ 99,90",
            period: "/mês",
            recommended: false,
            desc: "Escala e automação para redes de lojas.",
            features: [
                "Tudo do Essencial +",
                "Até 3 Lojas Independentes",
                "Marketing e Pós-venda Aut.",
                "Lista de Preços em PDF",
                "OS Ilimitadas"
            ]
        }
    ];

    const screenshots = [
        {
            title: "Dashboard Estratégico",
            desc: "Tenha o controle total do seu financeiro e metas em tempo real.",
            img: "/dashboard_1773659221258.png",
            features: ["Gráficos de Faturamento", "Alertas de OS Atrasadas", "Métricas de Conversão"]
        },
        {
            title: "Kanban de OS",
            desc: "Visualização clara de toda a sua produção e gargalos técnicos.",
            img: "/kanban_1773659246389.png",
            features: ["Arrastar e Soltar", "Checklists de Entrada", "Assinatura do Cliente"]
        },
        {
            title: "Gestão de Equipe",
            desc: "Controle de produtividade e comissões dos seus técnicos.",
            img: "/tecnicos_1773659276343.png",
            features: ["Ranking de Técnicos", "Comissões Automáticas", "Cálculo de Metas"]
        }
    ];

    const WHATSAPP_BASE = "https://wa.me/5511999999999";
    const WHATSAPP_LINK = `${WHATSAPP_BASE}?text=Olá! Gostaria de falar com um especialista sobre o Smart OS.`;

    return (
        <div className="min-h-screen bg-[#f8fafc] overflow-x-hidden selection:bg-brand-500 selection:text-white">
            {/* Navbar */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between",
                scrolled ? "bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm" : "bg-transparent"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand-glow">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-black text-slate-800 tracking-tight">Smart <span className="text-brand-500">OS</span></span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                    <Link href="/funcionalidades" className="hover:text-brand-500 transition-colors">Funcionalidades</Link>
                    <a href="#preview" className="hover:text-brand-500 transition-colors">Interface</a>
                    <a href="#pricing" className="hover:text-brand-500 transition-colors">Planos</a>
                    <Link href="/roadmap" className="hover:text-brand-500 transition-colors">Roadmap</Link>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-brand-500 transition-colors px-4">Entrar</Link>
                    <Link href="/login" className="btn-primary py-2 px-6">Começar Agora</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="hero" className="relative pt-32 pb-20 px-6 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 text-center lg:text-left space-y-8 animate-slide-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[10px] font-black uppercase tracking-widest border border-brand-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                            </span>
                            Novo: Gestão de IMEIs e NFC-e
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.05] tracking-tighter">
                            O ERP que a sua <br />
                            <span className="text-brand-500">Assistência</span> merece.
                        </h1>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                            Gerencie ordens de serviço, vendas, estoque e fiscal em um só lugar. Projetado para trazer eficiência e lucro real para sua loja.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start">
                            <Link href="/login" className="bg-slate-900 text-white text-lg px-10 py-4 w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-2">
                                Testar Grátis
                                <ArrowRight size={20} />
                            </Link>
                            <a href="#preview" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest border-2">
                                Ver App por dentro
                            </a>
                        </div>
                    </div>

                    <div className="flex-1 relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="relative z-10 rounded-3xl overflow-hidden shadow-[0_32px_80px_-16px_rgba(15,23,42,0.15)] border border-slate-200">
                            <img 
                                src="/smartos_hero_mockup_1773659025878.png" 
                                alt="Smart OS Mockup" 
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        {/* Highlights */}
                        <div className="absolute -bottom-6 -left-6 z-20 bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 animate-bounce-slow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Crescimento Mes</p>
                                    <p className="text-xl font-black text-slate-900">+42%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* App Preview Section */}
            <section id="preview" className="py-24 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-sm font-black text-brand-600 uppercase tracking-[0.3em]">Imagens Reais</h2>
                        <h3 className="text-4xl font-black text-slate-900">Simples, Potente e Profissional.</h3>
                    </div>

                    <div className="space-y-24">
                        {screenshots.map((s, i) => (
                            <div key={i} className={cn(
                                "flex flex-col lg:flex-row items-center gap-16",
                                i % 2 !== 0 && "lg:flex-row-reverse"
                            )}>
                                <div className="flex-1 space-y-6">
                                    <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 font-black text-xl italic">
                                        0{i + 1}
                                    </div>
                                    <h4 className="text-3xl font-black text-slate-900">{s.title}</h4>
                                    <p className="text-lg text-slate-500 leading-relaxed font-medium">
                                        {s.desc}
                                    </p>
                                    <ul className="space-y-3">
                                        {s.features.map((f, j) => (
                                            <li key={j} className="flex items-center gap-3 text-slate-600 font-bold">
                                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex-[1.5] relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white group">
                                    <img 
                                        src={s.img} 
                                        alt={s.title} 
                                        className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features (Technical) */}
            <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-sm font-black text-brand-600 uppercase tracking-[0.3em]">Recursos</h2>
                    <h3 className="text-5xl font-black text-slate-900">Dominamos cada detalhe.</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feat, i) => {
                        const Icon = feat.icon;
                        return (
                            <div key={i} className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-500/20 transition-all duration-300 group">
                                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 mb-8 group-hover:bg-brand-500 group-hover:text-white transition-all">
                                    <Icon size={32} />
                                </div>
                                <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">{feat.title}</h4>
                                <p className="text-slate-500 leading-relaxed font-medium">
                                    {feat.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-12 text-center">
                    <Link href="/funcionalidades" className="inline-flex items-center gap-2 text-brand-600 font-black uppercase tracking-widest hover:gap-4 transition-all">
                        Ver todas as 31 funcionalidades
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* CTA High Contrast */}
            <section className="py-24 bg-brand-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[size:40px_40px]" />
                </div>
                <div className="max-w-4xl mx-auto px-6 text-center text-white space-y-8 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black leading-tight italic">Pronto para profissionalizar sua bancada?</h2>
                    <p className="text-xl text-white/80 font-bold">Junte-se a centenas de assistências que já escalaram seu faturamento com o Smart OS.</p>
                    <a target="_blank" rel="noopener noreferrer" href={WHATSAPP_LINK} className="inline-flex bg-white text-slate-900 text-xl px-12 py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
                        Falar com Consultor
                    </a>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-sm font-black text-brand-600 uppercase tracking-[0.3em]">Investimento</h2>
                        <h3 className="text-5xl font-black text-slate-900">Planos que acompanham você.</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {pricing.map((p, i) => (
                            <div key={i} className={cn(
                                "bg-white p-12 flex flex-col relative overflow-hidden transition-all duration-500 rounded-[32px] border",
                                p.recommended ? "border-brand-500 shadow-[0_40px_80px_-20px_rgba(59,130,246,0.15)] scale-105 z-10" : "border-slate-100 hover:scale-[1.02]"
                            )}>
                                {p.recommended && (
                                    <div className="absolute top-6 right-6">
                                        <div className="bg-brand-500 text-white text-[10px] font-black py-1.5 px-3 rounded-full uppercase tracking-widest">
                                            Popular
                                        </div>
                                    </div>
                                )}
                                <h4 className="text-2xl font-black mb-1 uppercase tracking-tighter italic">{p.name}</h4>
                                <p className="text-slate-400 text-xs font-bold mb-8 uppercase tracking-widest">{p.desc}</p>
                                
                                <div className="flex items-baseline gap-1 mb-10">
                                    <span className="text-5xl font-black tracking-tight">{p.price}</span>
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{p.period}</span>
                                </div>
                                <div className="space-y-5 flex-1 border-t border-slate-50 pt-10">
                                    {p.features.map((f, j) => (
                                        <div key={j} className="flex items-center gap-4 text-sm font-bold text-slate-600">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Check size={14} strokeWidth={4} />
                                            </div>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                <a 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    href={`${WHATSAPP_BASE}?text=Olá! Quero assinar o plano ${p.name} do Smart OS.`}
                                    className={cn(
                                        "w-full mt-12 py-5 rounded-2xl font-black uppercase tracking-widest transition-all text-sm text-center",
                                        p.recommended ? "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-glow" : "bg-slate-900 text-white hover:bg-black"
                                    )}
                                >
                                    Assinar Agora
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white pt-32 pb-12 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
                                <Zap className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter">Smart <span className="text-brand-500">OS</span></span>
                        </div>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            O sistema de gestão definitivo para assistências que buscam excelência e crescimento exponencial no mercado nacional.
                        </p>
                    </div>
                    <div>
                        <h5 className="font-black text-white mb-8 uppercase text-xs tracking-[0.3em]">Sistema</h5>
                        <ul className="space-y-5 text-sm font-bold text-slate-500">
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/funcionalidades">Funcionalidades</Link></li>
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/seguranca">Segurança</Link></li>
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/roadmap">Roadmap</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-black text-white mb-8 uppercase text-xs tracking-[0.3em]">Empresa</h5>
                        <ul className="space-y-5 text-sm font-bold text-slate-500">
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/nossos-clientes">Clientes</Link></li>
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/contato">Contato</Link></li>
                            <li className="hover:text-brand-500 transition-colors uppercase"><Link href="/parceiros">Parceiros</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-black text-white mb-8 uppercase text-xs tracking-[0.3em]">Suporte</h5>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                            <p className="text-xs font-bold text-slate-400 italic">Precisa de ajuda?</p>
                            <a target="_blank" rel="noopener noreferrer" href={WHATSAPP_LINK} className="flex items-center gap-3 text-brand-400 font-black uppercase text-xs hover:text-brand-300 transition-colors">
                                <MessageCircle size={18} />
                                Falar com Especialista
                            </a>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <p>© 2026 Smart OS. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-3">
                        <Globe size={14} />
                        Orgulhosamente Brasileiro
                    </div>
                </div>
            </footer>
        </div>
    );
}
