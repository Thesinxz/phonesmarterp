"use client";
import { Battery, Cpu, HardDrive, Smartphone, Hash, FileText, Calendar, Tag } from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassCard } from "@/components/ui/GlassCard";
import { validateIMEILuhn } from "@/utils/tac-lookup";

export interface DeviceFieldsValue {
  imei: string;
  imei2: string;
  serialNumber: string;
  color: string;
  storage: string;
  ram: string;
  batteryHealth: string;
  batteryCycle: string;
  grade: string;
  condicao: string;
  diasGarantia: string;
  observacao: string;
  dataEntrada: string;
}

interface Props {
  value: DeviceFieldsValue;
  onChange: (field: keyof DeviceFieldsValue, val: string) => void;
  showIMEIScanner?: boolean;
  disabled?: boolean;
  imeiScanner?: React.ReactNode;
}

const GRADES = [
  { v: "",   l: "Novo / Lacrado" },
  { v: "A+", l: "A+ Impecável"  },
  { v: "A",  l: "A — Seminovo"  },
  { v: "B",  l: "B — Marcas leves" },
  { v: "C",  l: "C — Marcas visíveis" },
];

const CONDICOES = [
  { v: "novo_lacrado",   l: "Novo Lacrado"   },
  { v: "novo_aberto",    l: "Novo Aberto"    },
  { v: "seminovo",       l: "Seminovo"       },
  { v: "usado",          l: "Usado"          },
  { v: "recondicionado", l: "Recondicionado" },
  { v: "para_reparo",    l: "Para Reparo"    },
];

export function DeviceFields({ value, onChange, disabled, imeiScanner }: Props) {
  const field = (name: keyof DeviceFieldsValue) => ({
    value: value[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange(name, e.target.value),
    disabled,
    className: cn("input-glass w-full", disabled && "opacity-60"),
  });

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <GlassCard title="Identificação do Aparelho" icon={Smartphone}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Hash size={11} /> IMEI Principal *
              </label>
              {imeiScanner ? (
                imeiScanner
              ) : (
                <input
                  type="text"
                  maxLength={15}
                  placeholder="15 dígitos"
                  {...field("imei")}
                  className={cn(field("imei").className, "font-mono")}
                />
              )}
              {value.imei && value.imei.length === 15 && (
                <p className={cn(
                  "text-[10px] font-bold mt-1",
                  validateIMEILuhn(value.imei) ? "text-emerald-600" : "text-red-500"
                )}>
                  {validateIMEILuhn(value.imei) ? "IMEI válido" : "IMEI inválido — verifique os dígitos"}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Hash size={11} /> IMEI 2
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="Opcional (Dual SIM)"
                {...field("imei2")}
                className={cn(field("imei2").className, "font-mono")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                Número de Série (SN)
              </label>
              <input
                type="text"
                placeholder="Ex: MQH7W3XTLJ"
                {...field("serialNumber")}
                className={cn(field("serialNumber").className, "font-mono uppercase")}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Cor</label>
              <input type="text" placeholder="Ex: Natural Titanium" {...field("color")} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                <HardDrive size={11} className="inline mr-1" /> Armazenamento
              </label>
              <input type="text" placeholder="Ex: 256GB" {...field("storage")} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                <Cpu size={11} className="inline mr-1" /> RAM
              </label>
              <input type="text" placeholder="Ex: 8GB" {...field("ram")} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                <Battery size={11} className="inline mr-1" /> Bateria %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Ex: 91"
                {...field("batteryHealth")}
                className={cn(field("batteryHealth").className, "font-mono font-bold text-emerald-600")}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                <Battery size={11} className="inline mr-1" /> Ciclos
              </label>
              <input type="number" min="0" placeholder="Ex: 342" {...field("batteryCycle")} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Estado e condição */}
      <GlassCard title="Estado do Aparelho" icon={Tag}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Grade</label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange("grade", g.v)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                    value.grade === g.v
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Condição</label>
              <select {...field("condicao")} className="input-glass w-full">
                {CONDICOES.map((c) => (
                  <option key={c.v} value={c.v}>{c.l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">
                Garantia da Loja (dias)
              </label>
              <input type="number" min="0" placeholder="Ex: 90" {...field("diasGarantia")} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
              <Calendar size={11} /> Data de Entrada
            </label>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              {...field("dataEntrada")}
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
              <FileText size={11} /> Observações Internas
            </label>
            <textarea
              value={value.observacao}
              onChange={(e) => onChange("observacao", e.target.value)}
              disabled={disabled}
              placeholder="Estado dos acessórios, detalhes internos, etc."
              rows={2}
              className="input-glass w-full resize-none"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
