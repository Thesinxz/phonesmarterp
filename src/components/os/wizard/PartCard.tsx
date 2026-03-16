"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/formatCurrency";
import { Package, MapPin, Check } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  sale_price: number;
  cost_price: number;
  stock_qty: number;
  part_type: string;
  quality?: string;
  shelf_location?: string;
  image_url?: string;
}

interface PartCardProps {
  part: CatalogItem;
  onAdd: (qty: number) => void;
  alreadyAdded: boolean;
  osModelo?: string;
}

export function PartCard({ part, onAdd, alreadyAdded, osModelo }: PartCardProps) {
  const [qty, setQty] = useState(1);
  
  const margin = part.cost_price > 0
    ? ((part.sale_price - part.cost_price) / part.cost_price * 100).toFixed(1)
    : null;

  // Verificar compatibilidade explícita
  const isCompatible = osModelo && part.name 
    ? part.name.toLowerCase().includes(osModelo.toLowerCase())
    : false;

  return (
    <div className={`bg-white rounded-[10px] p-3 mb-2 grid grid-cols-[48px_1fr_auto] gap-3 items-center border transition-all ${
      alreadyAdded ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-300'
    }`}>

      {/* Foto ou placeholder */}
      <div className="w-12 h-12 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
        {part.image_url ? (
          <img src={part.image_url} alt={part.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-300">
            <Package size={20} />
          </div>
        )}
      </div>

      {/* Info da peça */}
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-slate-800 mb-1 truncate">
          {part.name}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {/* Badge de qualidade */}
          {part.quality && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
              part.quality === 'ORIGINAL' ? 'bg-emerald-100 text-emerald-700' : 
              part.quality === 'OEM' ? 'bg-blue-100 text-blue-700' : 
              'bg-amber-100 text-amber-700'
            }`}>
              {part.quality}
            </span>
          )}

          {/* Badge de tipo */}
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
            {part.part_type || 'PEÇA'}
          </span>

          {/* Badge de compatibilidade */}
          {isCompatible && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1">
              <Check size={8} /> {osModelo}
            </span>
          )}

          {/* Prateleira */}
          {part.shelf_location && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center gap-1">
              <MapPin size={8} /> {part.shelf_location}
            </span>
          )}
        </div>

        {/* Estoque + margem */}
        <div className="flex gap-3 text-[10px] items-center">
          <span className={`font-black uppercase tracking-widest ${
            part.stock_qty <= 0 ? 'text-red-500' : 
            part.stock_qty <= 2 ? 'text-amber-500' : 
            'text-emerald-600'
          }`}>
            Estoque: {part.stock_qty}
          </span>
          {margin && (
            <span className="text-slate-400 font-medium">
              MARGEM: {margin}%
            </span>
          )}
        </div>
      </div>

      {/* Preço + quantidade + botão */}
      <div className="flex flex-col items-end gap-2">
        <div className="text-sm font-black text-emerald-600">
          {formatCurrency(part.sale_price)}
        </div>

        {!alreadyAdded ? (
          <div className="flex flex-col items-end gap-2">
            {/* Seletor de quantidade */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
                disabled={qty <= 1}
              >−</button>
              <span className="w-5 text-center text-[13px] font-bold text-slate-700">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(Math.min(part.stock_qty || 1, qty + 1))}
                className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors"
                disabled={part.stock_qty <= qty}
              >+</button>
            </div>

            <button
              type="button"
              onClick={() => onAdd(qty)}
              disabled={part.stock_qty <= 0}
              className={`h-8 px-4 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                part.stock_qty <= 0 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              }`}
            >
              {part.stock_qty <= 0 ? 'Sem estoque' : 'Adicionar'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-black uppercase tracking-widest py-2">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={12} />
            </div>
            Adicionada
          </div>
        )}
      </div>
    </div>
  );
}
