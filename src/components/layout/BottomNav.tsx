"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    ShoppingCart, 
    ClipboardList, 
    DollarSign, 
    MoreHorizontal 
} from "lucide-react";
import { cn } from "@/utils/cn";

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { label: "Home", href: "/dashboard", icon: LayoutDashboard },
        { label: "OS", href: "/os", icon: ClipboardList },
        { label: "Vendas", href: "/vendas", icon: ShoppingCart },
        { label: "Financeiro", href: "/financeiro", icon: DollarSign },
        { label: "Mais", href: "#", isMenu: true, icon: MoreHorizontal },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-2">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                if (item.isMenu) {
                    return (
                        <button 
                            key={item.label}
                            onClick={() => {
                                // Trigger secondary menu or simply rely on the burger menu in Header
                                // For now, let's keep it simple or hook into the Sidebar toggle
                                const menuBtn = document.querySelector('header button');
                                if (menuBtn instanceof HTMLButtonElement) menuBtn.click();
                            }}
                            className="flex flex-col items-center gap-1 text-slate-400 p-2"
                        >
                            <Icon size={20} />
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        </button>
                    );
                }

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 p-2 transition-colors",
                            isActive ? "text-brand-600" : "text-slate-400"
                        )}
                    >
                        <Icon size={20} className={isActive ? "animate-pulse" : ""} />
                        <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        {isActive && <div className="w-1 h-1 rounded-full bg-brand-600 mt-0.5" />}
                    </Link>
                );
            })}
        </nav>
    );
}
