"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Bell, X, User, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";
import { type Solicitacao } from "@/types/database";
import { marcarComoVisualizada } from "@/services/solicitacoes";

const supabase = createClient();

export function NotificationCenter() {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [latest, setLatest] = useState<any | null>(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        if (!profile) return;

        // 1. Listen for new solicitations
        const channel = supabase
            .channel("solicitacoes_realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "solicitacoes",
                },
                (payload) => {
                    const newNotif = payload.new as Solicitacao;

                    // Filter: if it's for everyone (atribuido_a null) or for this specific user
                    if (!newNotif.atribuido_a || newNotif.atribuido_a === profile.id ||
                        (newNotif.atribuido_a === "admin" && profile.papel === "admin")) {

                        setLatest(newNotif);
                        setShowPopup(true);
                        setNotifications(prev => [newNotif, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    if (!showPopup || !latest) return null;

    const prioridadeColors = {
        baixa: "bg-blue-500",
        media: "bg-emerald-500",
        alta: "bg-amber-500",
        urgente: "bg-red-500 animate-pulse"
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-scale-in">
                {/* Header */}
                <div className={cn("p-4 text-white flex items-center justify-between", prioridadeColors[latest.prioridade as keyof typeof prioridadeColors])}>
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="animate-bounce" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Novo Alerta Recebido</span>
                    </div>
                    <button onClick={() => setShowPopup(false)} className="hover:bg-black/10 p-1 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                            {latest.prioridade === 'urgente' ? <AlertTriangle className="text-red-500" /> : <Bell className="text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black text-slate-800 leading-tight">{latest.titulo}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase mt-1">
                                <User size={10} /> De: Sistema / Equipe
                                <span>•</span>
                                <Clock size={10} /> Agora
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                        "{latest.descricao}"
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={async () => {
                                await marcarComoVisualizada(latest.id);
                                setShowPopup(false);
                            }}
                            className="flex-1 bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                            Entendido / Marcar Lido
                        </button>
                    </div>
                </div>

                {latest.prioridade === 'urgente' && (
                    <div className="bg-red-50 p-3 text-center border-t border-red-100">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">⚠️ Responda ou resolva esta solicitação imediatamente!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
