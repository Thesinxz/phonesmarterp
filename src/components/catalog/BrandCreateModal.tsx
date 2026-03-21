"use client";

import { useState } from "react";
import { X, Save, Loader2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useCatalogData } from "@/hooks/useCatalogData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (brandId: string) => void;
}

export function BrandCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const { profile } = useAuth();
  const { segments } = useCatalogData();
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !profile?.empresa_id) return;

    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await (supabase as any)
        .from('brands')
        .insert({
          name: name.trim(),
          empresa_id: profile.empresa_id,
          default_pricing_segment_id: segmentId || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Marca "${name.trim()}" criada!`);
      if (onSuccess) onSuccess(data.id);
      onClose();
      setName("");
      setSegmentId("");
    } catch (error: any) {
      console.error("Error creating brand:", error);
      toast.error("Erro ao criar marca: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-brand-glow">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Nova Marca</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Crie um novo fabricante no catálogo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Nome da Marca *</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Apple, Samsung, Xiaomi..."
              className="input-glass w-full font-bold focus:ring-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Perfil de Precificação Padrão (Opcional)</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="input-glass w-full font-bold text-indigo-700"
            >
              <option value="">Nenhum / Escolher depois</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight italic">
              Selecione um perfil se esta marca tiver margens de lucro fixas.
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-[2] py-3 bg-brand-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-brand-glow hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Criar Marca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
