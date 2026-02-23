"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { type Usuario, type Empresa } from "@/types/database";
import { toast } from "sonner";

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    profile: Usuario | null;
    empresa: Empresa | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Usuario | null>(null);
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Stable Supabase client instance
    const [supabase] = useState(() => createClient());

    const fetchEmpresa = async (empresaId: string) => {
        try {
            const { data } = await (supabase.from("empresas") as any)
                .select("*")
                .eq("id", empresaId)
                .maybeSingle();
            if (data) setEmpresa(data as Empresa);
        } catch (err) {
            console.error("Error fetching empresa:", err);
        }
    };

    const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
        try {
            const { data, error } = await (supabase.from("usuarios") as any)
                .select("*")
                .eq("auth_user_id", userId)
                .maybeSingle();

            if (data) {
                setProfile(data);
                await fetchEmpresa(data.empresa_id);
                return;
            }

            if (!data && userEmail) {
                // Fallback: busca por email se auth_user_id não estiver vinculado
                const { data: rawEmailData, error: emailError } = await (supabase.from("usuarios") as any)
                    .select("*")
                    .eq("email", userEmail)
                    .maybeSingle();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const emailData = rawEmailData as any;

                if (emailData && !emailError) {
                    setProfile(emailData);
                    await fetchEmpresa(emailData.empresa_id);
                    if (!emailData.auth_user_id) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (supabase.from("usuarios") as any)
                            .update({ auth_user_id: userId })
                            .eq("id", emailData.id);
                    }
                    return;
                }

                // Auto-provisionar: usuário confirmou email mas empresa/perfil não existem
                // Isso acontece quando o Supabase exige confirmação de email
                try {
                    // 1. Tentar do localStorage
                    let pendingData: { nome?: string; nomeEmpresa?: string; email?: string; authUserId?: string } | null = null;

                    try {
                        const raw = localStorage.getItem("smartos_pending_signup");
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed.email === userEmail || parsed.authUserId === userId) {
                                pendingData = parsed;
                            }
                        }
                    } catch { /* localStorage pode não estar disponível */ }

                    // 2. Fallback: usar user_metadata do Supabase Auth (sempre disponível)
                    if (!pendingData) {
                        const { data: { user: authUser } } = await supabase.auth.getUser();
                        if (authUser?.user_metadata) {
                            pendingData = {
                                nome: authUser.user_metadata.nome || "Admin",
                                nomeEmpresa: authUser.user_metadata.nome_empresa || "Minha Empresa",
                                email: authUser.email,
                                authUserId: authUser.id,
                            };
                        }
                    }

                    if (pendingData) {
                        toast.info("Configurando sua nova empresa...");
                        console.log("[AuthContext] Auto-provisionando empresa e perfil para usuário confirmado...");

                        const nomeEmpresaFinal = pendingData.nomeEmpresa || `Loja de ${pendingData.nome || userEmail?.split('@')[0]}`;

                        const subdominio = nomeEmpresaFinal
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "-")
                            .replace(/-+/g, "-")
                            .replace(/^-|-$/g, "");

                        const { data: provisionData, error: provErr } = await (supabase as any).rpc('provision_new_company', {
                            p_nome_empresa: nomeEmpresaFinal,
                            p_subdominio: subdominio + "-" + Date.now().toString(36),
                            p_nome_usuario: pendingData.nome || "Admin",
                            p_email_usuario: userEmail,
                            p_auth_user_id: userId
                        });

                        if (provErr) {
                            console.error("[AuthContext] Erro no auto-provisionamento via RPC:", provErr);
                            toast.error("Erro ao configurar sua empresa no sistema inicial.");
                        }

                        if (provisionData && provisionData.length > 0) {
                            const { empresa_id: newEmpId, usuario_id: newUserId } = provisionData[0];

                            // Buscar os dados completos criados
                            const { data: userData } = await (supabase.from("usuarios") as any).select("*").eq("id", newUserId).maybeSingle();
                            const { data: empData } = await (supabase.from("empresas") as any).select("*").eq("id", newEmpId).maybeSingle();

                            if (userData && empData) {
                                setProfile(userData);
                                setEmpresa(empData as Empresa);
                                try { localStorage.removeItem("smartos_pending_signup"); } catch { }
                                console.log("[AuthContext] Auto-provisão concluída com sucesso!");
                                toast.success("Conta provisionada com sucesso!");
                                return;
                            }
                        } else {
                            toast.error("Erro ao configurar sua empresa no sistema inicial.");
                        }
                    }
                } catch (provisionErr) {
                    console.error("[AuthContext] Erro no auto-provisiona:", provisionErr);
                }

                console.error("Profile not found by ID or Email");
                setProfile(null);
                setEmpresa(null);
            } else {
                setProfile(null);
                setEmpresa(null);
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
            setProfile(null);
            setEmpresa(null);
        }
    }, [supabase]);

    useEffect(() => {
        let mounted = true;

        // Usar onAuthStateChange como fonte principal
        // O INITIAL_SESSION event é emitido primeiro com a sessão existente
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;

            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                await fetchProfile(newSession.user.id, newSession.user.email);
            } else {
                setProfile(null);
                setEmpresa(null);
            }

            setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setEmpresa(null);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id, user.email);
        }
    };

    const value = {
        user,
        session,
        profile,
        empresa,
        isLoading,
        signOut,
        refreshProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
// Build Trigger: Mon Feb 23 10:10:13 -04 2026
