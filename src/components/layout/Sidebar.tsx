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
    BarChart3,
    FileText,
    Settings,
    Zap,
    ChevronRight,
    ChevronDown,
    Calculator,
    ClipboardCheck,
    Bell,
    Shield,
    Megaphone,
    ShoppingBag,
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
    section?: string;
    children?: { label: string; href: string; feature?: Feature }[];
}

const navItems: NavItem[] = [
    // PRINCIPAL
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        section: "PRINCIPAL",
    },
    {
        label: "Ordens de Serviço",
        href: "/os",
        icon: ClipboardList,
        permission: "ordens_servico",
        section: "PRINCIPAL",
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
        feature: "os_garantias",
        section: "PRINCIPAL",
    },
    {
        label: "Solicitações",
        href: "/solicitacoes",
        icon: Bell,
        permission: "ordens_servico",
        section: "PRINCIPAL",
    },
    {
        label: "Vendas",
        href: "/vendas",
        icon: ShoppingCart,
        permission: "vendas",
        section: "PRINCIPAL",
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
        permission: "vendas",
        section: "PRINCIPAL",
    },
    // GESTÃO
    {
        label: "Estoque",
        href: "/estoque",
        icon: Package,
        permission: "estoque",
        section: "GESTÃO",
        children: [
            { label: "Produtos", href: "/estoque" },
            { label: "Películas & Acessórios", href: "/estoque/peliculas" },
            { label: "Peças (Assistência)", href: "/estoque/pecas", feature: "estoque_pecas" },
            { label: "Gestão de IMEIs", href: "/estoque/imeis", feature: "imei" },
        ]
    },
    {
        label: "Compras",
        href: "/compras",
        icon: ShoppingBag,
        permission: "estoque",
        section: "GESTÃO",
        children: [
            { label: "Listagem OCs", href: "/compras" },
            { label: "Nova Compra", href: "/compras/nova" },
            { label: "Fornecedores", href: "/fornecedores" },
        ]
    },
    {
        label: "Financeiro",
        href: "/financeiro",
        icon: DollarSign,
        permission: "financeiro",
        section: "GESTÃO",
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
        label: "Relatórios",
        href: "/relatorios",
        icon: BarChart3,
        permission: "financeiro",
        feature: "relatorios_avancados",
        section: "GESTÃO",
    },
    {
        label: "Marketing",
        href: "/marketing",
        icon: Megaphone,
        permission: "vendas",
        section: "GESTÃO",
        children: [
            { label: "Visão Geral", href: "/marketing" },
            { label: "Lista de Preços", href: "/marketing/lista-precos", feature: "marketing_pdf" },
            { label: "Pós-Venda", href: "/marketing/pos-venda", feature: "pos_venda_auto" },
            { label: "Templates", href: "/marketing/templates", feature: "marketing_pdf" },
            { label: "Campanhas", href: "/marketing/campanhas", feature: "marketing_campanhas" },
        ]
    },
    {
        label: "Equipe",
        href: "/equipe",
        icon: Shield,
        permission: "equipe",
        feature: "gestao_equipe",
        section: "GESTÃO",
        children: [
            { label: "Membros", href: "/equipe" },
            { label: "Metas de Vendas", href: "/equipe/metas" },
        ]
    },
    // FERRAMENTAS
    {
        label: "Ferramentas",
        href: "/ferramentas",
        icon: Calculator,
        permission: "estoque",
        section: "FERRAMENTAS",
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
        section: "FERRAMENTAS",
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
        section: "FERRAMENTAS",
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
    const { empresa, profile, isTrialExpired, activeAddons, trialDaysLeft } = useAuth();
    const { can } = usePermissions();
    const [solicitationsCount, setSolicitationsCount] = useState(0);
    const [osCount, setOsCount] = useState(0);
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
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

        const fetchCounts = async () => {
            const [{ count: sCount }, { count: oCount }] = await Promise.all([
                (supabase.from("solicitacoes") as any)
                    .select("*", { count: 'exact', head: true })
                    .eq("empresa_id", empresa.id)
                    .eq("status", "pendente"),
                supabase.from("ordens_servico")
                    .select("*", { count: 'exact', head: true })
                    .eq("status", "aberta"),
            ]);
            setSolicitationsCount(sCount || 0);
            setOsCount(oCount || 0);
        };

        fetchCounts();

        const channel = supabase
            .channel('sidebar-counts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'solicitacoes', filter: `empresa_id=eq.${empresa.id}` },
                () => fetchCounts()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ordens_servico' },
                () => fetchCounts()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [empresa?.id]);

    const toggleMenu = (label: string) => {
        setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // Group items by section
    const sections = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
        const section = item.section || "OUTROS";
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {});

    const sectionOrder = ["PRINCIPAL", "GESTÃO", "FERRAMENTAS"];

    const currentPlan = (profile?.plano ?? 'starter') as Plan;

    const getBadgeCount = (label: string): number => {
        if (label === "Solicitações") return solicitationsCount;
        if (label === "Ordens de Serviço") return osCount;
        return 0;
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200" 
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed left-0 top-0 h-screen w-[220px] bg-white flex flex-col z-50 transition-transform duration-300",
                "border-r border-[#E2E8F0]",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                {/* Logo */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E2E8F0', borderWidth: '0.5px' }}>
                    <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
                        <div className="w-7 h-7 rounded-md bg-[#1E40AF] flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-slate-800 font-semibold text-[13px] leading-tight">Phone Smart ERP</p>
                            <p className="text-slate-400 text-[10px]">v2.0</p>
                        </div>
                    </Link>
                    
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Company Selector */}
                <div className="px-2.5 pt-2.5 pb-1">
                    <CompanySwitcher />
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-1 overflow-y-auto scrollbar-none">
                    {sectionOrder.map(sectionName => {
                        const sectionItems = sections[sectionName];
                        if (!sectionItems) return null;

                        const filteredItems = sectionItems.filter(item => !item.permission || can(item.permission as any));
                        if (filteredItems.length === 0) return null;

                        return (
                            <div key={sectionName}>
                                <div className="nav-section-label">{sectionName}</div>
                                {filteredItems.map((item) => {
                                    const Icon = item.icon;
                                    const hasChildren = !!item.children;
                                    const isParentActive = pathname.startsWith(item.href);
                                    const isMenuOpen = openMenus[item.label] || false;
                                    const isActive = pathname === item.href;

                                    const showLock = item.feature && isTrialExpired && !hasFeature(currentPlan, item.feature, activeAddons);
                                    const requiredPlan = item.feature ? getPlanForFeature(item.feature) : null;
                                    const lockTitle = showLock ? `Disponível no plano ${PLAN_NAMES[requiredPlan!]}` : undefined;

                                    const badgeCount = getBadgeCount(item.label);

                                    return (
                                        <div key={item.href} title={lockTitle}>
                                            {hasChildren ? (
                                                <button
                                                    onClick={() => toggleMenu(item.label)}
                                                    className={cn(
                                                        "sidebar-item w-full",
                                                        isParentActive && "bg-slate-50 text-slate-700",
                                                        showLock && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <Icon size={14} />
                                                    <span className="flex-1 text-left">{item.label}</span>
                                                    {badgeCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[9px] font-medium px-1.5 py-px rounded-full">
                                                            {badgeCount}
                                                        </span>
                                                    )}
                                                    {showLock ? (
                                                        <span className="text-[10px] text-slate-400">🔒</span>
                                                    ) : (
                                                        isMenuOpen ? (
                                                            <ChevronDown className="w-3 h-3 text-slate-400" />
                                                        ) : (
                                                            <ChevronRight className="w-3 h-3 text-slate-400" />
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
                                                        showLock && "opacity-50"
                                                    )}
                                                >
                                                    <Icon size={14} />
                                                    <span className="flex-1">{item.label}</span>
                                                    {showLock ? (
                                                        <span className="text-[10px] text-slate-400">🔒</span>
                                                    ) : (
                                                        <>
                                                            {badgeCount > 0 && (
                                                                <span className="bg-red-500 text-white text-[9px] font-medium px-1.5 py-px rounded-full">
                                                                    {badgeCount}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </Link>
                                            )}

                                            {hasChildren && isMenuOpen && !showLock && (
                                                <div className="ml-8 space-y-px border-l border-slate-100 pl-2 mt-0.5 mb-1">
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
                                                                    "flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-all",
                                                                    isChildActive
                                                                        ? "text-[#1E40AF] bg-blue-50/50 font-semibold"
                                                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                                                                    showChildLock && "opacity-50"
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
                            </div>
                        );
                    })}
                </nav>

                {/* Footer: Plan Badge */}
                <div className="p-2.5 border-t" style={{ borderColor: '#E2E8F0', borderWidth: '0.5px' }}>
                    <Link
                        href="/planos"
                        className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-50 border border-blue-100 hover:bg-blue-100/70 transition-all"
                        style={{ borderWidth: '0.5px' }}
                    >
                        <div>
                            <p className="text-[10px] text-slate-500">
                                Plano {PLAN_NAMES[empresa?.plano as Plan] || "Starter"}
                                {!isTrialExpired && trialDaysLeft !== undefined && trialDaysLeft > 0 && (
                                    <span className="ml-1 text-[#1E40AF]">· {trialDaysLeft}d</span>
                                )}
                            </p>
                        </div>
                        <span className="text-[10px] text-[#1E40AF] font-medium">
                            {isTrialExpired ? "Renovar →" : "Upgrade →"}
                        </span>
                    </Link>
                </div>
            </aside>
        </>
    );
}
