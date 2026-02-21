"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface RealtimeContextProps {
    // We can add global state here if needed, like connection status
}

const RealtimeContext = createContext<RealtimeContextProps | undefined>(undefined);

const supabase = createClient();

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth();

    useEffect(() => {
        if (!profile) return;

        console.log("[RealtimeProvider] Initializing global subscriptions for profile:", profile.id);

        // Global listeners could be added here
        // For example, if we want to listen for global system alerts or specific company-wide events

        const channel = supabase
            .channel(`global-events-${profile.empresa_id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "configuracoes", // Example: listen for setting changes
                },
                (payload) => {
                    console.log("[RealtimeProvider] Settings change detected:", payload);
                    // toast.info("Configurações atualizadas!");
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("[RealtimeProvider] Subscribed to global events");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    return (
        <RealtimeContext.Provider value={{}}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error("useRealtime must be used within a RealtimeProvider");
    }
    return context;
}
