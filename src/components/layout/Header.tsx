"use client";

import { Search, Bell, Plus, ShoppingCart, MapPin, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
    title?: string;
}

export function Header({ title }: HeaderProps) {
    const [unidade, setUnidade] = useState("Matriz");
    const { user, profile } = useAuth();
    const supabase = createClient();

    useEffect(() => {
        async function loadUnit() {
            try {
                const { data } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "nfe_emitente")
                    .single();

                if (data && (data as any).valor?.municipio) {
                    const val = (data as any).valor;
                    setUnidade(val.municipio + (val.uf ? ` - ${val.uf}` : ""));
                }
            } catch (error) {
                console.error("Error loading unit:", error);
            }
        }
        loadUnit();
    }, []);

    return (
        <header className="fixed top-0 right-0 left-[260px] h-16 z-30 glass border-b border-white/40 px-6 flex items-center justify-between gap-4">
            {/* Left: Title or Search */}
            <div className="flex items-center gap-6 flex-1">
                {title && (
                    <h1 className="text-slate-800 font-bold text-lg whitespace-nowrap">{title}</h1>
                )}

                {/* Unit Selector */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-xl border border-slate-200/50 cursor-pointer hover:bg-white transition-all group">
                    <div className="w-5 h-5 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <MapPin size={12} className="text-brand-600" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none">Unidade</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-700">{unidade}</span>
                            <ChevronDown size={10} className="text-slate-400 group-hover:text-brand-600 transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar OS, clientes, produtos..."
                        className="input-glass pl-9 h-9 text-sm"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Link
                    href="/os/nova"
                    className="btn-primary text-xs px-3 py-2"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Nova OS
                </Link>
                <Link
                    href="/pdv"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs"
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Nova Venda
                </Link>

                {/* Notifications */}
                <button className="relative w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/60 transition-colors">
                    <Bell className="w-4 h-4 text-slate-600" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Avatar */}
                <div
                    title={user?.email || "Perfil"}
                    className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-brand-600 transition-colors uppercase"
                >
                    {profile?.nome ? profile.nome.charAt(0) : (user?.email?.charAt(0) || "U")}
                </div>
            </div>
        </header>
    );
}
