"use client";
import { FileText } from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassCard } from "@/components/ui/GlassCard";

export type RegimeFiscal =
  | "simples_nacional"
  | "lucro_real"
  | "lucro_presumido"
  | "mei"
  | "isento";

export interface FiscalFieldsValue {
  ncm: string;
  cfopEstadualSaida: string;
  cfopInterestadualSaida: string;
  cfopEstadualEntrada: string;
  cfopInterestadualEntrada: string;
  cstCsosn: string;
  cest: string;
  origemProduto: string;
  codigoBeneficioFiscal: string;
  tributacaoId: string;
}

interface Props {
  value: FiscalFieldsValue;
  onChange: (field: keyof FiscalFieldsValue, val: string) => void;
  regime: RegimeFiscal;
  tributacoes?: { id: string; nome: string }[];
  onSuggestNCM?: () => void;
  disabled?: boolean;
}

const CST_CSOSN_OPTIONS: Record<RegimeFiscal, { v: string; l: string }[]> = {
  simples_nacional: [
    { v: "102", l: "102 — Tributada pelo Simples, sem permissão de crédito" },
    { v: "400", l: "400 — Não tributada pelo Simples Nacional" },
    { v: "500", l: "500 — ICMS cobrado anteriormente por ST" },
    { v: "900", l: "900 — Outros" },
  ],
  lucro_real: [
    { v: "00", l: "00 — Tributada integralmente" },
    { v: "10", l: "10 — Tributada e com cobrança do ICMS por ST" },
    { v: "20", l: "20 — Com redução de base de cálculo" },
    { v: "40", l: "40 — Isenta" },
    { v: "41", l: "41 — Não tributada" },
    { v: "50", l: "50 — Suspensão" },
    { v: "51", l: "51 — Diferimento" },
    { v: "60", l: "60 — ICMS cobrado anteriormente por ST" },
    { v: "70", l: "70 — Com redução de BC e cobrança do ICMS por ST" },
    { v: "90", l: "90 — Outros" },
  ],
  lucro_presumido: [
    { v: "00", l: "00 — Tributada integralmente" },
    { v: "40", l: "40 — Isenta" },
    { v: "41", l: "41 — Não tributada" },
    { v: "60", l: "60 — ICMS cobrado anteriormente por ST" },
    { v: "90", l: "90 — Outros" },
  ],
  mei: [
    { v: "400", l: "400 — Não tributada pelo Simples Nacional" },
    { v: "500", l: "500 — ICMS cobrado anteriormente por ST" },
  ],
  isento: [
    { v: "40", l: "40 — Isenta" },
    { v: "41", l: "41 — Não tributada" },
  ],
};

const ORIGEM_OPTIONS = [
  { v: "0", l: "0 — Nacional" },
  { v: "1", l: "1 — Estrangeira (importação direta)" },
  { v: "2", l: "2 — Estrangeira (adquirida no mercado interno)" },
  { v: "3", l: "3 — Nacional com mais de 40% de conteúdo estrangeiro" },
  { v: "4", l: "4 — Nacional produção básica" },
  { v: "5", l: "5 — Nacional com até 40% de conteúdo estrangeiro" },
  { v: "6", l: "6 — Estrangeira (import. direta) sem similar nacional" },
  { v: "7", l: "7 — Estrangeira (mercado interno) sem similar nacional" },
  { v: "8", l: "8 — Nacional — conteúdo de importação" },
];

const REGIME_LABELS: Record<RegimeFiscal, string> = {
  simples_nacional: "Simples Nacional",
  lucro_real: "Lucro Real",
  lucro_presumido: "Lucro Presumido",
  mei: "MEI",
  isento: "Isento / Não Contribuinte",
};

const REGIME_COLORS: Record<RegimeFiscal, string> = {
  simples_nacional: "bg-emerald-500",
  lucro_real: "bg-blue-500",
  lucro_presumido: "bg-purple-500",
  mei: "bg-amber-500",
  isento: "bg-slate-400",
};

