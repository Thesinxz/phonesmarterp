"use client";

import { useState } from "react";
import { X, Save, Loader2, Package, Smartphone, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCatalogData } from "@/hooks/useCatalogData";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (typeId: string) => void;
}

export function ProductTypeCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [showImei, setShowImei] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [defaultSegmentId, setDefaultSegmentId] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { segments } = useCatalogData();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !profile?.empresa_id) return;

    setLoading(true);
    const supabase = createClient();
    try {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      const { data, error } = await (supabase as any)
        .from('product_types')
        .insert({
          empresa_id: profile.empresa_id,
          name: name.trim(),
          slug,
          show_device_specs: showSpecs,
          show_imei: showImei,
          show_grade: showSpecs,
          show_battery_health: showSpecs,
          default_pricing_segment_id: defaultSegmentId || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Tipo "${name.trim()}" criado!`);
      if (onSuccess) onSuccess(data.id);
      onClose();
      setName("");
      setShowImei(false);
      setShowSpecs(false);
    } catch (error: any) {
      console.error("Error creating product type:", error);
      toast.error("Erro ao criar tipo de produto: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-amber-glow">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Novo Tipo de Item</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Defina comportamento (IMEI, Specs) por tipo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Nome do Tipo *</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Smartphone, Tablet, Smartwatch..."
              className="input-glass w-full font-bold focus:ring-amber-500 transition-all"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Configurações de Exibição</label>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setShowImei(!showImei)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                  showImei ? "border-brand-500 bg-brand-50/50 ring-4 ring-brand-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", showImei ? "bg-brand-500 text-white" : "bg-slate-200 text-slate-500")}>
                    <Info size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Controlar IMEI</p>
                    <p className="text-[10px] text-slate-500 font-medium italic">Habilita campo de IMEI único</p>
                  </div>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", showImei ? "border-brand-500 bg-brand-500" : "border-slate-300")}>
                  {showImei && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowSpecs(!showSpecs)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                  showSpecs ? "border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", showSpecs ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase">Specs de Aparelho</p>
                    <p className="text-[10px] text-slate-500 font-medium italic">Saúde de Bateria, Grade, RAM</p>
                  </div>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", showSpecs ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                  {showSpecs && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
              Perfil de Lucro Padrão
            </label>
            <select
              value={defaultSegmentId}
              onChange={(e) => setDefaultSegmentId(e.target.value)}
              className="input-glass w-full text-sm font-bold"
            >
              <option value="">Sem perfil padrão</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.margin_type === 'percent' ? `${s.default_margin}%` : `R$ ${s.default_margin/100}`})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 italic">
              Novos produtos deste tipo carregarão este lucro automaticamente.
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
              className="flex-[2] py-3 bg-amber-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-amber-glow hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Criar Tipo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { cn } from "@/utils/cn";
