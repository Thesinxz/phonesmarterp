"use client";

import { useAuth } from "@/context/AuthContext";
import { Lock, LogOut, MessageCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DeactivatedOverlay() {
    const { signOut, profile } = useAuth();
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSupportPhone() {
            if (!profile?.empresa_id) {
                setLoading(false);
                return;
            }

            try {
                const supabase = createClient();
                const { data } = await (supabase.from("configuracoes") as any)
                    .select("valor")
                    .eq("empresa_id", profile.empresa_id)
                    .eq("chave", "nfe_emitente")
                    .maybeSingle();

                if (data?.valor?.telefone) {
                    setSupportPhone(data.valor.telefone.replace(/\D/g, ""));
                }
            } catch (e) {
                console.error("Erro ao buscar telefone de suporte:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchSupportPhone();
    }, [profile?.empresa_id]);

    const handleSignOut = async () => {
        console.log("[DEBUG-LOGOUT] Iniciando processo de saída...");
        try {
            // Criar um timeout de 2 segundos para o signOut oficial
            const logoutPromise = signOut();
            const timeout = new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 2000));

            console.log("[DEBUG-LOGOUT] Tentando limpar sessão...");
            await Promise.race([logoutPromise, timeout]);
            console.log("[DEBUG-LOGOUT] Sessão encerrada. Redirecionando...");
        } catch (e) {
            console.warn("[DEBUG-LOGOUT] Logout oficial demorou ou falhou, forçando redirecionamento.", e);
        } finally {
            // Limpar LocalStorage na mão por segurança extra
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/login";
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-500 delay-200">
                <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Conta Inativa</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Seu acesso a este sistema foi desativado pelo administrador da empresa.
                    Caso acredite que isso seja um erro, entre em contato com seu gestor.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => {
                            const phone = supportPhone || "55";
                            window.open(`https://wa.me/${phone}`, '_blank');
                        }}
                        className="w-full bg-slate-900 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <MessageCircle size={20} />}
                        Falar com Suporte
                    </button>

                    <button
                        onClick={handleSignOut}
                        className="w-full bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                </div>
            </div>
        </div>
    );
}