export function FiscalPanel({
  value,
  onChange,
  regime,
  tributacoes = [],
  onSuggestNCM,
  disabled,
}: Props) {
  const f = (name: keyof FiscalFieldsValue) => ({
    value: value[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(name, e.target.value),
    disabled,
    className: cn("input-glass w-full font-mono", disabled && "opacity-60"),
  });

  const cstOptions = CST_CSOSN_OPTIONS[regime] || CST_CSOSN_OPTIONS["simples_nacional"];
  const showAdvanced = regime === "lucro_real" || regime === "lucro_presumido";

  return (
    <GlassCard title="Classificação Fiscal (NFC-e / NF-e)" icon={FileText}>
      {/* Regime badge */}
      <div className="flex items-center gap-2 mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
        <div className={cn("w-2 h-2 rounded-full shrink-0", REGIME_COLORS[regime])} />
        <p className="text-xs text-slate-600">
          Empresa enquadrada no{" "}
          <span className="font-black">{REGIME_LABELS[regime]}</span>
        </p>
      </div>

      <div className="space-y-4">
        {/* Tributação salva */}
        {tributacoes.length > 0 && (
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
              Tributação Salva{" "}
              <span className="text-slate-300 font-normal">(preenche campos automaticamente)</span>
            </label>
            <select
              value={value.tributacaoId}
              onChange={(e) => onChange("tributacaoId", e.target.value)}
              disabled={disabled}
              className="input-glass w-full"
            >
              <option value="">Selecionar tributação...</option>
              {tributacoes.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* NCM + Origem */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase flex items-center justify-between mb-1">
              NCM *
              {onSuggestNCM && (
                <button
                  type="button"
                  onClick={onSuggestNCM}
                  className="text-brand-500 font-normal hover:underline text-[10px]"
                >
                  Sugerir
                </button>
              )}
            </label>
            <input type="text" placeholder="8517.12.31" maxLength={10} {...f("ncm")} />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Origem *</label>
            <select
              value={value.origemProduto}
              onChange={(e) => onChange("origemProduto", e.target.value)}
              disabled={disabled}
              className="input-glass w-full"
            >
              {ORIGEM_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* CST / CSOSN */}
        <div>
          <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
            {regime === "simples_nacional" || regime === "mei" ? "CSOSN" : "CST ICMS"} *
          </label>
          <select
            value={value.cstCsosn}
            onChange={(e) => onChange("cstCsosn", e.target.value)}
            disabled={disabled}
            className="input-glass w-full"
          >
            <option value="">Selecionar...</option>
            {cstOptions.map((c) => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </select>
        </div>

        {/* CFOP — simplified vs advanced */}
        {!showAdvanced ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                CFOP Saída (Estadual) *
              </label>
              <input type="text" placeholder="5102" maxLength={4} {...f("cfopEstadualSaida")} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">CEST</label>
              <input type="text" placeholder="Opcional" maxLength={9} {...f("cest")} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase">CFOPs de Saída</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">Estadual (Saída)</label>
                <input type="text" placeholder="5102" maxLength={4} {...f("cfopEstadualSaida")} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">Interestadual (Saída)</label>
                <input type="text" placeholder="6102" maxLength={4} {...f("cfopInterestadualSaida")} />
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase">CFOPs de Entrada</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">Estadual (Entrada)</label>
                <input type="text" placeholder="1102" maxLength={4} {...f("cfopEstadualEntrada")} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">Interestadual (Entrada)</label>
                <input type="text" placeholder="2102" maxLength={4} {...f("cfopInterestadualEntrada")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">CEST</label>
                <input type="text" placeholder="Opcional" maxLength={9} {...f("cest")} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">Cód. Benefício Fiscal</label>
                <input type="text" placeholder="Ex: RS123456" {...f("codigoBeneficioFiscal")} />
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
