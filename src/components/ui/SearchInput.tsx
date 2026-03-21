"use client";
import { useEffect, useState, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  loading?: boolean;
  className?: string;
  autoFocus?: boolean;
  id?: string;
}

export function SearchInput({
  value, onChange, placeholder = "Buscar...",
  debounce = 300, loading, className, autoFocus, id,
}: Props) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounce);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {loading
          ? <Loader2 size={16} className="animate-spin" />
          : <Search size={16} />
        }
      </div>
      <input
        id={id}
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-11 pl-10 pr-9 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
      />
      {local && (
        <button
          type="button"
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
