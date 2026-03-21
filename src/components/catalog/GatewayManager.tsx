"use client";

import { useState } from "react";
import { CreditCard, Plus, Trash2, Settings, Save, Loader2, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { FinanceiroConfig, PaymentGateway } from "@/types/configuracoes";

interface Props {
  config: FinanceiroConfig;
  onChange: (config: FinanceiroConfig) => void;
  onSave: (chave: string, valor: any) => Promise<void>;
  saving: boolean;
}

export function GatewayManager({ config, onChange, onSave, saving }: Props) {
  const [expandedGatewayId, setExpandedGatewayId] = useState<string | null>(null);

  if (!config) return null;

  function addGateway() {
    const newId = crypto.randomUUID();
    const newGateway: PaymentGateway = {
      id: newId,
      nome: "Novo Gateway",
      taxa_pix_pct: 0,
      taxa_debito_pct: 0,
      taxas_credito: Array.from({ length: 21 }, (_, i) => ({ parcela: i + 1, taxa: 0 })),
      is_default: config.gateways.length === 0,
      enabled: true
    };
    onChange({ ...config, gateways: [...config.gateways, newGateway] });
    setExpandedGatewayId(newId);
  }

  function removeGateway(id: string) {
    const gw = config.gateways.find(g => g.id === id);
    if (gw?.is_default) {
      toast.error("Não é possível remover o gateway padrão.");
      return;
    }
    if (!window.confirm("Remover este gateway de pagamento?")) return;
    onChange({ ...config, gateways: config.gateways.filter(g => g.id !== id) });
  }

  function setAsDefault(id: string) {
    onChange({
      ...config,
      gateways: config.gateways.map(g => ({ ...g, is_default: g.id === id }))
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Gateways de Pagamento</h3>
          <p className="text-xs text-slate-500 font-medium">Configure as taxas de cartão e pix para precificação automática</p>
        </div>
        <button onClick={addGateway} className="btn-primary">
          <Plus size={18} /> Adicionar Gateway
        </button>
      </div>

      <div className="space-y-4">
        {config.gateways.map((gw, idx) => (
          <div key={gw.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:border-brand-200 transition-all">
            <div className="p-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                  gw.is_default ? "bg-brand-500 text-white shadow-brand-glow" : "bg-white text-slate-400 border border-slate-100"
                )}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-transparent border-none font-bold text-slate-800 focus:ring-0 p-0 text-lg"
                      value={gw.nome}
                      onChange={e => {
                        const newGws = [...config.gateways];
                        newGws[idx].nome = e.target.value;
                        onChange({ ...config, gateways: newGws });
                      }}
                    />
                    {gw.is_default && (
                      <span className="text-[9px] font-black bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Padrão</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {gw.taxas_credito.length} parcelas configuradas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!gw.is_default && (
                  <button
                    onClick={() => setAsDefault(gw.id)}
                    className="px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl uppercase transition-all"
                  >
                    Tornar Padrão
                  </button>
                )}
                <button
                  onClick={() => setExpandedGatewayId(expandedGatewayId === gw.id ? null : gw.id)}
                  className={cn(
                    "p-2 rounded-xl transition-all border",
                    expandedGatewayId === gw.id ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-white border-slate-100 text-slate-400"
                  )}
                >
                  <Settings size={20} />
                </button>
                <button
                  disabled={gw.is_default}
                  onClick={() => removeGateway(gw.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {expandedGatewayId === gw.id && (
              <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Taxa Pix (%)</label>
                      <input
                        type="text"
                        className="input-glass w-full font-bold text-emerald-600"
                        value={gw.taxa_pix_pct.toString().replace('.', ',')}
                        onChange={e => {
                          const val = e.target.value.replace(',', '.');
                          if (!isNaN(Number(val))) {
                            const newGws = [...config.gateways];
                            newGws[idx].taxa_pix_pct = Number(val);
                            onChange({ ...config, gateways: newGws });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Taxa Débito (%)</label>
                      <input
                        type="text"
                        className="input-glass w-full font-bold text-indigo-600"
                        value={gw.taxa_debito_pct.toString().replace('.', ',')}
                        onChange={e => {
                          const val = e.target.value.replace(',', '.');
                          if (!isNaN(Number(val))) {
                            const newGws = [...config.gateways];
                            newGws[idx].taxa_debito_pct = Number(val);
                            onChange({ ...config, gateways: newGws });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <Info className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
                      As taxas configuradas aqui são usadas para o cálculo automático de preço de venda (markup) nas ferramentas de precificação.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 block">Tabela de Crédito Parcelado (%)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {gw.taxas_credito.map((taxa, tIdx) => (
                      <div key={taxa.parcela} className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">{taxa.parcela}x</label>
                        <input
                          type="text"
                          className="input-glass h-8 text-[11px] font-bold text-center px-1"
                          value={taxa.taxa.toString().replace('.', ',')}
                          onChange={e => {
                            const val = e.target.value.replace(',', '.');
                            if (!isNaN(Number(val))) {
                              const newGws = [...config.gateways];
                              const newTaxas = [...newGws[idx].taxas_credito];
                              newTaxas[tIdx].taxa = Number(val);
                              newGws[idx].taxas_credito = newTaxas;
                              onChange({ ...config, gateways: newGws });
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {config.gateways.length === 0 && (
          <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <CreditCard className="text-slate-300 mx-auto mb-2" size={32} />
             <p className="text-slate-500 font-medium tracking-tight">Nenhum gateway configurado</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={() => onSave("financeiro", config)}
          disabled={saving}
          className="btn-primary px-8"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Gateways
        </button>
      </div>
    </div>
  );
}
