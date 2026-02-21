"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Bell
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Ordens de Serviço",
        href: "/os",
        icon: ClipboardList,
    },
    {
        label: "Solicitações",
        href: "/solicitacoes",
        icon: Bell,
    },
    {
        label: "PDV",
        href: "/pdv",
        icon: ShoppingCart,
    },
    {
        label: "Pedidos",
        href: "/pedidos",
        icon: ClipboardCheck,
    },
    {
        label: "Vendas",
        href: "/vendas",
        icon: Receipt,
    },
    {
        label: "Clientes",
        href: "/clientes",
        icon: Users,
    },
    {
        label: "Estoque",
        href: "/estoque",
        icon: Package,
    },
    {
        label: "Financeiro",
        href: "/financeiro",
        icon: DollarSign,
        children: [
            { label: "Visão Geral", href: "/financeiro" },
            { label: "A Receber", href: "/financeiro/receber" },
            { label: "A Pagar", href: "/financeiro/pagar" },
            { label: "Caixa (PDV)", href: "/financeiro/caixa" },
            { label: "DRE Gerencial", href: "/financeiro/dre" },
        ]
    },
    {
        label: "Técnicos",
        href: "/tecnicos",
        icon: Wrench,
    },
    {
        label: "Relatórios",
        href: "/relatorios",
        icon: BarChart3,
    },
    {
        label: "Ferramentas",
        href: "/ferramentas",
        icon: Calculator,
        children: [
            { label: "Calculadora Inteligente", href: "/ferramentas/calculadora" },
            { label: "Cálculo em Massa", href: "/ferramentas/calculo-em-massa" },
            { label: "Importação iPhone", href: "/ferramentas/importacao" },
        ]
    },
    {
        label: "Fiscal",
        href: "/fiscal",
        icon: FileText,
    },
    {
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings,
        children: [
            { label: "Geral & Dados", href: "/configuracoes" },
            { label: "Etiquetas", href: "/configuracoes/etiquetas/a4" },
            { label: "Auditoria", href: "/configuracoes/auditoria" },
        ]
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { empresa, profile } = useAuth();
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
        <aside className="fixed left-0 top-0 h-screen w-[260px] bg-sidebar-gradient flex flex-col z-40 shadow-xl">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand-glow">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-white font-bold text-sm leading-tight">Phone Smart</p>
                    <p className="text-white/50 text-xs">ERP v2.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 scrollbar-none">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = !!item.children;
                    const isParentActive = pathname.startsWith(item.href);
                    const isOpen = openMenus[item.label] || false;

                    const isActive = pathname === item.href;

                    return (
                        <div key={item.href} className="space-y-0.5">
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleMenu(item.label)}
                                    className={cn(
                                        "w-full sidebar-item",
                                        isParentActive && "bg-white/5 text-white"
                                    )}
                                >
                                    <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-white/40" size={14} />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-white/40" size={14} />
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={cn("sidebar-item", isActive && "active")}
                                >
                                    <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                                    <span className="flex-1">{item.label}</span>
                                    {item.label === "Solicitações" && solicitationsCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse-subtle">
                                            {solicitationsCount}
                                        </span>
                                    )}
                                    {isActive && (
                                        <ChevronRight className="w-3.5 h-3.5 text-white/40" size={14} />
                                    )}
                                </Link>
                            )}

                            {hasChildren && isOpen && (
                                <div className="ml-9 space-y-0.5 border-l border-white/10 pl-2 mt-1">
                                    {item.children.map((child: any) => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all",
                                                pathname === child.href
                                                    ? "text-white bg-white/10 font-bold"
                                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {child.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>


            {/* Plan badge */}
            <div className="px-4 py-4 border-t border-white/10">
                <div className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <div>
                        <p className="text-white/50 text-xs">Plano atual</p>
                        <p className="text-white text-sm font-semibold capitalize">
                            {empresa?.plano || "Starter"}
                        </p>
                    </div>
                    <Link
                        href="/planos"
                        className="text-xs text-brand-300 hover:text-white font-medium transition-colors"
                    >
                        Upgrade →
                    </Link>
                </div>
            </div>
        </aside>
    );
}
