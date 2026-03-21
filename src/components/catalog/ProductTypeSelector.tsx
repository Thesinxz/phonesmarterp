"use client";

import { useState } from "react";
import { ChevronDown, Plus, Package } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCatalogData } from "@/hooks/useCatalogData";
import { ProductTypeCreateModal } from "./ProductTypeCreateModal";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowCreate?: boolean;
}

export function ProductTypeSelector({ value, onChange, className, allowCreate = true }: Props) {
  const { productTypes, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors pointer-events-none">
            <Package size={16} />
          </div>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            className={cn(
              "input-glass w-full pl-10 pr-10 font-bold appearance-none transition-all",
              loading && "opacity-50 cursor-wait",
              !value && "text-slate-400"
            )}
          >
            <option value="">Selecione o tipo de item...</option>
            {productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
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
            className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-xl shadow-amber-glow hover:bg-amber-600 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            title="Novo Tipo de Item"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <ProductTypeCreateModal
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
