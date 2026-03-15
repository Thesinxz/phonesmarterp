"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    ClipboardList,
    ShoppingCart,
    Users,
    Package,
    DollarSign,
    Wrench,
    BarChart3,
    FileText,
    Settings,
    Zap,
    ChevronRight,
    ChevronDown,
    Receipt,
    Calculator,
    ClipboardCheck,
    History as HistoryIcon,
    Bell,
    Shield,
    MessageCircle,
    Megaphone,
    X
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasFeature, Feature, Plan, getPlanForFeature, PLAN_NAMES } from "@/lib/plans/features";
import { CompanySwitcher } from "./CompanySwitcher";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    label: string;
    href: string;
    icon: any;
    permission?: string;
    feature?: Feature;
    children?: { label: string; href: string; feature?: Feature }[];
}

const navItems: NavItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Ordens de Serviço",
        href: "/os",
        icon: ClipboardList,
        permission: "ordens_servico",
        children: [
            { label: "Todas as OS", href: "/os" },
            { label: "Nova OS", href: "/os/nova" },
            { label: "Prateleira / Abandonos", href: "/os/prateleira" },
            { label: "Garantia Estendida", href: "/os/garantias", feature: "os_garantias" },
            { label: "Orçamento Rápido", href: "/orcamento" },
            { label: "Técnicos", href: "/tecnicos" },
        ]
    },
    {
        label: "Garantias",
        href: "/garantias",
        icon: Shield,
        permission: "ordens_servico",
        feature: "os_garantias"
    },
    {
        label: "Solicitações",
        href: "/solicitacoes",
        icon: Bell,
        permission: "ordens_servico"
    },
    {
        label: "Vendas",
        href: "/vendas",
        icon: ShoppingCart,
        permission: "vendas",
        children: [
            { label: "PDV (Caixa)", href: "/pdv" },
            { label: "Todas as Vendas", href: "/vendas" },
            { label: "Pedidos / Encomendas", href: "/pedidos" },
        ]
    },
    {
        label: "Clientes",
        href: "/clientes",
        icon: Users,
        permission: "vendas"
    },
    {
        label: "Estoque",
        href: "/estoque",
        icon: Package,
        permission: "estoque",
        children: [
            { label: "Produtos", href: "/estoque" },
            { label: "Películas & Acessórios", href: "/estoque/peliculas" },
            { label: "Peças (Assistência)", href: "/estoque/pecas", feature: "estoque_pecas" },
            { label: "Gestão de IMEIs", href: "/estoque/imeis", feature: "imei" },
            { label: "Compras / Entradas", href: "/compras" },
        ]
    },
    {
        label: "Financeiro",
        href: "/financeiro",
        icon: DollarSign,
        permission: "financeiro",
        children: [
            { label: "Visão Geral", href: "/financeiro" },
            { label: "A Receber", href: "/financeiro/receber", feature: "contas_pagar_receber" },
            { label: "A Pagar", href: "/financeiro/pagar", feature: "contas_pagar_receber" },
            { label: "Caixa (PDV)", href: "/financeiro/caixa" },
            { label: "DRE Gerencial", href: "/financeiro/dre", feature: "relatorios_avancados" },
            { label: "Crediário", href: "/financeiro/crediario" },
        ]
    },
    {
        label: "Equipe",
        href: "/equipe",
        icon: Shield,
        permission: "equipe",
        feature: "gestao_equipe",
        children: [
            { label: "Membros", href: "/equipe" },
            { label: "Metas de Vendas", href: "/equipe/metas" },
        ]
    },
    {
        label: "Marketing",
        href: "/marketing",
        icon: Megaphone,
        permission: "vendas",
        children: [
            { label: "Visão Geral", href: "/marketing" },
            { label: "Lista de Preços", href: "/marketing/lista-precos", feature: "marketing_pdf" },
            { label: "Pós-Venda", href: "/marketing/pos-venda", feature: "pos_venda_auto" },
            { label: "Templates", href: "/marketing/templates", feature: "marketing_pdf" },
            { label: "Campanhas", href: "/marketing/campanhas", feature: "marketing_campanhas" },
        ]
    },
    {
        label: "Relatórios",
        href: "/relatorios",
        icon: BarChart3,
        permission: "financeiro",
        feature: "relatorios_avancados"
    },
    {
        label: "Ferramentas",
        href: "/ferramentas",
        icon: Calculator,
        permission: "estoque",
        children: [
            { label: "Calculadora de Venda", href: "/ferramentas/calculadora" },
            { label: "Cálculo em Massa", href: "/ferramentas/calculo-em-massa" },
            { label: "Importação iPhone", href: "/ferramentas/importacao" },
            { label: "IA & OCR", href: "/ferramentas/ia", feature: "ia_ocr" },
        ]
    },
    {
        label: "Fiscal",
        href: "/fiscal",
        icon: FileText,
        permission: "financeiro",
        feature: "nfe",
        children: [
            { label: "Visão Geral", href: "/fiscal" },
            { label: "NF-e (Produto)", href: "/fiscal/nfe", feature: "nfe" },
            { label: "NFC-e (Consumidor)", href: "/fiscal/nfce", feature: "nfce" },
            { label: "NFS-e (Serviços)", href: "/fiscal/nfse", feature: "nfse" },
            { label: "Importar XML", href: "/fiscal/importar", feature: "xml_import" }
        ]
    },
    {
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings,
        permission: "configuracoes",
        children: [
            { label: "Geral & Dados", href: "/configuracoes" },
            { label: "Gestão de Empresas", href: "/configuracoes/empresas" },
            { label: "Etiquetas", href: "/configuracoes/etiquetas/a4", feature: "etiquetas" },
            { label: "Auditoria", href: "/configuracoes/auditoria", feature: "auditoria_logs" },
            { label: "Contabilidade", href: "/configuracoes/contador", feature: "hub_contabilidade_feature" },
        ]
    },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { empresa, profile, isTrialExpired, activeAddons } = useAuth();
    const { can } = usePermissions();
    const [solicitationsCount, setSolicitationsCount] = useState(0);
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        // Inicializa menus que têm filhos ativos como abertos
        const initialState: Record<string, boolean> = {};
        navItems.forEach(item => {
            if (item.children && pathname.startsWith(item.href)) {
                initialState[item.label] = true;
            }
        });
        return initialState;
    });

    // Supabase Realtime for solicitations count
    useEffect(() => {
        if (!empresa?.id) return;

        const supabase = createClient();

        const fetchCount = async () => {
            const { count } = await (supabase.from("solicitacoes") as any)
                .select("*", { count: 'exact', head: true })
                .eq("empresa_id", empresa.id)
                .eq("status", "pendente");
            setSolicitationsCount(count || 0);
        };

        fetchCount();

        const channel = supabase
            .channel('sidebar-solicitacoes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'solicitacoes', filter: `empresa_id=eq.${empresa.id}` },
                () => fetchCount()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [empresa?.id]);

    const toggleMenu = (label: string) => {
        setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300" 
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed left-0 top-0 h-screen w-[260px] bg-sidebar-gradient flex flex-col z-50 shadow-xl transition-transform duration-300",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Logo & Close Button */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 mb-2 hover:bg-white/5 transition-colors">
                    <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer" onClick={onClose}>
                        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand-glow">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">Phone Smart</p>
                            <p className="text-white/50 text-xs">ERP v2.0</p>
                        </div>
                    </Link>
                    
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 scrollbar-none">
                <CompanySwitcher />
                {navItems.filter(item => !item.permission || can(item.permission as any)).map((item) => {
                    const Icon = item.icon;
                    const hasChildren = !!item.children;
                    const isParentActive = pathname.startsWith(item.href);
                    const isOpen = openMenus[item.label] || false;
                    const isActive = pathname === item.href;

                    const currentPlan = (profile?.plano ?? 'starter') as Plan;
                    
                    // Lógica de bloqueio: só bloqueia se o trial expirou E o plano não tem a feature
                    const showLock = item.feature && isTrialExpired && !hasFeature(currentPlan, item.feature, activeAddons);
                    const requiredPlan = item.feature ? getPlanForFeature(item.feature) : null;
                    const lockTitle = showLock ? `Disponível no plano ${PLAN_NAMES[requiredPlan!]}` : undefined;

                    return (
                        <div key={item.href} className="space-y-0.5" title={lockTitle}>
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={cn(
                                        "w-full sidebar-item",
                                        isParentActive && "bg-white/5 text-white",
                                        showLock && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {showLock ? (
                                        <span className="text-[10px] bg-white/10 px-1 rounded text-white/50">🔒</span>
                                    ) : (
                                        isOpen ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-white/40" size={14} />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-white/40" size={14} />
                                        )
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={showLock ? `/planos?upgrade=${item.feature}&from=${pathname}` : item.href}
                                    onClick={onClose}
                                    className={cn(
                                        "sidebar-item", 
                                        isActive && "active",
                                        showLock && "opacity-60"
                                    )}
                                >
                                    <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                                    <span className="flex-1">{item.label}</span>
                                    {showLock ? (
                                        <span className="text-[10px] bg-white/10 px-1 rounded text-white/50">🔒</span>
                                    ) : (
                                        <>
                                            {item.label === "Solicitações" && solicitationsCount > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse-subtle">
                                                    {solicitationsCount}
                                                </span>
                                            )}
                                            {isActive && (
                                                <ChevronRight className="w-3.5 h-3.5 text-white/40" size={14} />
                                            )}
                                        </>
                                    )}
                                </Link>
                            )}

                            {hasChildren && isOpen && !showLock && (
                                <div className="ml-9 space-y-0.5 border-l border-white/10 pl-2 mt-1">
                                    {(item.children || []).map((child: any) => {
                                        const isChildActive = pathname === child.href;
                                        const showChildLock = child.feature && isTrialExpired && !hasFeature(currentPlan, child.feature, activeAddons);
                                        const childRequiredPlan = child.feature ? getPlanForFeature(child.feature) : null;
                                        const childLockTitle = showChildLock ? `Disponível no plano ${PLAN_NAMES[childRequiredPlan!]}` : undefined;

                                        return (
                                            <Link
                                                key={child.href}
                                                href={showChildLock ? `/planos?upgrade=${child.feature}&from=${pathname}` : child.href}
                                                onClick={onClose}
                                                title={childLockTitle}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all",
                                                    isChildActive
                                                        ? "text-white bg-white/10 font-bold"
                                                        : "text-white/50 hover:text-white hover:bg-white/5",
                                                    showChildLock && "opacity-60"
                                                )}
                                            >
                                                <span>{child.label}</span>
                                                {showChildLock && <span className="text-[9px] opacity-40">🔒</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>


            {/* Plan badge */}
            <div className="px-4 py-4 border-t border-white/10">
                <Link
                    href="/planos"
                    className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between hover:bg-white/15 transition-all group"
                >
                    <div>
                        <p className="text-white/50 text-xs">Plano atual</p>
                        <p className="text-white text-sm font-semibold">
                            {isTrialExpired ? (
                                <span className="text-red-400">Expirado</span>
                            ) : (
                                PLAN_NAMES[empresa?.plano as Plan] || "Starter"
                            )}
                        </p>
                    </div>
                    <span className="text-xs text-brand-300 group-hover:text-white font-medium transition-colors">
                        {isTrialExpired ? "Renovar →" : "Upgrade →"}
                    </span>
                </Link>
            </div>
            </aside>
        </>
    );
}
