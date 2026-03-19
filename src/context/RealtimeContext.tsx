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

      // Configurações
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'configuracoes'
      }, () => router.refresh())

      // Ordens de Serviço
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ordens_servico',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] ordens_servico:", p.eventType);
        router.refresh();
      })

      // Compras
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'compras',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] compras:", p.eventType);
        router.refresh();
      })

      // Estoque / Catálogo
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'catalog_items',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] catalog_items:", p.eventType);
        router.refresh();
      })

      // Clientes
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clientes',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] clientes:", p.eventType);
        router.refresh();
      })

      // Financeiro
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'financeiro',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] financeiro:", p.eventType);
        router.refresh();
      })

      // Vendas
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendas',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] vendas:", p.eventType);
        router.refresh();
      })

      // Fornecedores
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'fornecedores',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] fornecedores:", p.eventType);
        router.refresh();
      })

      // Garantias
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'warranty_claims',
        filter: `tenant_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] warranty_claims:", p.eventType);
        router.refresh();
      })

      // Notificações
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `empresa_id=eq.${id}`
      }, (p) => {
        logger.log("[Realtime] notifications:", p.eventType);
        router.refresh();
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.log("[RealtimeProvider] Canal conectado:", `app-realtime-${id}`);
        }
        if (status === 'CHANNEL_ERROR') {
          logger.error("[RealtimeProvider] Erro no canal realtime — verificar SQL de publicação.");
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
