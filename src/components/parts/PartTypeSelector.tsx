"use client";
import { cn } from "@/utils/cn";

export const PART_TYPES = [
  { value: 'tela',      label: 'Tela / Frontal',  icon: '📱' },
  { value: 'bateria',   label: 'Bateria',          icon: '🔋' },
  { value: 'conector',  label: 'Conector',         icon: '🔌' },
  { value: 'camera',    label: 'Câmera',           icon: '📷' },
  { value: 'tampa',     label: 'Tampa / Carcaça',  icon: '🛡️' },
  { value: 'alto_falante', label: 'Alto-falante',  icon: '🔊' },
  { value: 'microfone', label: 'Microfone',        icon: '🎤' },
  { value: 'placa',     label: 'Placa / CI',       icon: '💾' },
  { value: 'flex',      label: 'Cabo Flex',        icon: '🔗' },
  { value: 'botao',     label: 'Botão',            icon: '⏺' },
  { value: 'chip',      label: 'Chip / SIM',       icon: '💳' },
  { value: 'outro',     label: 'Outro',            icon: '🔧' },
] as const;

export type PartTypeValue = typeof PART_TYPES[number]['value'];

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PartTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PART_TYPES.map(pt => (
        <button
          key={pt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(pt.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all",
            value === pt.value
              ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
              : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span style={{ fontSize: 14 }}>{pt.icon}</span>
          {pt.label}
        </button>
      ))}
    </div>
  );
}
