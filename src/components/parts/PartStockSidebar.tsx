"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Wrench, Clock, AlertTriangle, Package } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";

interface Props {
  catalogItemId?: string;
  costPrice: number;
  salePrice: number;
  currentQty: number;
  minQty: number;
  avgCost?: number;
}

interface UsageStats {
  total_used: number;
  total_qty_used: number;
  last_used_at: string | null;
  os_count: number;
}

export function PartStockSidebar({
  catalogItemId, costPrice, salePrice,
  currentQty, minQty, avgCost,
}: Props) {
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    if (!catalogItemId) return;
    const supabase = createClient();
    (supabase
      .from('vw_part_usage')
      .select('*')
      .eq('catalog_item_id', catalogItemId)
      .maybeSingle() as any)
      .then(({ data }: any) => setUsage(data));
  }, [catalogItemId]);

  const margin = costPrice > 0 && salePrice > 0
    ? Math.round(((salePrice - costPrice) / costPrice) * 100)
    : null;

  const isLowStock = currentQty <= minQty && minQty > 0;

  return (
    <div className="space-y-4">
      <GlassCard title="Estoque" icon={Package}>
        <div className="space-y-3">
          <div className={cn(
            "text-center py-3 rounded-2xl",
            isLowStock ? "bg-red-50 border border-red-100" : "bg-slate-50"
          )}>
            <p className={cn(
              "text-4xl font-black",
              isLowStock ? "text-red-500" : "text-slate-800"
            )}>
              {currentQty}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              {isLowStock ? "Estoque baixo!" : "Unidades"}
            </p>
          </div>

          {isLowStock && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-[10px] text-amber-700 font-bold">
                Mínimo: {minQty} un · Repor agora
              </p>
            </div>
          )}

          {avgCost && avgCost > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Custo médio</span>
              <span className="font-black text-slate-700">
                R$ {(avgCost / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {margin !== null && (
        <GlassCard title="Precificação" icon={TrendingUp}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Margem</span>
              <span className={cn(
                "text-lg font-black",
                margin >= 30 ? "text-emerald-600" :
                margin >= 15 ? "text-amber-600" : "text-red-500"
              )}>
                {margin}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  margin >= 30 ? "bg-emerald-500" :
                  margin >= 15 ? "bg-amber-400" : "bg-red-400"
                )}
                style={{ width: `${Math.min(margin, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Custo: R$ {(costPrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>Venda: R$ {(salePrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </GlassCard>
      )}

      {catalogItemId && (
        <GlassCard title="Uso em OS" icon={Wrench}>
          {usage ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-black text-slate-800">{usage.os_count}</p>
                  <p className="text-[10px] text-slate-400">OS usadas</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-black text-slate-800">{usage.total_qty_used}</p>
                  <p className="text-[10px] text-slate-400">Unid. totais</p>
                </div>
              </div>
              {usage.last_used_at && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} />
                  Último uso: {new Date(usage.last_used_at).toLocaleDateString('pt-BR')}
                </div>
              )}
              <a
                href={`/os?peca=${catalogItemId}`}
                className="text-[11px] text-brand-500 hover:underline block text-center"
              >
                Ver OS com esta peça →
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">
              Nenhuma OS registrada ainda.
            </p>
          )}
        </GlassCard>
      )}
    </div>
  );
}
