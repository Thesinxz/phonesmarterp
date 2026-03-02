"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { type Usuario, type Empresa } from "@/types/database";
import { toast } from "sonner";
import { getUsuarioEmpresas, setUltimaEmpresaAcessada, type CompanyLink } from "@/services/empresa_vinculos";
import { subscribeToPush } from "@/lib/pushNotifications";

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    profile: Usuario | null;
    empresa: Empresa | null;
    userCompanies: CompanyLink[];
    isLoading: boolean;
    isTrialExpired: boolean;
    trialDaysLeft: number;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    switchCompany: (empresaId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Usuario | null>(null);
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [userCompanies, setUserCompanies] = useState<CompanyLink[]>([]);
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
            // 1. Buscar vínculos de empresa
            const companies = await getUsuarioEmpresas(userId);
            setUserCompanies(companies);

            // 2. Buscar Perfil Base
            const { data, error } = await (supabase.from("usuarios") as any)
                .select("*")
                .eq("auth_user_id", userId)
                .maybeSingle();

            if (data) {
                console.log("[AuthContext] Profile found by auth_user_id:", userId);
                setProfile(data);

                // Determinar qual empresa carregar inicialmente
                const preferredId = data.ultimo_acesso_empresa_id;
                const activeLink = companies.find(c => c.empresa_id === preferredId) || companies[0];

                if (activeLink) {
                    setEmpresa(activeLink.empresa);
                    // Se o perfil principal tem um empresa_id fixo, ele deve bater com a ativa em sistemas legados
                    // mas em multi-company, a ativa pode variar.
                } else if (data.empresa_id) {
                    await fetchEmpresa(data.empresa_id);
                }

                return;
            }

            if (!data && userEmail) {
                // 1. Tentar reivindicar um convite pendente legado por e-mail (fallback para quem não usou link)
                try {
                    const { data: claimData, error: claimError } = await (supabase as any).rpc('claim_user_profile', {
                        p_email_usuario: userEmail
                    });

                    if (!claimError && claimData && claimData.success) {
                        console.log("[AuthContext] Perfil pendente reivindicado com sucesso!", claimData);
                        return fetchProfile(userId, userEmail);
                    }
                } catch (e) {
                    console.error("[AuthContext] Erro ao tentar reivindicar perfil:", e);
                }

                // 2. Auto-provisão (Se o usuário não foi vinculado pelo Trigger nem reivindicou perfil)
                if (companies.length === 0) {
                    console.log("[AuthContext] Nenhum vínculo encontrado, iniciando auto-provisão de uma NOVA empresa...");

                    let pendingData: any = null;
                    try {
                        const raw = localStorage.getItem("smartos_pending_signup");
                        if (raw) pendingData = JSON.parse(raw);
                    } catch { }

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
                        const { data: provisionData, error: provErr } = await (supabase as any).rpc('provision_new_company', {
                            p_nome_empresa: pendingData.nomeEmpresa || "Minha Empresa",
                            p_subdominio: (pendingData.nomeEmpresa || "empresa").toLowerCase().replace(/\s+/g, '-') + "-" + Date.now().toString(36),
                            p_nome_usuario: pendingData.nome || "Admin",
                            p_email_usuario: userEmail,
                            p_auth_user_id: userId
                        });

                        if (!provErr && provisionData && provisionData.length > 0) {
                            const { empresa_id: newEmpId, usuario_id: newUserId } = provisionData[0];
                            const { data: userData } = await (supabase.from("usuarios") as any).select("*").eq("id", newUserId).single();
                            const { data: empData } = await (supabase.from("empresas") as any).select("*").eq("id", newEmpId).single();
                            if (userData && empData) {
                                setProfile(userData);
                                setEmpresa(empData as Empresa);
                                refreshProfile(); // Recarrega para pegar os vínculos novos
                                return;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        let mounted = true;

        // ── FIX: Resolver sessão PROATIVAMENTE do storage/cookie ──
        // getSession() lê instantaneamente do localStorage, enquanto
        // onAuthStateChange depende de um listener assíncrono que pode
        // disparar com delay. Isso garante que a sessão esteja pronta
        // ANTES de qualquer página tentar fazer queries via RLS.
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            if (!mounted) return;
            if (initialSession?.user) {
                setSession(initialSession);
                setUser(initialSession.user);
                fetchProfile(initialSession.user.id, initialSession.user.email);
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mounted) return;
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
                await fetchProfile(newSession.user.id, newSession.user.email);
            } else {
                setProfile(null);
                setEmpresa(null);
                setUserCompanies([]);
            }
            setIsLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    // Registrar Push Notifications quando o perfil carregar
    useEffect(() => {
        if (profile && empresa && user) {
            // Pequeno delay para garantir que o SW esteja pronto
            const timeout = setTimeout(() => {
                subscribeToPush(profile.id, empresa.id);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [profile, empresa, user]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setEmpresa(null);
        setUserCompanies([]);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id, user.email);
    };

    const switchCompany = async (empresaId: string) => {
        const targetLink = userCompanies.find(c => c.empresa_id === empresaId);
        if (!targetLink || !user) {
            toast.error("Você não tem acesso a esta empresa.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Atualizar persistência de última empresa
            await setUltimaEmpresaAcessada(user.id, empresaId);

            // 2. Atualizar estado local
            setEmpresa(targetLink.empresa);

            // 3. Opcional: Recarregar perfil para garantir que campos fixos (como papel)
            // reflitam o vínculo desta empresa se necessário.
            // Por enquanto atualizamos apenas a empresa ativa.

            toast.success(`Contexto alterado para: ${targetLink.empresa.nome}`);

            // Redirecionar para dashboard para "limpar" estados de páginas anteriores
            window.location.href = "/dashboard";
        } catch (e) {
            toast.error("Erro ao trocar de empresa.");
        } finally {
            setIsLoading(false);
        }
    };

    // Lógica de Trial (14 dias)
    let isTrialExpired = false;
    let trialDaysLeft = 0;

    if (empresa && empresa.plano === 'starter') {
        const creationDate = new Date(empresa.created_at);
        const expirationDate = new Date(creationDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        const now = new Date();

        trialDaysLeft = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        isTrialExpired = now > expirationDate;
    }

    const value = {
        user,
        session,
        profile,
        empresa,
        userCompanies,
        isLoading,
        isTrialExpired,
        trialDaysLeft,
        signOut,
        refreshProfile,
        switchCompany
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
