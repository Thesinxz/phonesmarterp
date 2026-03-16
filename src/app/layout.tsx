import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { SWRegistration } from "@/components/layout/SWRegistration";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Phone Smart ERP | Gestão Inteligente para Assistências Técnicas",
        template: "%s | Phone Smart ERP",
    },
    description:
        "O sistema ERP mais completo para assistências de celulares. Gestão de OS, estoque com OCR, integração WhatsApp e Inteligência Artificial.",
    keywords: ["assistência técnica", "ERP celular", "gestão assistência", "ordem de serviço digital", "tesseract ocr estoque", "gestão financeira assistência"],
    authors: [{ name: "Phone Smart Team" }],
    openGraph: {
        type: "website",
        locale: "pt_BR",
        url: "https://phonesmart.com.br",
        title: "Phone Smart ERP - Gestão Inteligente para Assistências",
        description: "Automatize sua assistência técnica com IA e WhatsApp. Teste grátis!",
        siteName: "Phone Smart ERP",
    },
    twitter: {
        card: "summary_large_image",
        title: "Phone Smart ERP",
        description: "A revolução na gestão de assistências técnicas.",
    },
    robots: {
        index: true,
        follow: true,
    },
    manifest: "/manifest.json",
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR" className={inter.variable}>
            <body>
                <AuthProvider>
                    <RealtimeProvider>
                        <SWRegistration />
                        {children}
                        <NotificationCenter />
                        <Toaster position="top-right" richColors />
                    </RealtimeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

