"use client";
import { useState } from "react";
import { ChevronDown, Plus, FolderOpen } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCatalogCategories, type CatalogCategory } from "@/hooks/useCatalogCategories";
import { CategoryCreateModal } from "./CategoryCreateModal";

interface Props {
  value: string;
  onChange: (id: string) => void;
  itemType?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  onCreateRequest?: () => void;
  placeholder?: string;
}

function CategoryOption({ cat, depth = 0 }: { cat: CatalogCategory; depth?: number }) {
  return (
    <>
      <option value={cat.id}>
        {'　'.repeat(depth)}{depth > 0 ? '└ ' : ''}{cat.nome}
      </option>
      {cat.children?.map(child => (
        <CategoryOption key={child.id} cat={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function CategorySelector({
  value, onChange, itemType, disabled, allowCreate, onCreateRequest, placeholder
}: Props) {
  const { tree, loading } = useCatalogCategories(itemType);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex gap-2 w-full">
      <div className="relative flex-1">
        <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className={cn(
            "input-glass pl-9 w-full appearance-none",
            disabled && "opacity-60"
          )}
        >
          <option value="">
            {loading ? "Carregando..." : (placeholder || "Sem categoria")}
          </option>
          {tree.map(cat => (
            <CategoryOption key={cat.id} cat={cat} />
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {allowCreate && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all shrink-0"
          title="Nova categoria"
        >
          <Plus size={16} />
        </button>
      )}

      {isModalOpen && (
        <CategoryCreateModal 
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultItemType={itemType}
          onSuccess={(id) => {
            onChange(id);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
