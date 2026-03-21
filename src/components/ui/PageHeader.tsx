import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface Action {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  actions?: Action[];
  back?: { href: string; label?: string };
  onBack?: () => void;
  badge?: { label: string; color?: "blue" | "green" | "amber" | "red" | "slate" };
  className?: string;
  children?: ReactNode;  // slot para conteúdo extra (tabs, filtros)
}

const ACTION_STYLES: Record<NonNullable<Action["variant"]>, string> = {
  primary:   "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
  secondary: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
  danger:    "bg-white border border-red-200 text-red-500 hover:bg-red-50",
};

const BADGE_COLORS = {
  blue:  "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red:   "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

export function PageHeader({ title, subtitle, actions = [], back, onBack, badge, className, children }: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {(back || onBack) && (
            <button
              type="button"
              onClick={() => {
                if (onBack) onBack();
                else if (back) window.location.href = back.href;
              }}
              className="p-2 bg-white border border-slate-100 text-slate-400 hover:text-brand-500 hover:border-brand-100 rounded-2xl transition-all shadow-sm"
              aria-label={back?.label || "Voltar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight">{title}</h1>
              {badge && (
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                  BADGE_COLORS[badge.color || 'slate']
                )}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {actions.map((action, i) => {
              const cls = cn(
                "h-11 px-5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:active:scale-100",
                ACTION_STYLES[action.variant || "primary"]
              );
              return action.href ? (
                <a key={i} href={action.href} className={cls}>
                  {action.icon}{action.label}
                </a>
              ) : (
                <button
                  key={i}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cls}
                >
                  {action.icon}{action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
