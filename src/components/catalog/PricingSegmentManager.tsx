"use client";

import { useState } from "react";
import { Layers, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCatalogData } from "@/hooks/useCatalogData";
import { PricingSegmentCreateModal } from "./PricingSegmentCreateModal";
import { cn } from "@/utils/cn";

export function PricingSegmentManager() {
  const { segments, loading, refresh } = useCatalogData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSegments = segments.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const formatValue = (seg: any) => {
    const isPercent = seg.margin_type === 'percent' || seg.margin_type === 'porcentagem' || seg.margin_type === 'percentual';
    const val = seg.default_margin / 100;
    if (isPercent) return `${val}%`;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleEdit = (seg: any) => {
    setEditingSegment(seg);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSegment(null);
  };

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`Remover perfil "${name}"? Marcas vinculadas perderão o link.`)) return;
    
    setDeletingId(id);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('pricing_segments').delete().eq('id', id);
      if (error) throw error;
      toast.success("Perfil removido com sucesso");
      refresh();
    } catch (error: any) {
      console.error("Error deleting segment:", error);
      toast.error("Erro ao remover perfil.");
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
            name="search-profiles"
            autoComplete="off"
            placeholder="Buscar perfis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-glass pl-10 w-full"
          />
        </div>
        <button
          onClick={() => { setEditingSegment(null); setIsModalOpen(true); }}
          className="btn-primary"
        >
          <Plus size={18} />
          Novo Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && segments.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Loader2 className="animate-spin text-brand-500 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Carregando perfis...</p>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Layers className="text-slate-300 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Nenhum perfil encontrado</p>
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isPercent = seg.margin_type === 'percent' || seg.margin_type === 'porcentagem' || seg.margin_type === 'percentual';
            return (
              <div
                key={seg.id}
                onClick={() => handleEdit(seg)}
                className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-indigo-glow">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 tracking-tight text-lg">{seg.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase",
                          isPercent ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50"
                        )}>
                          {isPercent ? 'Margem %' : 'Margem R$'}
                        </span>
                      <span className="text-sm font-bold text-slate-700">
                        {formatValue(seg)}
                      </span>
                      {seg.requires_nf && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg uppercase">NF-e</span>
                      )}
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                        {seg.warranty_days || 0} Dias
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, seg.id, seg.name)}
                  disabled={deletingId === seg.id}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  {deletingId === seg.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      <PricingSegmentCreateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={refresh}
        editingSegment={editingSegment}
      />
    </div>
  );
}
