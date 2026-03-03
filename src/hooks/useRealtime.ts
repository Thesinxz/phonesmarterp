"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeOptions {
    table: string;
    filter?: string;
    callback: (payload: any) => void;
}

export function useRealtimeSubscription({ table, filter, callback }: RealtimeOptions) {
    const callbackRef = useRef(callback);

    // Update ref when callback changes, without triggering useEffect
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

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
                    callbackRef.current(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] Subscribed to ${table}${filter ? ` (${filter})` : ''}`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error(`[Realtime] Channel error for ${table}`);
                }
                if (status === 'TIMED_OUT') {
                    console.error(`[Realtime] Timeout for ${table}`);
                }
            });

        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, filter]); // Removed callback from dependencies
}
