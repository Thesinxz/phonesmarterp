"use client";
import { cn } from "@/utils/cn";

export const QUALITIES = [
  { v: 'original', l: 'Original' },
  { v: 'premium',  l: 'Premium'  },
  { v: 'oem',      l: 'OEM'      },
  { v: 'paralela', l: 'Paralela' },
  { v: 'china',    l: 'China'    },
  { v: 'incell',   l: 'Incell'   },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QualitySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUALITIES.map(q => (
        <button
          key={q.v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(q.v)}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border-2",
            value === q.v
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {q.l}
        </button>
      ))}
    </div>
  );
}
