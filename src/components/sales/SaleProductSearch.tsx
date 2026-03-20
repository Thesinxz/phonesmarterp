"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
    Search, 
    Smartphone, 
    Package, 
    Camera, 
    Keyboard, 
    X, 
    Plus, 
    CheckCircle2, 
    ShieldAlert, 
    Info,
    History
} from "lucide-react";
import { searchProductForSale } from "@/app/actions/sales";
import { BrowserQRCodeReader } from "@zxing/browser";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { BarcodeInput } from "@/components/barcode/BarcodeInput";

interface SaleProductSearchProps {
    tenantId: string;
    unitId: string;
    userRole: 'owner' | 'admin' | 'attendant';
    onProductSelected: (product: any) => void;
}

export function SaleProductSearch({ tenantId, unitId, userRole, onProductSelected }: SaleProductSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputType, setInputType] = useState<'imei' | 'barcode' | 'text' | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [message, setMessage] = useState("");
    
    const inputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<any>(null);

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const performSearch = async (val: string) => {
        if (!val || val.length < 2) {
            setResults([]);
            setInputType(null);
            setMessage("");
            return;
        }

        setLoading(true);
        try {
            const res = await searchProductForSale({
                tenantId,
                unitId,
                query: val,
                userRole
            });
            setResults(res.products);
            setInputType(res.type);
            setMessage(res.message || "");

            // Auto-add logic if it's a unique scan match
            if ((res.type === 'imei' || res.type === 'barcode') && res.products.length === 1) {
                const product = res.products[0];
                if (product.canSell) {
                    handleAdd(product);
                    toast.success(`${product.name} adicionado ao carrinho`);
                } else {
                    toast.error(product.blockReason || "Produto não disponível para venda");
                }
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce for text search
    useEffect(() => {
        const timer = setTimeout(() => {
            const digits = query.replace(/\D/g, '');
            // Only debounce if it's text. If it looks like IMEI or Barcode, search faster (handled onKeyDown or length)
            if (digits.length < 15 && (digits.length < 8 || digits.length > 13)) {
                performSearch(query);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(query);
        }
    };

    const toggleCamera = async () => {
        if (isCameraOpen) {
            controlsRef.current?.stop();
            setIsCameraOpen(false);
            return;
        }

        setIsCameraOpen(true);
        setTimeout(async () => {
            try {
                const codeReader = new BrowserQRCodeReader();
                const controls = await codeReader.decodeFromVideoDevice(
                    undefined,
                    videoRef.current!,
                    (result) => {
                        if (result) {
                            const val = result.getText();
                            setQuery(val);
                            performSearch(val);
                            controls.stop();
                            setIsCameraOpen(false);
                        }
                    }
                );
                controlsRef.current = controls;
            } catch (err) {
                console.error("Camera error:", err);
                toast.error("Erro ao acessar a câmera");
                setIsCameraOpen(false);
            }
        }, 100);
    };

    const handleAdd = (product: any) => {
        onProductSelected(product);
        setQuery("");
        setResults([]);
        setInputType(null);
        inputRef.current?.focus();
    };

    return (
        <div className="space-y-4">
            {/* Input Field */}
            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                    <Search size={22} />
                </div>
                <BarcodeInput 
                    placeholder="Buscar por nome, código de barras ou IMEI..."
                    onScan={(val) => {
                        setQuery(val);
                        performSearch(val);
                    }}
                    value={query}
                    onChange={(val) => {
                        setQuery(val);
                        //performSearch is handled by useEffect for text
                    }}
                    className="w-full h-16 bg-white border-2 border-slate-100 rounded-[28px] pl-14 pr-32 text-lg font-bold placeholder:text-slate-300 outline-none focus:border-brand-500 shadow-sm focus:shadow-xl focus:shadow-brand-500/5 transition-all"
                />
                
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {query && (
                        <button 
                            onClick={() => { setQuery(""); setResults([]); }}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
                        >
                            <X size={20} />
                        </button>
                    )}
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                        onClick={toggleCamera}
                        className={cn(
                            "p-3 rounded-2xl transition-all",
                            isCameraOpen ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                        )}
                    >
                        {isCameraOpen ? <X size={20} /> : <Camera size={20} />}
                    </button>
                </div>

                {/* Type Indicator */}
                {inputType && (
                    <div className="absolute -bottom-6 left-6 animate-in fade-in slide-in-from-top-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 flex items-center gap-1">
                            <Info size={10} />
                            Buscando por {inputType === 'imei' ? 'IMEI' : inputType === 'barcode' ? 'Código de barras' : 'Nome'}...
                        </span>
                    </div>
                )}
            </div>

            {/* Camera View */}
            {isCameraOpen && (
                <div className="relative aspect-video bg-black rounded-[32px] overflow-hidden border-4 border-brand-500 shadow-2xl animate-in zoom-in-95">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-white/20 pointer-events-none" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-brand-500/50" />
                    <div className="absolute top-4 left-1/2 -translate-y-1/2 bg-brand-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                        Aponte para o código
                    </div>
                </div>
            )}

            {/* Message if any */}
            {message && !loading && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-sm font-bold animate-in fade-in">
                    <ShieldAlert size={18} />
                    {message}
                </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-[32px] border border-slate-100" />
                    ))
                ) : (
                    results.map((product) => (
                        <div 
                            key={product.imeiId || product.id}
                            className={cn(
                                "p-6 rounded-[32px] border-2 transition-all flex flex-col justify-between gap-4 animate-in slide-in-from-bottom-2",
                                !product.canSell 
                                    ? "bg-red-50/50 border-red-100 opacity-80" 
                                    : "bg-white border-slate-100 hover:border-brand-200 shadow-sm hover:shadow-lg"
                            )}
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            product.imei ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {product.imei ? <Smartphone size={20} /> : <Package size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 leading-tight line-clamp-1">{product.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {product.brand} · {product.condition}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-brand-600">{formatCurrency(product.salePrice / 100)}</p>
                                        <p className={cn(
                                            "text-[10px] font-black uppercase",
                                            product.stockQty > 0 ? "text-emerald-500" : "text-red-500"
                                        )}>
                                            {product.stockQty} EM ESTOQUE
                                        </p>
                                    </div>
                                </div>

                                {product.imei && (
                                    <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-xl border border-slate-200/50">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 border-r border-slate-300">IMEI</span>
                                        <span className="font-mono text-sm font-bold text-slate-600 tracking-wider">
                                            {product.imei}
                                        </span>
                                    </div>
                                )}

                                {product.costPrice !== undefined && (
                                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Custo</p>
                                            <p className="text-xs font-bold text-slate-600">{formatCurrency(product.costPrice / 100)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">Margem</p>
                                            <p className="text-xs font-bold text-emerald-600">
                                                {formatCurrency(product.margin / 100)} ({product.marginPercent.toFixed(1)}%)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!product.canSell ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-red-100 text-red-700 rounded-2xl flex items-start gap-2">
                                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-tight">Venda Bloqueada</p>
                                            <p className="text-[11px] font-bold opacity-80">{product.blockReason}</p>
                                        </div>
                                    </div>
                                    {product.imeiStatus === 'vendido' && (
                                        <button className="w-full py-2 bg-white border border-red-200 text-red-600 text-[10px] font-bold uppercase rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                                            <History size={14} /> Ver venda anterior
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleAdd(product)}
                                    className="w-full h-12 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                                >
                                    <Plus size={18} /> Adicionar
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
