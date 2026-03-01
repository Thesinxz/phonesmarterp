"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FinanceConfigProvider } from "@/context/FinanceConfigContext";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useAuth } from "@/context/AuthContext";
import { TrialExpiredOverlay } from "@/components/trial/TrialExpiredOverlay";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status, loading: loadingOnboarding } = useOnboardingStatus();
    const { isTrialExpired, isLoading: loadingAuth } = useAuth();

    const loading = loadingOnboarding || loadingAuth;

    // Show nothing while checking status to avoid flashing dashboard
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
            </div>
        );
    }

    const shouldShowOnboarding = status && !status.completed && !status.skipped;

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

