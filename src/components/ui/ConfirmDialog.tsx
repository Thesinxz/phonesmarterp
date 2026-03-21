"use client";
import { type ReactNode, useState, useCallback } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm, onCancel, loading,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6 space-y-3">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            variant === "danger" ? "bg-red-50" :
            variant === "warning" ? "bg-amber-50" : "bg-slate-50"
          )}>
            {variant === "danger"
              ? <Trash2 size={22} className="text-red-500" />
              : <AlertTriangle size={22} className={variant === "warning" ? "text-amber-500" : "text-slate-400"} />
            }
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 h-11 rounded-2xl text-white text-sm font-bold transition-all disabled:opacity-50",
              variant === "danger" ? "bg-red-500 hover:bg-red-600" :
              variant === "warning" ? "bg-amber-500 hover:bg-amber-600" :
              "bg-brand-500 hover:bg-brand-600"
            )}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook para uso imperativo (substitui window.confirm())
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant?: "danger" | "warning" | "default";
    resolve?: (confirmed: boolean) => void;
  }>({ open: false, title: '' });

  const confirm = useCallback((
    title: string,
    description?: string,
    variant?: "danger" | "warning" | "default"
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, title, description, variant, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, open: false }));
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, open: false }));
  }, [state]);

  const Dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, Dialog };
}
