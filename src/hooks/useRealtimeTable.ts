import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para escutar mudanças em tempo real em uma tabela do Supabase.
 * Executa o callback 'onchange' sempre que houver INSERT, UPDATE ou DELETE.
 */
export function useRealtimeTable(
  table: string,
  empresaId: string,
  onchange: () => void
) {
  const supabase = createClient()

  useEffect(() => {
    if (!empresaId) return

    // Criar canal para escutar mudanças na tabela filtradas pela empresa
    const channel = supabase
      .channel(`realtime:${table}:${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table,
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          console.log(`[Realtime] Mudança detectada na tabela ${table}. Recarregando dados...`)
          onchange()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, empresaId, onchange, supabase])
}
