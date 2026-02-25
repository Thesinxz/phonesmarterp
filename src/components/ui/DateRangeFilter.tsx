"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { cn } from "@/utils/cn";

export type DatePreset = "hoje" | "7dias" | "mes" | "3meses" | "tudo" | "custom";

interface DateRangeFilterProps {
    onChange: (startDate: string | undefined, endDate: string | undefined) => void;
    defaultPreset?: DatePreset;
    className?: string;
}

function formatISODate(date: Date): string {
    return date.toISOString().split("T")[0];
}

function getPresetDates(preset: DatePreset): { start: string | undefined; end: string | undefined } {
    const now = new Date();
    const today = formatISODate(now);

    switch (preset) {
        case "hoje":
            return { start: today, end: today };
        case "7dias": {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return { start: formatISODate(d), end: today };
        }
        case "mes": {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: formatISODate(first), end: today };
        }
        case "3meses": {
            const d = new Date();
            d.setMonth(d.getMonth() - 3);
            return { start: formatISODate(d), end: today };
        }
        case "tudo":
            return { start: undefined, end: undefined };
        case "custom":
            return { start: undefined, end: undefined };
        default:
            return { start: undefined, end: undefined };
    }
}

const PRESET_LABELS: { key: DatePreset; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "7dias", label: "7 Dias" },
    { key: "mes", label: "Este Mês" },
    { key: "3meses", label: "3 Meses" },
    { key: "tudo", label: "Tudo" },
];

export function DateRangeFilter({ onChange, defaultPreset = "mes", className }: DateRangeFilterProps) {
    const [activePreset, setActivePreset] = useState<DatePreset>(defaultPreset);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Gerar lista dos últimos 12 meses para o seletor
    const monthOptions = useMemo(() => {
        const months: { label: string; value: string; start: string; end: string }[] = [];
        const now = new Date();
        const nomesMeses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            months.push({
                label: `${nomesMeses[d.getMonth()]} ${d.getFullYear()}`,
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                start: formatISODate(d),
                end: formatISODate(lastDay),
            });
        }
        return months;
    }, []);

    function handlePreset(preset: DatePreset) {
        setActivePreset(preset);
        setShowMonthPicker(false);
        if (preset === "custom") return;
        const { start, end } = getPresetDates(preset);
        onChange(start, end);
    }

    function handleMonthSelect(month: (typeof monthOptions)[0]) {
        setActivePreset("custom");
        setCustomStart(month.start);
        setCustomEnd(month.end);
        setShowMonthPicker(false);
        onChange(month.start, month.end);
    }

    function handleCustomChange(start: string, end: string) {
        setActivePreset("custom");
        setCustomStart(start);
        setCustomEnd(end);
        if (start && end) {
            onChange(start, end);
        }
    }

    function handleClear() {
        setActivePreset("tudo");
        setCustomStart("");
        setCustomEnd("");
        onChange(undefined, undefined);
    }

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {/* Preset Buttons */}
            <div className="flex bg-white/60 p-1 rounded-xl border border-slate-200/60 shadow-sm">
                {PRESET_LABELS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handlePreset(key)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                            activePreset === key
                                ? "bg-brand-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/80"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Month Picker Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wide transition-all",
                        showMonthPicker || activePreset === "custom"
                            ? "bg-brand-50 border-brand-200 text-brand-700"
                            : "bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Calendar size={13} />
                    Mês
                    <ChevronDown size={12} className={cn("transition-transform", showMonthPicker && "rotate-180")} />
                </button>
                {showMonthPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[200px] max-h-[280px] overflow-y-auto scrollbar-thin animate-in fade-in slide-in-from-top-1 duration-150">
                        {monthOptions.map((m) => (
                            <button
                                key={m.value}
                                onClick={() => handleMonthSelect(m)}
                                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors"
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom Range */}
            <div className="flex items-center gap-1 bg-white/60 border border-slate-200/60 rounded-xl px-2 py-0.5">
                <Calendar size={13} className="text-slate-400 ml-1" />
                <input
                    type="date"
                    value={customStart}
                    onChange={(e) => handleCustomChange(e.target.value, customEnd)}
                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none py-1.5 w-[110px]"
                />
                <span className="text-slate-300">|</span>
                <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => handleCustomChange(customStart, e.target.value)}
                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:outline-none py-1.5 w-[110px]"
                />
            </div>

            {/* Clear */}
            {activePreset !== "tudo" && (
                <button
                    onClick={handleClear}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"
                    title="Limpar filtros"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
