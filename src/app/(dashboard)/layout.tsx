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
import { useState } from "react";
import { cn } from "@/utils/cn";
import { BottomNav } from "@/components/layout/BottomNav";
import { TrialBanner } from "@/components/layout/TrialBanner";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { status, loading: loadingOnboarding } = useOnboardingStatus();
    const { isTrialExpired, profile, isLoading: loadingAuth, trialDaysLeft } = useAuth();

    const isDeactivated = profile && profile.ativo === false;
    const shouldShowOnboarding = !loadingOnboarding && status && !status.completed && !status.skipped;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const hasBanner = profile?.plano === 'starter' && (isTrialExpired || trialDaysLeft <= 3);

    if (loadingAuth && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="w-8 h-8 border-3 border-blue-100 border-t-[#1E40AF] rounded-full animate-spin" />
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
            <div className="min-h-screen bg-[#F8FAFC]">
                <div className="fixed top-0 left-0 right-0 z-[60] lg:ml-[220px]">
                    <TrialBanner />
                </div>

                {isDeactivated && <DeactivatedOverlay />}
                {isTrialExpired && !hasBanner && <TrialExpiredOverlay />}
                
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <Header onMenuClick={() => setSidebarOpen(true)} className={cn(hasBanner && "top-12 sm:top-14")} />
                
                <CommandPalette />
                <BottomNav />
                
                <main className={cn(
                    "transition-all duration-300 min-h-screen pt-[52px] pb-20 md:pb-6",
                    "lg:ml-[220px]",
                    hasBanner && "pt-24 sm:pt-28"
                )}>
                    <div className="p-5 animate-fade-in">{children}</div>
                </main>
            </div>
        </FinanceConfigProvider>
    );
}
