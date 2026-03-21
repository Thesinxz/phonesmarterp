import { cn } from "@/utils/cn";

type StatusColor = "green" | "blue" | "amber" | "red" | "purple" | "slate" | "indigo";

interface StatusConfig {
  label: string;
  color: StatusColor;
}

// Mapeamentos de status por módulo
export const OS_STATUS: Record<string, StatusConfig> = {
  aberta:          { label: "Aberta",           color: "slate"  },
  em_transito:     { label: "Em Trânsito",      color: "blue"   },
  em_analise:      { label: "Em Análise",       color: "blue"   },
  aguardando_peca: { label: "Aguard. Peça",     color: "amber"  },
  em_execucao:     { label: "Em Execução",      color: "purple" },
  pronta:          { label: "Pronta",           color: "green"  },
  finalizada:      { label: "Finalizada",       color: "green"  },
  cancelada:       { label: "Cancelada",        color: "red"    },
};

export const COMPRA_STATUS: Record<string, StatusConfig> = {
  rascunho:  { label: "Rascunho",  color: "slate" },
  pendente:  { label: "Pendente",  color: "amber" },
  recebida:  { label: "Recebida",  color: "green" },
  cancelada: { label: "Cancelada", color: "red"   },
};

export const GARANTIA_STATUS: Record<string, StatusConfig> = {
  aberta:               { label: "Aberta",    color: "amber" },
  em_analise:           { label: "Em Análise", color: "blue"  },
  reparo_em_andamento:  { label: "Em Reparo",  color: "purple" },
  concluida:            { label: "Concluída", color: "green" },
  negada:               { label: "Negada",    color: "red"   },
  aprovada:             { label: "Aprovada",  color: "blue"  },
  resolvida:            { label: "Resolvida", color: "green" },
};

const COLOR_CLASSES: Record<StatusColor, string> = {
  green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue:   "bg-blue-50 text-blue-700 border-blue-100",
  amber:  "bg-amber-50 text-amber-700 border-amber-100",
  red:    "bg-red-50 text-red-700 border-red-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  slate:  "bg-slate-100 text-slate-600 border-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
};

interface Props {
  status: string;
  map?: Record<string, StatusConfig>;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, map, size = "sm", className }: Props) {
  const config = map?.[status];
  const color = config?.color || "slate";
  const label = config?.label || status;

  return (
    <span className={cn(
      "inline-flex items-center font-black uppercase tracking-wider border rounded-lg",
      size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1",
      COLOR_CLASSES[color],
      className
    )}>
      {label}
    </span>
  );
}
