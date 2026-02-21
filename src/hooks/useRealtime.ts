"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeOptions {
    table: string;
    filter?: string;
    callback: (payload: any) => void;
}

export function useRealtimeSubscription({ table, filter, callback }: RealtimeOptions) {
    useEffect(() => {
        const supabase = createClient();
        const channelId = `realtime-${table}-${filter || 'all'}-${Math.random().toString(36).substring(7)}`;

        const channel = supabase
            .channel(channelId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: table,
                    filter: filter
                },
                (payload: any) => {
                    callback(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, filter, callback]);
}
