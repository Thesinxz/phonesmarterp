"use client";

import { Search, Bell, Plus, ShoppingCart, MapPin, ChevronDown, Menu } from "lucide-react";
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
    const [isSwitching, setIsSwitching] = useState(false);
    const [solicitationsCount, setSolicitationsCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const { user, profile, empresa, trialDaysLeft, isTrialExpired, switchUnit } = useAuth();
    const supabase = createClient();

    useEffect(() => {
        async function loadData() {
            try {
                const { data: configData } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "nfe_emitente")
                    .maybeSingle();

                if (configData && (configData as any).valor?.municipio) {
                    const val = (configData as any).valor;
                    setUnidade(val.municipio + (val.uf ? ` - ${val.uf}` : ""));
                }

                if (profile?.empresa_id) {
                    const { count: sCount } = await (supabase.from("solicitacoes") as any)
                        .select("*", { count: 'exact', head: true })
                        .eq("empresa_id", profile.empresa_id)
                        .eq("status", "pendente");

                    setSolicitationsCount(sCount || 0);

                    const unitFilter = profile?.unit_id ? `unit_id.is.null,unit_id.eq.${profile.unit_id}` : `unit_id.is.null`;
                    const userFilter = profile?.id ? `user_id.is.null,user_id.eq.${profile.id}` : `user_id.is.null`;

                    const { count: nCount } = await (supabase.from("notifications") as any)
                        .select("*", { count: 'exact', head: true })
                        .eq("tenant_id", profile.empresa_id)
                        .is("read_at", null)
                        .or(unitFilter)
                        .or(userFilter);

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
                        const unitFilter = profile?.unit_id ? `unit_id.is.null,unit_id.eq.${profile.unit_id}` : `unit_id.is.null`;
                        const userFilter = profile?.id ? `user_id.is.null,user_id.eq.${profile.id}` : `user_id.is.null`;

                        (supabase.from("notifications") as any)
                            .select("*", { count: 'exact', head: true })
                            .eq("tenant_id", profile.empresa_id)
                            .is("read_at", null)
                            .or(unitFilter)
                            .or(userFilter)
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

    const totalNotifications = solicitationsCount + notificationsCount;

    return (
        <header 
            className={cn(
                "fixed top-0 right-0 h-[52px] z-30 bg-white px-5 flex items-center gap-3 transition-all duration-300",
                "left-0 lg:left-[220px]",
                className
            )}
            style={{ borderBottom: '0.5px solid #E2E8F0' }}
        >
            {/* Left: Menu + Unit Selector */}
            <div className="flex items-center gap-3 flex-1">
                <button 
                    onClick={onMenuClick}
                    className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors lg:hidden"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Unit Selector — pill shape */}
                <div className="hidden lg:relative lg:block">
                    <button 
                        onClick={() => setShowUnits(!showUnits)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all hover:border-slate-300"
                        style={{ border: '0.5px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}
                    >
                        <div className="w-[6px] h-[6px] rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-600">
                            {units.find(u => u.id === profile?.unit_id)?.name || (profile as any)?.unit?.name || unidade}
                        </span>
                        <ChevronDown size={10} className={cn("text-slate-400 transition-transform", showUnits && "rotate-180")} />
                    </button>

                    {showUnits && units.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-lg p-1.5 z-[100] animate-in fade-in slide-in-from-top-2" style={{ border: '0.5px solid #E2E8F0' }}>
                            <div className="px-2.5 py-1.5 border-b border-slate-50 mb-1">
                                <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Alternar Unidade</p>
                            </div>
                            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                                {units.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={async () => {
                                            setShowUnits(false);
                                            await switchUnit(u.id);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all text-xs",
                                            profile?.unit_id === u.id 
                                                ? "bg-blue-50 text-[#1E40AF] font-medium" 
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-[6px] h-[6px] rounded-full",
                                            profile?.unit_id === u.id ? "bg-[#1E40AF]" : "bg-slate-200"
                                        )} />
                                        <span className="flex-1 text-left">{u.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Global Search */}
                <GlobalSearch />

                {/* Trial Badge */}
                {profile?.plano === 'starter' && !isTrialExpired && (
                    <Link
                        href="/planos"
                        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-80"
                        style={{ 
                            background: '#EFF6FF', 
                            border: '0.5px solid #BFDBFE', 
                            color: '#1D4ED8', 
                            fontSize: '11px' 
                        }}
                    >
                        {trialDaysLeft === 0 ? "Teste expira hoje" : `${trialDaysLeft}d teste`}
                    </Link>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
                <Link
                    href="/os/nova"
                    className="btn-primary"
                >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">Nova OS</span>
                </Link>
                <Link
                    href="/pdv"
                    className="btn-secondary"
                >
                    <ShoppingCart className="w-3 h-3" />
                    <span className="hidden sm:inline">PDV</span>
                </Link>

                {/* Notifications */}
                <Link
                    href="/solicitacoes"
                    className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-500"
                    style={{ border: '0.5px solid #E2E8F0' }}
                >
                    <Bell className="w-3.5 h-3.5" />
                    {totalNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center px-1 border-2 border-white">
                            {totalNotifications > 9 ? '9+' : totalNotifications}
                        </span>
                    )}
                </Link>

                {/* User Avatar */}
                <div
                    title={user?.email || "Perfil"}
                    className="w-[30px] h-[30px] rounded-full bg-[#1E40AF] flex items-center justify-center text-white text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity uppercase"
                >
                    {profile?.nome ? profile.nome.charAt(0) : (user?.email?.charAt(0) || "U")}
                </div>
            </div>

            {/* Switch Loading Overlay */}
            {isSwitching && (
                <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="w-12 h-12 border-3 border-blue-100 border-t-[#1E40AF] rounded-full animate-spin mb-4" />
                    <p className="text-slate-600 font-medium text-xs uppercase tracking-widest">Alterando Empresa...</p>
                </div>
            )}
        </header>
    );
}
