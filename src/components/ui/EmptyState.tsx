import { type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { SearchX } from "lucide-react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 text-center",
      className
    )}>
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
        {icon || <SearchX size={24} />}
      </div>
      <h3 className="text-sm font-bold text-slate-700 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a
              href={action.href}
              className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-all"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
