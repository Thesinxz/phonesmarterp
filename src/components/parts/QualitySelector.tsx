"use client";
import { cn } from "@/utils/cn";

export const QUALITY_OPTIONS = [
  {
    value: 'original',
    label: 'Original',
    desc: 'Apple / fabricante oficial',
    color: 'emerald',
  },
  {
    value: 'oem',
    label: 'OEM',
    desc: 'Fabricante original de equipamento',
    color: 'purple',
  },
  {
    value: 'paralela',
    label: 'Paralela',
    desc: 'Compatível, boa qualidade',
    color: 'amber',
  },
  {
    value: 'china',
    label: 'China',
    desc: 'Importada genérica',
    color: 'orange',
  },
] as const;

export type QualityValue = typeof QUALITY_OPTIONS[number]['value'];

const COLOR_MAP: Record<string, string> = {
  emerald: 'border-emerald-400 bg-emerald-50 text-emerald-700',
  blue:    'border-blue-400 bg-blue-50 text-blue-700',
  purple:  'border-purple-400 bg-purple-50 text-purple-700',
  amber:   'border-amber-400 bg-amber-50 text-amber-700',
  orange:  'border-orange-400 bg-orange-50 text-orange-700',
  slate:   'border-slate-300 bg-slate-100 text-slate-700',
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QualitySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUALITY_OPTIONS.map(q => (
        <button
          key={q.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(q.value)}
          className={cn(
            "flex flex-col items-start px-3 py-2 rounded-2xl border-2 transition-all text-left",
            value === q.value
              ? COLOR_MAP[q.color]
              : "border-slate-100 bg-white text-slate-600 hover:border-slate-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="text-xs font-black">{q.label}</span>
          <span className="text-[10px] opacity-70 font-normal">{q.desc}</span>
        </button>
      ))}
    </div>
  );
}
