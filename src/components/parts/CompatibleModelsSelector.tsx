"use client";
import { useState, useEffect } from "react";
import { X, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

export interface CompatibleModel {
  id: string;
  brand: string;
  model: string;
  isFreeText?: boolean;
}

interface Props {
  value: CompatibleModel[];
  onChange: (models: CompatibleModel[]) => void;
  disabled?: boolean;
}

export function CompatibleModelsSelector({ value, onChange, disabled }: Props) {
  const { profile } = useAuth();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!input.trim() || input.length < 2 || !profile?.empresa_id) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const supabase = createClient();
    (supabase
      .from('catalog_items')
      .select('id, name, brand:brands(name)')
      .eq('empresa_id', profile.empresa_id)
      .eq('item_type', 'celular')
      .ilike('name', `%${input}%`)
      .limit(8) as any)
      .then(({ data }: any) => {
        setSuggestions(data || []);
        setSearching(false);
      });
  }, [input, profile?.empresa_id]);

  const addModel = (model: CompatibleModel) => {
    if (value.some(m => m.model === model.model && m.brand === model.brand)) return;
    onChange([...value, model]);
    setInput('');
    setSuggestions([]);
  };

  const addFreeText = () => {
    const text = input.trim();
    if (!text) return;
    const parts = text.split(' ');
    const brand = parts[0] || '';
    const model = parts.slice(1).join(' ') || text;
    addModel({ id: `free-${Date.now()}`, brand, model, isFreeText: true });
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((m, idx) => (
            <span key={idx} className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold",
              m.isFreeText
                ? "bg-slate-100 text-slate-600"
                : "bg-brand-50 text-brand-700 border border-brand-100"
            )}>
              {m.brand && <span className="opacity-60">{m.brand}</span>}
              {m.model}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addFreeText(); }
            }}
            placeholder="Buscar modelo ou digitar (Enter p/ adicionar)"
            className="input-glass pl-9 w-full text-sm"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
              {suggestions.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addModel({
                    id: s.id,
                    brand: s.brand?.name || '',
                    model: s.name,
                    isFreeText: false,
                  })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-brand-50 text-left transition-all"
                >
                  <span className="text-xs text-slate-400">{s.brand?.name}</span>
                  <span className="text-sm font-bold text-slate-700">{s.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={addFreeText}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left border-t border-slate-100 transition-all"
              >
                <Plus size={14} className="text-brand-500" />
                <span className="text-xs text-brand-600 font-bold">
                  Adicionar &ldquo;{input}&rdquo; manualmente
                </span>
              </button>
            </div>
          )}
          {input.length >= 2 && suggestions.length === 0 && !searching && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
              <button
                type="button"
                onClick={addFreeText}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-brand-50 text-left transition-all"
              >
                <Plus size={14} className="text-brand-500" />
                <span className="text-xs text-brand-600 font-bold">
                  Adicionar &ldquo;{input}&rdquo;
                </span>
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-[10px] text-slate-400">
        Busque por aparelhos cadastrados ou digite livremente e pressione Enter.
      </p>
    </div>
  );
}
