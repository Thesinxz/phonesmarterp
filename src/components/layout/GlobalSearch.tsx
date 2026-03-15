"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Smartphone, Headphones, Wrench, Package } from "lucide-react";
import Link from "next/link";
import { getCatalogItems } from "@/services/catalog";
import { useAuth } from "@/context/AuthContext";
import { CatalogItem } from "@/types/database";

export function GlobalSearch() {
    const { profile } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (!profile?.empresa_id) return;
            setLoading(true);
            try {
                // search via getCatalogItems
                const data = await getCatalogItems(profile.empresa_id, { search: query });
                setResults(data);
                setOpen(true);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, profile?.empresa_id]);

    const getTypeIcon = (type: string) => {
        if (type === 'celular') return <Smartphone size={14} className="text-blue-500" />;
        if (type === 'acessorio') return <Headphones size={14} className="text-emerald-500" />;
        if (type === 'peca') return <Wrench size={14} className="text-amber-500" />;
        return <Package size={14} className="text-slate-500" />;
    };

    return (
        <div ref={wrapperRef} className="relative flex-1 max-md:hidden max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="Buscar produtos, peças, IMEI..."
                className="input-glass pl-9 h-9 text-sm w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setOpen(true)}
            />
            {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />}

            {open && (
                <div className="absolute top-12 left-0 w-[400px] bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="max-h-[400px] overflow-y-auto">
                        {results.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                                Nenhum resultado encontrado.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {results.map((item) => (
                                    <Link 
                                        key={item.id} 
                                        href={`/estoque/${item.id}`}
                                        onClick={() => setOpen(false)}
                                        className="flex flex-col p-3 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {getTypeIcon(item.item_type)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize">{item.item_type}</span>
                                                    {item.sku && <span>SKU: {item.sku}</span>}
                                                    {item.imei && <span>IMEI: {item.imei}</span>}
                                                    {item.compatible_models_parts && <span>Aplica: {item.compatible_models_parts.slice(0, 2).join(', ')}...</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
