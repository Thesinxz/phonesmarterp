"use client";

import { useState } from "react";
import { Package, Plus, Trash2, Search, Loader2, Smartphone, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCatalogData } from "@/hooks/useCatalogData";
import { ProductTypeCreateModal } from "./ProductTypeCreateModal";
import { cn } from "@/utils/cn";

export function ProductTypeManager() {
  const { productTypes, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTypes = productTypes.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remover tipo "${name}"?`)) return;
    
    setDeletingId(id);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('product_types').delete().eq('id', id);
      if (error) throw error;
      toast.success("Tipo de produto removido");
      refresh();
    } catch (error: any) {
      console.error("Error deleting product type:", error);
      toast.error("Erro ao remover tipo. Verifique se existem produtos vinculados.");
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
            name="search-types"
            autoComplete="off"
            placeholder="Buscar tipos..."
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
          Novo Tipo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && productTypes.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Carregando tipos...</p>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Package className="text-slate-300 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Nenhum tipo encontrado</p>
          </div>
        ) : (
          filteredTypes.map((type) => (
            <div
              key={type.id}
              className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-amber-glow">
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 tracking-tight text-lg">{type.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {type.show_imei && (
                         <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                           <Info size={10} /> IMEI
                         </span>
                       )}
                       {type.show_device_specs && (
                         <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                           <Smartphone size={10} /> Specs
                         </span>
                       )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(type.id, type.name)}
                  disabled={deletingId === type.id}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  {deletingId === type.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ProductTypeCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
