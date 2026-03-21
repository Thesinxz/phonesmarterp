"use client";

import { useState } from "react";
import { ChevronDown, Plus, Tag } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCatalogData } from "@/hooks/useCatalogData";
import { BrandCreateModal } from "./BrandCreateModal";

interface Props {
  value: string;
  onChange: (value: string, brand?: any) => void;
  className?: string;
  allowCreate?: boolean;
  placeholder?: string;
}

export function BrandSelector({ value, onChange, className, allowCreate = true, placeholder = "Selecione uma marca..." }: Props) {
  const { brands, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
            <Tag size={16} />
          </div>
          <select
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              const brandObj = brands.find(b => b.id === val);
              onChange(val, brandObj);
            }}
            disabled={loading}
            className={cn(
              "input-glass w-full pl-10 pr-10 font-bold appearance-none transition-all",
              loading && "opacity-50 cursor-wait",
              !value && "text-slate-400"
            )}
          >
            <option value="">{placeholder}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
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
            className="w-10 h-10 flex items-center justify-center bg-brand-500 text-white rounded-xl shadow-brand-glow hover:bg-brand-600 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            title="Adicionar Nova Marca"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <BrandCreateModal
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
