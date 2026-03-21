"use client";

import { useState } from "react";
import { ChevronDown, Plus, Layers } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCatalogData } from "@/hooks/useCatalogData";
import { PricingSegmentCreateModal } from "./PricingSegmentCreateModal";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowCreate?: boolean;
  placeholder?: string;
}

export function PricingSegmentSelector({ value, onChange, className, allowCreate = true, placeholder = "Selecione um perfil..." }: Props) {
  const { segments, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
            <Layers size={16} />
          </div>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            className={cn(
              "input-glass w-full pl-10 pr-10 font-bold appearance-none transition-all text-indigo-700",
              loading && "opacity-50 cursor-wait",
              !value && "text-slate-400"
            )}
          >
            <option value="">{placeholder}</option>
            {segments.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({ (s.margin_type === 'percent' || s.margin_type === 'porcentagem' || s.margin_type === 'percentual') ? `${s.default_margin}%` : `R$ ${(s.default_margin / 100).toFixed(2)}`})
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform duration-200">
            <ChevronDown size={16} />
          </div>
        </div>

        {allowCreate && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-indigo-500 text-white rounded-xl shadow-indigo-glow hover:bg-indigo-600 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title="Novo Perfil de Lucro"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <PricingSegmentCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(id) => {
          refresh();
          onChange(id);
        }}
      />
    </div>
  );
}
