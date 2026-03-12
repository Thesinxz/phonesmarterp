"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FinanceConfigProvider } from "@/context/FinanceConfigContext";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useAuth } from "@/context/AuthContext";
import { TrialExpiredOverlay } from "@/components/trial/TrialExpiredOverlay";
import { DeactivatedOverlay } from "@/components/auth/DeactivatedOverlay";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status, loading: loadingOnboarding } = useOnboardingStatus();
    const { isTrialExpired, profile, isLoading: loadingAuth } = useAuth();

    const isDeactivated = profile && profile.ativo === false;
    const shouldShowOnboarding = !loadingOnboarding && status && !status.completed && !status.skipped;

    // ── Bloom Filter / Global Lock ──
    // Só bloqueamos com o spinner central se a autenticação básica ainda estiver pendente.
    // Uma vez que temos o perfil, permitimos que a estrutura do dashboard (sidebar/header)
    // seja montada para melhorar a percepção de performance (LCP).
    // Só bloqueamos com o spinner central se a autenticação básica ainda estiver pendente E não tivermos perfil.
    // Se o profile já existe (cacheado), permitimos que a estrutura seja montada.
    if (loadingAuth && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (shouldShowOnboarding) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <OnboardingWizard />
            </div>
        );
    }

    return (
        <FinanceConfigProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-slate-100">
                {isDeactivated && <DeactivatedOverlay />}
                {isTrialExpired && <TrialExpiredOverlay />}
                <Sidebar />
                <Header />
                <CommandPalette />
                <main className="ml-[260px] pt-16 min-h-screen">
                    <div className="p-6 animate-fade-in">{children}</div>
                </main>
            </div>
        </FinanceConfigProvider>
    );
}

