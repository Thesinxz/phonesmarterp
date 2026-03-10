"use client";
import { logger } from "@/lib/logger";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeOptions {
    table: string;
    filter?: string | null;
    callback: (payload: any) => void;
    enabled?: boolean;
}

export function useRealtimeSubscription({ table, filter, callback, enabled = true }: RealtimeOptions) {
    const callbackRef = useRef(callback);

    // Update ref when callback changes, without triggering useEffect
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        // Se enabled for explicitamente falso, ou se o filter está indefinido (ex: profile carregando)
        // Obs: Se filter for explicitamente null (sem filtro), nós permitimos. Mas undefined aborta.
        if (!enabled || filter === undefined) return;

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
                    filter: filter === null ? undefined : filter
                },
                (payload: any) => {
                    try {
                        callbackRef.current(payload);
                    } catch (err) {
                        console.error(`[Realtime] Error in callback for ${table}:`, err);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    logger.log(`[Realtime] ✅ Subscribed to ${table}${filter ? ` (${filter})` : ''}`);
                }
                if (status === 'CHANNEL_ERROR') {
                    console.warn(`[Realtime] ⚠ Canal ${table} indisponível (tabela pode não estar na publicação Realtime).`);
                }
                if (status === 'TIMED_OUT') {
                    console.error(`[Realtime] ⏰ Timeout for ${table}`);
                }
            });

        return () => {
            logger.log(`[Realtime] 🔌 Unsubscribing from ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, filter, enabled]);
}
