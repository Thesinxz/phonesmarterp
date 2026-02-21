import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FinanceConfigProvider } from "@/context/FinanceConfigContext";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <FinanceConfigProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-slate-100">
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

