"use client";
import { cn } from "@/utils/cn";

export const PART_TYPES = [
  { v: 'tela',          l: 'Tela/Frontal' },
  { v: 'bateria',       l: 'Bateria'      },
  { v: 'conector',      l: 'Conector'     },
  { v: 'camera',        l: 'Câmera'       },
  { v: 'tampa_traseira',l: 'Tampa'        },
  { v: 'outro',         l: 'Outro'        },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PartTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PART_TYPES.map(t => (
        <button
          key={t.v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t.v)}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
            value === t.v
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {t.l}
        </button>
      ))}
    </div>
  );
}
