"use client";

import { Search, Bell, Plus, ShoppingCart, MapPin, ChevronDown, Menu, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { GlobalSearch } from "./GlobalSearch";

interface HeaderProps {
    title?: string;
    onMenuClick: () => void;
    className?: string;
}

export function Header({ title, onMenuClick, className }: HeaderProps) {
    const [unidade, setUnidade] = useState("Matriz");
    const [units, setUnits] = useState<any[]>([]);
    const [showUnits, setShowUnits] = useState(false);
    const [showCompanies, setShowCompanies] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [solicitationsCount, setSolicitationsCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const { user, profile, empresa, profiles, trialDaysLeft, isTrialExpired, maxEmpresas, canCreateEmpresa, switchUnit, switchCompany } = useAuth();
    const supabase = createClient();

    useEffect(() => {
        async function loadData() {
            try {
                // Load unit
                const { data: configData } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "nfe_emitente")
                    .maybeSingle();

                if (configData && (configData as any).valor?.municipio) {
                    const val = (configData as any).valor;
                    setUnidade(val.municipio + (val.uf ? ` - ${val.uf}` : ""));
                }

                // Load pending solicitations count
                if (profile?.empresa_id) {
                    const { count: sCount } = await (supabase.from("solicitacoes") as any)
                        .select("*", { count: 'exact', head: true })
                        .eq("empresa_id", profile.empresa_id)
                        .eq("status", "pendente");

                    setSolicitationsCount(sCount || 0);

                    const { count: nCount } = await (supabase.from("notifications") as any)
                        .select("*", { count: 'exact', head: true })
                        .eq("tenant_id", profile.empresa_id)
                        .is("read_at", null)
                        .or(`unit_id.is.null,unit_id.eq.${profile.unit_id}`)
                        .or(`user_id.is.null,user_id.eq.${profile.id}`);

                    setNotificationsCount(nCount || 0);
                }
                if (profile?.empresa_id) {
                    const { data: unitsData } = await supabase.from("units").select("*").eq("empresa_id", profile.empresa_id);
                    setUnits(unitsData || []);
                }
            } catch (error) {
                console.error("Error loading header data:", error);
            }
        }
        loadData();

        // Subscribe to changes in solicitacoes to update count in real-time
            if (profile?.empresa_id) {
                const sChannel = supabase
                    .channel('header-solicitacoes')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'solicitacoes', filter: `empresa_id=eq.${profile.empresa_id}` },
                        () => {
                            (supabase.from("solicitacoes") as any)
                                .select("*", { count: 'exact', head: true })
                                .eq("empresa_id", profile.empresa_id)
                                .eq("status", "pendente")
                                .then(({ count }: any) => setSolicitationsCount(count || 0));
                        }
                    )
                    .subscribe();

                const nChannel = supabase
                    .channel('header-notifications')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'notifications', filter: `tenant_id=eq.${profile.empresa_id}` },
                        () => {
                            (supabase.from("notifications") as any)
                                .select("*", { count: 'exact', head: true })
                                .eq("tenant_id", profile.empresa_id)
                                .is("read_at", null)
                                .or(`unit_id.is.null,unit_id.eq.${profile.unit_id}`)
                                .or(`user_id.is.null,user_id.eq.${profile.id}`)
                                .then(({ count }: any) => setNotificationsCount(count || 0));
                        }
                    )
                    .subscribe();

                return () => { 
                    supabase.removeChannel(sChannel); 
                    supabase.removeChannel(nChannel);
                };
            }
    }, [profile?.empresa_id, profile?.unit_id]);

    return (
        <header 
            className={cn(
                "fixed top-0 right-0 h-16 z-30 glass border-b border-white/40 px-4 md:px-6 flex items-center justify-between gap-4 transition-all duration-300",
                "left-0 lg:left-[260px]",
                className
            )}
        >
            {/* Left: Menu Toggle + Title or Search */}
            <div className="flex items-center gap-3 md:gap-6 flex-1">
                <button 
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-slate-600 hover:bg-slate-100/50 rounded-xl transition-colors lg:hidden"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {title && (
                    <h1 className="text-slate-800 font-bold text-sm md:text-lg whitespace-nowrap">{title}</h1>
                )}

                {/* Unit Selector - Hidden on very small screens */}
                <div className="hidden lg:relative lg:block">
                    <button 
                        onClick={() => setShowUnits(!showUnits)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-xl border border-slate-200/50 cursor-pointer hover:bg-white transition-all group"
                    >
                        <div className="w-5 h-5 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <MapPin size={12} className="text-brand-600" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none text-left">Unidade</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-700">
                                    {units.find(u => u.id === profile?.unit_id)?.name || (profile as any)?.unit?.name || unidade}
                                </span>
                                <ChevronDown size={10} className={cn("text-slate-400 group-hover:text-brand-600 transition-all", showUnits && "rotate-180")} />
                            </div>
                        </div>
                    </button>

                    {showUnits && units.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in fade-in slide-in-from-top-2">
                            <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alternar Unidade</p>
                            </div>
                            <div className="space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {units.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={async () => {
                                            setShowUnits(false);
                                            await switchUnit(u.id);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                                            profile?.unit_id === u.id 
                                                ? "bg-brand-50 text-brand-700 shadow-sm" 
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            profile?.unit_id === u.id ? "bg-brand-500 shadow-brand-glow" : "bg-slate-200"
                                        )} />
                                        <span className="text-xs font-semibold flex-1 text-left">{u.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <GlobalSearch />

                {/* Trial Badge - Only visible on desktop/tablets */}
                {profile?.plano === 'starter' && !isTrialExpired && (
                    <Link
                        href="/planos"
                        className={cn(
                            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold animate-in fade-in slide-in-from-left-2 transition-all hover:scale-105 active:scale-95",
                            trialDaysLeft <= 3
                                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-200/50 hover:bg-amber-100"
                                : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        )}
                    >
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            trialDaysLeft <= 3 ? "bg-amber-500 animate-pulse" : "bg-blue-500"
                        )} />
                        <span className="text-[10px] uppercase tracking-wider">
                            {trialDaysLeft === 0 ? "Teste Expira" : `${trialDaysLeft}d teste`}
                        </span>
                    </Link>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <Link
                    href="/os/nova"
                    className="btn-primary text-[10px] md:text-xs px-2 md:px-3 py-2"
                >
                    <Plus className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    <span className="hidden xs:inline">Nova OS</span>
                    <span className="xs:hidden">OS</span>
                </Link>
                <Link
                    href="/pdv"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-2 md:px-3 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-[10px] md:text-xs"
                >
                    <ShoppingCart className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    <span className="hidden xs:inline">Venda</span>
                </Link>

                {/* Notifications */}
                <Link
                    href="/solicitacoes"
                    className="relative w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/60 transition-colors"
                >
                    <Bell className="w-4 h-4 text-slate-600" />
                    {(solicitationsCount + notificationsCount) > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm ring-2 ring-red-500/20 animate-pulse">
                            {(solicitationsCount + notificationsCount) > 9 ? '9+' : (solicitationsCount + notificationsCount)}
                        </span>
                    )}
                </Link>

                <div
                    title={user?.email || "Perfil"}
                    className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xs md:text-sm font-bold cursor-pointer hover:bg-brand-600 transition-colors uppercase"
                >
                    {profile?.nome ? profile.nome.charAt(0) : (user?.email?.charAt(0) || "U")}
                </div>
            </div>

            {/* Switch Loading Overlay */}
            {isSwitching && (
                <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mb-4" />
                    <p className="text-brand-900 font-black uppercase tracking-widest text-[10px]">Alterando Empresa...</p>
                </div>
            )}
        </header>
    );
}
