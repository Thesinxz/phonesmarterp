"use client";
import { logger } from "@/lib/logger";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";

export interface OnboardingStatus {
    completed: boolean;
    step: number;
    skipped: boolean;
}

export function useOnboardingStatus() {
    const { profile, isLoading: authLoading } = useAuth();
    const [status, setStatus] = useState<OnboardingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Se o Auth ainda está carregando, não tomamos nenhuma decisão
        if (authLoading) return;

        // Se o Auth terminou e não temos empresa_id, liberamos o loading
        // permitindo que o layout decida o que mostrar (provavelmente erro ou login)
        if (!profile?.empresa_id) {
            logger.log("[Onboarding] Auth finalizado sem empresa_id. Liberando layout.");
            setLoading(false);
            return;
        }

        const loadStatus = async () => {
            logger.log("[Onboarding] Carregando status remoto para empresa:", profile.empresa_id);
            try {
                // SELECT usa o client normal (leitura nunca travou)
                const { data, error } = await (supabase.from("configuracoes") as any)
                    .select("valor")
                    .eq("empresa_id", profile.empresa_id)
                    .eq("chave", "system_onboarding")
                    .maybeSingle();

                if (error) {
                    console.error("[Onboarding] Erro ao carregar status:", error);
                }

                if (data?.valor) {
                    logger.log("[Onboarding] Status carregado:", data.valor);
                    setStatus(data.valor as OnboardingStatus);
                } else {
                    logger.log("[Onboarding] Nenhum status encontrado, verificando papel do usuario...");
                    // Se o usuário não é admin, pulamos o onboarding automaticamente
                    if (profile?.papel && profile.papel !== 'admin') {
                        logger.log("[Onboarding] Usuário não é admin, pulando onboarding silenciosamente.");
                        setStatus({ completed: true, step: 8, skipped: true });
                    } else {
                        logger.log("[Onboarding] Usuário é admin, iniciando processo padrão.");
                        setStatus({ completed: false, step: 1, skipped: false });
                    }
                }
            } catch (err) {
                console.error("[Onboarding] Exceção ao carregar:", err);
                setStatus({ completed: false, step: 1, skipped: false });
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(() => {
            if (loading) {
                logger.log("[Onboarding] Carregamento lento. Liberando layout...");
                setLoading(false);
            }
        }, 3000);

        loadStatus();
        return () => clearTimeout(timeout);
    }, [profile?.empresa_id, authLoading]);

    const updateStatus = useCallback(async (newStatus: Partial<OnboardingStatus>) => {
        if (!profile?.empresa_id) {
            logger.warn("[Onboarding] updateStatus: empresa_id ausente, ignorando.");
            return;
        }
        logger.log("[Onboarding] updateStatus iniciado:", newStatus);

        try {
            const currentStatus = status || { completed: false, step: 1, skipped: false };
            const updated = { ...currentStatus, ...newStatus };

            // Atualizar localmente primeiro (otimistic)
            setStatus(updated);
            logger.log("[Onboarding] Estado local atualizado (otimisticamente):", updated);

            // Salvar via API Route (bypassa RLS e client issues)
            const res = await fetch("/api/onboarding/save-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresa_id: profile.empresa_id,
                    configs: [{
                        chave: "system_onboarding",
                        valor: updated
                    }]
                })
            });

            const data = await res.json();
            if (!res.ok) {
                console.error("[Onboarding] Erro ao salvar status:", data);
                throw new Error(data.error || "Erro ao salvar status");
            }

            logger.log("[Onboarding] Status salvo com sucesso:", updated);
        } catch (err) {
            console.error("[Onboarding] Erro ao atualizar status:", err);
            throw err;
        }
    }, [profile?.empresa_id, status]);

    const completeOnboarding = useCallback(async () => {
        await updateStatus({ completed: true, step: 8 });
    }, [updateStatus]);

    const skipOnboarding = useCallback(async () => {
        await updateStatus({ skipped: true, completed: true, step: 8 });
    }, [updateStatus]);

    // Real-time Sync across instances (DashboardLayout vs OnboardingWizard)
    useRealtimeSubscription({
        table: "configuracoes",
        filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : undefined,
        callback: (payload: any) => {
            if (payload.new && payload.new.chave === "system_onboarding") {
                logger.log("[Onboarding] Sincronização em tempo real recebida:", payload.new.valor);
                setStatus(payload.new.valor as OnboardingStatus);
            }
        }
    });

    return {
        status,
        loading,
        updateStatus,
        completeOnboarding,
        skipOnboarding
    };
}
