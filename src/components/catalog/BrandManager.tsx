"use client";

import { useState } from "react";
import { Tag, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCatalogData } from "@/hooks/useCatalogData";
import { BrandCreateModal } from "./BrandCreateModal";
import { cn } from "@/utils/cn";

export function BrandManager() {
  const { brands, segments, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Tem certeza que deseja remover a marca "${name}"?`)) return;
    
    setDeletingId(id);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      toast.success("Marca removida com sucesso");
      refresh();
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      toast.error("Erro ao remover marca. Verifique se existem produtos vinculados.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            name="search-brands"
            autoComplete="off"
            placeholder="Buscar marcas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-glass pl-10 w-full"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          Nova Marca
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && brands.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Carregando marcas...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Tag className="text-slate-300 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Nenhuma marca encontrada</p>
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight">{brand.name}</h4>
                    {brand.default_pricing_segment_id && (
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
                        {segments.find(s => s.id === brand.default_pricing_segment_id)?.name || "Perfil Vinculado"}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(brand.id, brand.name)}
                  disabled={deletingId === brand.id}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  {deletingId === brand.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BrandCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
