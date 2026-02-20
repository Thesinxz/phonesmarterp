"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Package, User, PenTool, LayoutDashboard, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

interface SearchResult {
    type: 'produto' | 'cliente' | 'os' | 'acao';
    id: string;
    title: string;
    subtitle: string;
    url: string;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle on Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when open
    useEffect(() => {
        if (open) {
            setQuery("");
            setResults([]);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    // Handle search text changes and fetch
    useEffect(() => {
        if (!open || query.length < 2) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.results || []);
                setSelectedIndex(0);
            } catch (error) {
                console.error("Erro na busca:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query, open]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            } else if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                handleSelect(results[selectedIndex]);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, selectedIndex, results]);

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        router.push(result.url);
    };

    if (!open) return null;

    const renderIcon = (type: string) => {
        switch (type) {
            case 'produto': return <Package size={16} className="text-emerald-500" />;
            case 'cliente': return <User size={16} className="text-blue-500" />;
            case 'os': return <PenTool size={16} className="text-rose-500" />;
            case 'acao': return <LayoutDashboard size={16} className="text-indigo-500" />;
            default: return <Search size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-32 px-4 backdrop-blur-md bg-slate-900/40" onClick={() => setOpen(false)}>
            <div
                className="w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl overflow-hidden glass-panel"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="flex items-center px-4 py-3 border-b border-slate-200/50">
                    <Search className="text-slate-400 mr-3" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-slate-800 text-lg placeholder:text-slate-400"
                        placeholder="Buscar produtos, clientes, ordens de serviço ou ações..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {loading && <Loader2 className="animate-spin text-brand-500" size={20} />}
                    <div className="ml-3 hidden sm:flex items-center gap-1">
                        <kbd className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">ESC</kbd>
                    </div>
                </div>

                {/* Results List */}
                {query.length >= 2 && (
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {results.length === 0 && !loading ? (
                            <div className="px-4 py-12 text-center text-slate-500">
                                Nenhum resultado encontrado para "{query}".
                            </div>
                        ) : (
                            <div className="space-y-1 relative">
                                {results.map((result, idx) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={cn(
                                            "w-full text-left flex items-center px-4 py-3 rounded-xl transition-all",
                                            selectedIndex === idx
                                                ? "bg-brand-50/50 border border-brand-100/50"
                                                : "hover:bg-slate-50 border border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center mr-4",
                                            selectedIndex === idx ? "bg-white shadow-sm" : "bg-slate-100"
                                        )}>
                                            {renderIcon(result.type)}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-bold text-slate-800 truncate">{result.title}</div>
                                            <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                                        </div>
                                        {selectedIndex === idx && (
                                            <kbd className="hidden sm:block text-[10px] text-brand-600 bg-brand-100/50 px-2 py-1 rounded-md font-bold ml-4">
                                                ENTER
                                            </kbd>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer hints */}
                {query.length === 0 && (
                    <div className="px-6 py-4 my-2 text-xs flex justify-center text-slate-400 border-t border-slate-200/50 bg-slate-50/50">
                        <span className="flex items-center gap-4">
                            <span><kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-slate-600">↑</kbd> <kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-slate-600">↓</kbd> navegar</span>
                            <span><kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-slate-600">Enter</kbd> abrir</span>
                            <span><kbd className="bg-white border rounded px-1.5 py-0.5 shadow-sm text-slate-600">Esc</kbd> fechar</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
