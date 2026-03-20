"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { Scan, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  onScan?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function BarcodeInput({
  value: externalValue,
  onChange: externalOnChange,
  onScan,
  placeholder = "Escanear ou digitar código...",
  autoFocus = false,
  className,
  disabled,
  id,
}: Props) {
  const [internalValue, setInternalValue] = useState("");
  const value = externalValue !== undefined ? externalValue : internalValue;

  const onChange = useCallback((newValue: string) => {
    if (externalOnChange) {
      externalOnChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  }, [externalOnChange]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  const lastKeyTimeRef = useRef<number>(0);
  const charCountRef = useRef(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const delta = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = (e.target as HTMLInputElement).value.trim();
      if (code) {
        onScan?.(code);
        onChange('');
        setIsScanning(false);
        charCountRef.current = 0;
      }
      return;
    }

    if (delta < 50 && charCountRef.current > 3) {
      setIsScanning(true);
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => setIsScanning(false), 500);
    }
    charCountRef.current++;
  }, [onScan, onChange]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    return () => clearTimeout(scanTimeoutRef.current);
  }, [autoFocus]);

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none",
        isScanning ? "text-emerald-500" : "text-slate-400"
      )}>
        <Scan size={16} />
      </div>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "input-glass pl-9 pr-8 font-mono text-sm w-full",
          isScanning && "border-emerald-300 ring-2 ring-emerald-100 focus:ring-emerald-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
      {isScanning && (
        <span className="absolute -bottom-5 left-0 text-[10px] text-emerald-600 font-bold animate-pulse">
          Leitura detectada...
        </span>
      )}
    </div>
  );
}
