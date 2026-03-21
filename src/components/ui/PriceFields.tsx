"use client";
import { cn } from "@/utils/cn";

interface PriceFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency?: "BRL" | "USD";
  disabled?: boolean;
  highlight?: boolean;
  note?: string;
  className?: string;
}

export function PriceField({
  label, value, onChange, currency = "BRL",
  disabled, highlight, note, className,
}: PriceFieldProps) {
  const prefix = currency === "BRL" ? "R$" : "US$";

  const handleChange = (raw: string) => {
    // Aceita apenas números e formata como moeda
    const digits = raw.replace(/\D/g, "");
    if (!digits) { onChange("0,00"); return; }
    const num = parseInt(digits, 10);
    onChange((num / 100).toFixed(2).replace(".", ","));
  };

  return (
    <div className={cn("space-y-1", className)}>
      <label className={cn(
        "text-[10px] font-black uppercase tracking-wider block",
        highlight ? "text-emerald-600" : "text-slate-400"
      )}>
        {label}
        {note && <span className="ml-2 text-slate-300 font-normal normal-case">{note}</span>}
      </label>
      <div className="relative">
        <span className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none",
          highlight ? "text-emerald-500" : "text-slate-400"
        )}>
          {prefix}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "input-glass pl-9 w-full font-mono font-black text-right",
            highlight && "border-emerald-200 text-emerald-700 bg-emerald-50/30",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        />
      </div>
    </div>
  );
}

// Grupo de preços — custo + venda lado a lado
interface PriceGroupProps {
  costLabel?: string;
  saleLabel?: string;
  costValue: string;
  saleValue: string;
  onCostChange: (v: string) => void;
  onSaleChange: (v: string) => void;
  wholesaleValue?: string;
  onWholesaleChange?: (v: string) => void;
  disabled?: boolean;
  showMargin?: boolean;
}

export function PriceGroup({
  costLabel = "Preço de Custo",
  saleLabel = "Preço de Venda",
  costValue, saleValue,
  onCostChange, onSaleChange,
  wholesaleValue, onWholesaleChange,
  disabled, showMargin = true,
}: PriceGroupProps) {
  // Calcular margem
  const cost = parseFloat(costValue.replace(/\./g, "").replace(",", ".")) || 0;
  const sale = parseFloat(saleValue.replace(/\./g, "").replace(",", ".")) || 0;
  const margin = cost > 0 && sale > 0
    ? Math.round(((sale - cost) / cost) * 100)
    : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <PriceField
          label={costLabel}
          value={costValue}
          onChange={onCostChange}
          disabled={disabled}
        />
        <PriceField
          label={saleLabel}
          value={saleValue}
          onChange={onSaleChange}
          disabled={disabled}
          highlight
        />
      </div>
      {showMargin && margin !== null && (
        <div className={cn(
          "text-[10px] font-black text-right",
          margin >= 30 ? "text-emerald-600" :
          margin >= 10 ? "text-amber-600" : "text-red-500"
        )}>
          Margem: {margin}%
        </div>
      )}
      {onWholesaleChange && (
        <PriceField
          label="Preço Atacado (R$)"
          value={wholesaleValue || "0,00"}
          onChange={onWholesaleChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
