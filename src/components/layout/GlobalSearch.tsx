"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Smartphone, Headphones, Wrench, Package } from "lucide-react";
import Link from "next/link";
import { getCatalogItems } from "@/services/catalog";
import { useAuth } from "@/context/AuthContext";
import { useFinanceConfig } from "@/hooks/useFinanceConfig";
import { calculateProductPrices } from "@/utils/product-pricing";
import { CatalogItem } from "@/types/database";
import { cn } from "@/utils/cn";
import { DollarSign } from "lucide-react";

export function GlobalSearch() {
    const { profile } = useAuth();
    const { config, defaultGateway } = useFinanceConfig();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
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
                const result = await getCatalogItems(profile.empresa_id, { search: query });
                setResults(result.items || []);
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
                                    {results.map((item) => {
                                        let prices = null;
                                        if (config && defaultGateway) {
                                            prices = calculateProductPrices(
                                                item.cost_price || 0,
                                                item.sale_price || 0,
                                                item.item_type,
                                                config as any,
                                                defaultGateway as any
                                            );
                                        }

                                        const price12x = prices?.parcelas?.find(p => p.qtd === 12)?.valorTotal;
                                        const stockQty = item.stock_qty || 0;

                                        return (
                                            <Link 
                                                key={item.id} 
                                                href={`/estoque/${item.id}`}
                                                onClick={() => setOpen(false)}
                                                className="flex flex-col p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-slate-100 rounded-lg shrink-0">
                                                        {getTypeIcon(item.item_type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</p>
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <span className={cn(
                                                                    "shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded",
                                                                    stockQty > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                                                )}>
                                                                    {stockQty} UN
                                                                </span>
                                                                {item.unit_stock && item.unit_stock.filter((s: any) => s.qty > 0).length > 0 && (
                                                                    <div className="flex flex-wrap justify-end gap-1 mt-0.5 max-w-[120px]">
                                                                        {item.unit_stock.filter((s: any) => s.qty > 0).map((s: any, idx: number) => (
                                                                            <span key={idx} className="text-[8px] bg-slate-50 text-slate-400 px-1 rounded whitespace-nowrap">
                                                                                {s.unit?.name}: {s.qty}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded capitalize font-bold">{item.item_type}</span>
                                                            {item.brand?.name && <span className="text-slate-400 font-bold uppercase tracking-tighter">{item.brand.name}</span>}
                                                            {item.imei && <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black">IMEI: {item.imei}</span>}
                                                        </div>

                                                        {/* Preços */}
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black uppercase text-slate-400 leading-none mb-0.5">À Vista</span>
                                                                <span className="text-xs font-black text-emerald-600">
                                                                    R$ {((prices?.precoPix ?? item.sale_price) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            {prices?.parcelas && prices.parcelas.length > 0 && (
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[9px] font-black uppercase text-slate-400 leading-none mb-0.5">
                                                                        {prices.parcelas.length}x Total
                                                                    </span>
                                                                    <span className="text-xs font-black text-brand-500 whitespace-nowrap">
                                                                        R$ {(prices.parcelas[prices.parcelas.length - 1].valorTotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const wholesalePrice = item.wholesale_price_brl > 0 
                                                                    ? item.wholesale_price_brl 
                                                                    : (item.sale_price_usd > 0 ? Math.round(item.sale_price_usd * (item.sale_price_usd_rate || 1)) : 0);
                                                                
                                                                if (wholesalePrice > 0) {
                                                                    return (
                                                                        <div className="flex flex-col border-l border-slate-100 pl-3">
                                                                            <span className="text-[9px] font-black uppercase text-indigo-400 leading-none mb-0.5 whitespace-nowrap">Atacado (Pix)</span>
                                                                            <span className="text-xs font-black text-indigo-600">
                                                                                R$ {(wholesalePrice / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
