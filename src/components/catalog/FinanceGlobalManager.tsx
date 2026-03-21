"use client";

import { useState } from "react";
import { DollarSign, RefreshCw, ExternalLink, Percent, Save, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { FinanceiroConfig } from "@/types/configuracoes";

interface Props {
  config: FinanceiroConfig;
  onChange: (config: FinanceiroConfig) => void;
  onSave: (chave: string, valor: any) => Promise<void>;
  saving: boolean;
}

export function FinanceGlobalManager({ config, onChange, onSave, saving }: Props) {
  const [fetchingDolar, setFetchingDolar] = useState(false);

  if (!config) return null;

  async function fetchDolar() {
    setFetchingDolar(true);
    try {
      const res = await fetch("https://api.cambioschaco.com.py/api/publico/cotaciones", {
        next: { revalidate: 3600 } // Cache for 1 hour if supported
      });
      if (!res.ok) throw new Error("Falha na resposta da API");
      
      const data = await res.json();
      if (data && data.status === "success" && data.cotaciones) {
        const adrianJara = data.cotaciones.find((c: any) => c.sucursal === "Adrian Jara");
        if (adrianJara) {
          const buyPrice = parseFloat(adrianJara.compra.replace(/\./g, '').replace(',', '.'));
          onChange({ ...config, cotacao_dolar_paraguai: buyPrice });
          toast.success("Cotação atualizada via Chaco!");
        } else {
          throw new Error("Sucursal Adrian Jara não encontrada");
        }
      } else {
        throw new Error("Formato de dados inválido");
      }
    } catch (err) {
      console.warn("Could not fetch automatic dollar rate:", err);
      toast.error("Não foi possível buscar a cotação automática. Verifique sua conexão ou tente novamente mais tarde.");
    } finally {
      setFetchingDolar(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard title="Moeda e Câmbio" icon={DollarSign}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Dólar Paraguai (Adrian Jara)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchDolar}
                    disabled={fetchingDolar}
                    className="text-[9px] font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors bg-slate-100 hover:bg-brand-50 px-2 py-0.5 rounded-full"
                  >
                    <RefreshCw size={10} className={cn(fetchingDolar && "animate-spin")} /> {fetchingDolar ? "BUSCANDO..." : "ATUALIZAR"}
                  </button>
                  <a
                    href="https://www.cambioschaco.com.py/pt-br/"
                    target="_blank"
                    className="text-[9px] font-black text-brand-500 hover:text-brand-600 flex items-center gap-1 transition-colors bg-brand-50 px-2 py-0.5 rounded-full"
                  >
                    CHACO <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-glass w-full pl-8 font-bold text-brand-600 text-lg"
                  value={config.cotacao_dolar_paraguai.toString().replace('.', ',')}
                  placeholder="0,00"
                  onChange={e => {
                    const raw = e.target.value.replace('.', ',');
                    const clean = raw.replace(',', '.');
                    if (raw === "" || /^\d*[,]?\d*$/.test(raw)) {
                      onChange({ ...config, cotacao_dolar_paraguai: raw === "" ? 0 : Number(clean) });
                    }
                  }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Impostos e NF" icon={Percent}>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Taxa de Nota Fiscal (%)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-glass w-full pl-8 font-bold text-indigo-600"
                  value={config.taxa_nota_fiscal_pct.toString().replace('.', ',')}
                  placeholder="0,00"
                  onChange={e => {
                    const raw = e.target.value.replace('.', ',');
                    const clean = raw.replace(',', '.');
                    if (raw === "" || /^\d*[,]?\d*$/.test(raw)) {
                      onChange({ ...config, taxa_nota_fiscal_pct: raw === "" ? 0 : Number(clean) });
                    }
                  }}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
               <input 
                 type="checkbox" 
                 id="nf_obrigatoria"
                 checked={config.nf_obrigatoria}
                 onChange={e => onChange({ ...config, nf_obrigatoria: e.target.checked })}
                 className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
               />
               <label htmlFor="nf_obrigatoria" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Exigir NF em todos os produtos por padrão</label>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave("financeiro", config)}
          disabled={saving}
          className="btn-primary px-8"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Configurações Globais
        </button>
      </div>
    </div>
  );
}
