"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface OnboardingStatus {
    completed: boolean;
    step: number;
    skipped: boolean;
}

export function useOnboardingStatus() {
    const { profile } = useAuth();
    const [status, setStatus] = useState<OnboardingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!profile?.empresa_id) return;

        const loadStatus = async () => {
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
                    setStatus(data.valor as OnboardingStatus);
                } else {
                    setStatus({ completed: false, step: 1, skipped: false });
                }
            } catch (err) {
                console.error("[Onboarding] Exceção:", err);
                setStatus({ completed: false, step: 1, skipped: false });
            } finally {
                setLoading(false);
            }
        };

        loadStatus();
    }, [profile?.empresa_id]);

    const updateStatus = useCallback(async (newStatus: Partial<OnboardingStatus>) => {
        if (!profile?.empresa_id) {
            console.warn("[Onboarding] updateStatus: empresa_id ausente, ignorando.");
            return;
        }

        try {
            const currentStatus = status || { completed: false, step: 1, skipped: false };
            const updated = { ...currentStatus, ...newStatus };

            // Atualizar localmente primeiro (otimistic)
            setStatus(updated);

            // Salvar via API Route (bypassa RLS e client issues)
            const res = await fetch("/api/onboarding/save-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empresa_id: profile.empresa_id,
                    configs: [{
                        chave: "system_onboarding",
                        valor: updated,
                        is_secret: false,
                    }],
                }),
            });

            const data = await res.json();
            if (!data.success) {
                console.error("[Onboarding] Erro ao salvar status:", data);
                throw new Error(data.error || "Erro ao salvar status");
            }

            console.log("[Onboarding] Status salvo:", updated);
        } catch (err) {
            console.error("[Onboarding] Erro ao atualizar status:", err);
            throw err;
        }
    }, [profile?.empresa_id, status]);

    const completeOnboarding = useCallback(async () => {
        await updateStatus({ completed: true, step: 7 });
    }, [updateStatus]);

    const skipOnboarding = useCallback(async () => {
        await updateStatus({ skipped: true });
    }, [updateStatus]);

    return {
        status,
        loading,
        updateStatus,
        completeOnboarding,
        skipOnboarding
    };
}
