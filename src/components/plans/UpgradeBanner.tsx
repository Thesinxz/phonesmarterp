"use client";

import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface UpgradeBannerProps {
  feature: string;
  requiredPlan: string;
  description?: string;
  className?: string;
}

export function UpgradeBanner({ feature, requiredPlan, description, className }: UpgradeBannerProps) {
  const onUpgrade = () => {
    const currentPath = window.location.pathname;
    window.location.href = `/planos?upgrade=${feature.toLowerCase()}&from=${currentPath}`;
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 max-w-lg text-center",
      className
    )}>
      <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
        <Lock size={32} />
      </div>
      
      <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
        {feature}
      </h3>
      
      {description && (
        <p className="text-slate-500 text-sm mb-4">
          {description}
        </p>
      )}

      <div className="mb-8">
        <p className="text-slate-600 text-sm">
          Este recurso está disponível no plano <span className="font-bold text-brand-600 uppercase tracking-wider">{requiredPlan}</span> ou superior.
        </p>
      </div>
      
      <button 
        onClick={onUpgrade}
        className="w-full px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group"
      >
        Ver Planos e Fazer Upgrade
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
