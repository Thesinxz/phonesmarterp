"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Package, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PartCard } from "./PartCard";
import { useAuth } from "@/context/AuthContext";

interface ModelPartsPopupProps {
  modelo: string;
  onAdd: (part: any, qty: number) => void;
  onClose: () => void;
  addedParts: any[];
}

const categoryLabels: Record<string, string> = {
  frontal: 'Frontal / Tela',
  bateria: 'Bateria',
  conector_carga: 'Conector de Carga',
  tampa_traseira: 'Tampa Traseira',
  camera: 'Câmera',
  botoes: 'Botões',
  alto_falante: 'Alto-falante',
  microfone: 'Microfone',
  placa: 'Placa / Mãe',
  outros: 'Outros',
};

export function ModelPartsPopup({ modelo, onAdd, onClose, addedParts }: ModelPartsPopupProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchParts() {
      if (!profile?.empresa_id || !modelo) return;
      
      setLoading(true);
      const supabase = createClient();
      
      try {
        // 1. Busca em part_compatibility primeiro
        const { data: compatData } = await (supabase as any)
          .from('part_compatibility')
          .select('catalog_item_id')
          .eq('tenant_id', profile.empresa_id)
          .ilike('device_model_display', `%${modelo}%`);

        const compatIds = compatData?.map((r: any) => r.catalog_item_id) || [];

        // 2. Busca na catalog_items
        const { data, error } = await (supabase as any)
          .from('catalog_items')
          .select('*')
          .eq('empresa_id', profile.empresa_id)
          .eq('item_type', 'peca')
          .or(`id.in.(${compatIds.length > 0 ? compatIds.join(',') : '00000000-0000-0000-0000-000000000000'}),name.ilike.%${modelo}%`)
          .order('part_type');

        if (error) throw error;
        setParts(data || []);
      } catch (err) {
        console.error("Erro ao buscar peças por modelo:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchParts();
  }, [modelo, profile?.empresa_id]);

  const groupedParts = useMemo(() => {
    const filtered = parts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.part_type && p.part_type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const grouped: Record<string, any[]> = {};
    filtered.forEach(part => {
      const cat = part.part_type || 'outros';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(part);
    });
    return grouped;
  }, [parts, searchTerm]);

  const totalFound = parts.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[680px] max-h-[85vh] flex flex-col bg-white rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Peças para {modelo}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              {loading ? "Buscando..." : `${totalFound} peças compatíveis encontradas`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Busca Interna */}
        <div className="px-6 py-3 border-b border-slate-50 bg-white sticky top-0 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Filtrar nesta lista (ex: frontal, original...)"
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-sm font-bold uppercase tracking-widest">Localizando peças no estoque...</p>
            </div>
          ) : totalFound === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
              <Package size={48} className="mb-4 opacity-20" />
              <p className="font-bold text-slate-600">Nenhuma peça encontrada</p>
              <p className="text-xs max-w-[280px] mt-1">Não localizamos peças cadastradas para o modelo "{modelo}".</p>
            </div>
          ) : (
            Object.entries(groupedParts).map(([category, items]) => (
              <div key={category} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] shrink-0">
                    {categoryLabels[category] || category.replace(/_/g, " ")}
                  </h4>
                  <div className="h-[1px] w-full bg-slate-100" />
                </div>
                
                <div className="space-y-2">
                  {items.map(part => (
                    <PartCard 
                      key={part.id}
                      part={{
                        id: part.id,
                        name: part.name,
                        sale_price: part.sale_price,
                        cost_price: part.cost_price,
                        stock_qty: part.stock_qty,
                        part_type: part.part_type,
                        quality: part.quality,
                        shelf_location: part.shelf_location,
                        image_url: part.image_url
                      }}
                      onAdd={(qty) => onAdd(part, qty)}
                      alreadyAdded={addedParts.some(p => p.id === part.id)}
                      osModelo={modelo}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs ring-1 ring-indigo-100">
              {addedParts.length}
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Item(ns) selecionado(s)
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="h-11 px-6 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            Confirmar seleção <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
