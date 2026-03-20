import { cn } from "@/utils/cn";

interface Props {
  qty: number;
  alertQty?: number;
  showUnit?: boolean;
}

export function StockBadge({ qty, alertQty = 1, showUnit = true }: Props) {
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-lg text-xs font-black",
      qty > alertQty ? "bg-emerald-50 text-emerald-600" :
      qty > 0 ? "bg-amber-50 text-amber-600" :
      "bg-red-50 text-red-600"
    )}>
      {qty}{showUnit ? ' un' : ''}
    </span>
  );
}
