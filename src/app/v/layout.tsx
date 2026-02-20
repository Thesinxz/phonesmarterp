import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "Vitrine Online | Phone Smart ERP",
    description: "Confira nossos produtos e preços — à vista no Pix e parcelado no cartão.",
    robots: "index, follow",
};

export default function VitrineLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {children}
        </div>
    );
}
