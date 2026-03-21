"use client";
import { logger } from "@/lib/logger";
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface RealtimeContextProps {}
const RealtimeContext = createContext<RealtimeContextProps | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!profile?.empresa_id) return;

    const supabase = supabaseRef.current;
    const id = profile.empresa_id;

    logger.log("[RealtimeProvider] Iniciando canal para empresa:", id);

    const channel = supabase
      .channel(`app-realtime-${id}`)

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'configuracoes',
        filter: `empresa_id=eq.${id}`
      }, () => {
        logger.log("[Realtime] configuracoes alterada");
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ordens_servico',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] ordens_servico:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'os_parts',
        filter: `empresa_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'compras',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] compras:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'compra_itens',
        filter: `empresa_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'catalog_items',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] catalog_items:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'unit_stock',
        filter: `tenant_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'stock_movements',
        filter: `tenant_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clientes',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] clientes:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'financeiro_titulos',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] financeiro_titulos:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendas',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] vendas:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'venda_itens',
        filter: `empresa_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'fornecedores',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] fornecedores:", p.eventType);
        router.refresh();
      })

      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'warranty_claims',
        filter: `empresa_id=eq.${id}`
      }, () => router.refresh())

      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] nova notificação");
        router.refresh();
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log("[RealtimeProvider] Canal conectado:", `app-realtime-${id}`);
        }
        if (status === 'CHANNEL_ERROR') {
          logger.error("[RealtimeProvider] Erro no canal — verificar SQL ALTER PUBLICATION no Supabase.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.empresa_id, router]);

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
