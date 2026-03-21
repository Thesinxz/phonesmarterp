"use client";

import { useState } from "react";
import { 
  Building2, 
  Tag, 
  Layers, 
  Package, 
  CreditCard, 
  DollarSign, 
  Link2,
  List
} from "lucide-react";
import { cn } from "@/utils/cn";
import { CategoryManager } from "./CategoryManager";
import { BrandManager } from "./BrandManager";
import { PricingSegmentManager } from "./PricingSegmentManager";
import { ProductTypeManager } from "./ProductTypeManager";
import { FinanceGlobalManager } from "./FinanceGlobalManager";
import { GatewayManager } from "./GatewayManager";
import { ModelAliasesPanel } from "@/app/(dashboard)/configuracoes/ModelAliasesPanel";
import { FinanceiroConfig } from "@/types/configuracoes";

interface Props {
  financeiroConfig: FinanceiroConfig;
  setFinanceiroConfig: (config: FinanceiroConfig) => void;
  onSave: (chave: string, valor: any) => Promise<void>;
  saving: boolean;
}

type TabId = 'geral' | 'categorias' | 'perfis' | 'marcas' | 'tipos' | 'gateways' | 'apelidos';

export function CatalogAndFinancePanel({ 
  financeiroConfig, 
  setFinanceiroConfig, 
  onSave, 
  saving 
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('geral');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'geral', label: 'Geral', icon: DollarSign },
    { id: 'categorias', label: 'Categorias', icon: List },
    { id: 'perfis', label: 'Perfis de Lucro', icon: Layers },
    { id: 'marcas', label: 'Marcas', icon: Tag },
    { id: 'tipos', label: 'Tipos de Item', icon: Package },
    { id: 'gateways', label: 'Gateways', icon: CreditCard },
    { id: 'apelidos', label: 'Apelidos', icon: Link2 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300",
              activeTab === tab.id
                ? "bg-white text-brand-600 shadow-sm shadow-slate-200 ring-1 ring-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            )}
          >
            <tab.icon size={14} className={cn(activeTab === tab.id ? "text-brand-500" : "text-slate-400")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === 'geral' && (
          <FinanceGlobalManager 
            config={financeiroConfig} 
            onChange={setFinanceiroConfig} 
            onSave={onSave} 
            saving={saving} 
          />
        )}
        
        {activeTab === 'categorias' && (
          <CategoryManager />
        )}

        {activeTab === 'perfis' && (
          <PricingSegmentManager />
        )}

        {activeTab === 'marcas' && (
          <BrandManager />
        )}

        {activeTab === 'tipos' && (
          <ProductTypeManager />
        )}

        {activeTab === 'gateways' && (
          <GatewayManager 
            config={financeiroConfig} 
            onChange={setFinanceiroConfig} 
            onSave={onSave} 
            saving={saving} 
          />
        )}

        {activeTab === 'apelidos' && (
          <ModelAliasesPanel />
        )}
      </div>
    </div>
  );
}
