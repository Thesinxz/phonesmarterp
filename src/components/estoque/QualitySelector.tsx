"use client";
import { cn } from "@/utils/cn";

const QUALITIES = ['original', 'oem', 'paralela', 'china'];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function QualitySelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUALITIES.map(q => (
        <button
          key={q}
          type="button"
          onClick={() => onChange(q)}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border-2",
            value === q
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
