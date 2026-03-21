"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Layers, Percent, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (segmentId: string) => void;
  editingSegment?: any; // To support edit mode
}

export function PricingSegmentCreateModal({ isOpen, onClose, onSuccess, editingSegment }: Props) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [margin, setMargin] = useState("");
  const [marginType, setMarginType] = useState<'fixed' | 'percent'>('fixed');
  const [warrantyDays, setWarrantyDays] = useState("90");
  const [requiresNf, setRequiresNf] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state when editingSegment changes
  useEffect(() => {
    if (editingSegment) {
      setName(editingSegment.name || "");
      setMarginType(editingSegment.margin_type || 'fixed');
      setRequiresNf(editingSegment.requires_nf || false);
      setWarrantyDays(editingSegment.warranty_days?.toString() || "90");
      setMargin((editingSegment.default_margin / 100).toString().replace('.', ','));
    } else {
      setName("");
      setMargin("");
      setMarginType('fixed');
      setRequiresNf(false);
      setWarrantyDays("90");
    }
  }, [editingSegment, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !profile?.empresa_id) return;

    setLoading(true);
    const supabase = createClient();
    try {
      const marginValue = margin.replace(',', '.');
      const marginNum = Math.round((parseFloat(marginValue) || 0) * 100);

      const payload = {
        name: name.trim(),
        empresa_id: profile.empresa_id,
        default_margin: marginNum,
        margin_type: marginType,
        warranty_days: parseInt(warrantyDays) || 0,
        requires_nf: requiresNf,
      };

      let result;
      if (editingSegment) {
        result = await (supabase as any)
          .from('pricing_segments')
          .update(payload)
          .eq('id', editingSegment.id)
          .select()
          .single();
      } else {
        result = await (supabase as any)
          .from('pricing_segments')
          .insert(payload)
          .select()
          .single();
      }

      const { data, error } = result;
      if (error) throw error;

      toast.success(`Perfil "${name.trim()}" ${editingSegment ? 'atualizado' : 'criado'}!`);
      if (onSuccess) onSuccess(data.id);
      onClose();
    } catch (error: any) {
      console.error("Error saving pricing segment:", error);
      toast.error("Erro ao salvar perfil: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-indigo-glow">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{editingSegment ? 'Editar Perfil' : 'Novo Perfil'}</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Defina margens, garantia e regras fiscais</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Nome do Perfil *</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Apple Semi Novos, Atacado..."
              className="input-glass w-full font-bold focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Tipo de Margem</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMarginType('fixed')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    marginType === 'fixed' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <DollarSign size={12} /> FIXO
                </button>
                <button
                  type="button"
                  onClick={() => setMarginType('percent')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    marginType === 'percent' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Percent size={12} /> PERCENTUAL
                </button>
              </div>
            </div>

            <div className="col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                {marginType === 'fixed' ? 'Margem (R$)' : 'Margem (%)'} *
              </label>
              <div className="relative">
                <input
                  required
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder={marginType === 'fixed' ? "450,00" : "40,00"}
                  className={cn(
                    "input-glass w-full pl-8 font-bold transition-all",
                    marginType === 'fixed' ? "text-emerald-600 focus:ring-emerald-500" : "text-blue-600 focus:ring-blue-500"
                  )}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {marginType === 'fixed' ? 'R$' : '%'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Garantia (Dias)</label>
              <input
                type="number"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
                className="input-glass w-full font-bold"
              />
            </div>
            <div className="flex items-end pb-1.5">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 bg-slate-200">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={requiresNf}
                      onChange={e => setRequiresNf(e.target.checked)}
                    />
                    <span className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform translate-x-0.5",
                      requiresNf ? "translate-x-4.5 bg-indigo-500" : "translate-x-0.5"
                    )} />
                    <div className={cn(
                      "absolute inset-0 rounded-full transition-colors",
                      requiresNf ? "bg-indigo-500" : "bg-slate-200"
                    )} />
                    <span className={cn(
                      "absolute pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                      requiresNf ? "translate-x-[18px]" : "translate-x-[2px]"
                    )} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Exigir NF-e</span>
               </label>
            </div>
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
              disabled={loading || !name.trim() || !margin.trim()}
              className="flex-[2] py-3 bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-indigo-glow hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {editingSegment ? 'Salvar Alterações' : 'Criar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
