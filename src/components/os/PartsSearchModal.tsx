"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    searchPartsByModel, 
    usePartInOS, 
    removePartFromOS, 
    getOSParts,
    PartSearchResult 
} from "@/app/actions/parts";
import { 
    X, 
    Search, 
    Wrench, 
    AlertTriangle, 
    CheckCircle2, 
    Package, 
    Plus,
    Loader2,
    Store,
    Smartphone,
    Trash2,
    ArrowRightLeft,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface PartsSearchModalProps {
    osId: string;
    deviceModel: string;
    currentUnitId: string;
    tenantId: string;
    technicianId: string; // Adicionado para as actions
    isOpen: boolean;
    onClose: () => void;
    onPartUsed: (part: { id: string; name: string; qty: number }) => void;
}

export function PartsSearchModal({ 
    osId, 
    deviceModel, 
    currentUnitId,
    tenantId,
    technicianId,
    isOpen,
    onClose, 
    onPartUsed 
}: PartsSearchModalProps) {
    const [searchTerm, setSearchTerm] = useState(deviceModel || "");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<PartSearchResult[]>([]);
    const [addedParts, setAddedParts] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [unitFilter, setUnitFilter] = useState<string>("all");

    const performSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const data = await searchPartsByModel(tenantId, query);
            setResults(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao buscar peças");
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    const loadAddedParts = useCallback(async () => {
        try {
            const parts = await getOSParts(osId);
            setAddedParts(parts);
        } catch (error) {
            console.error(error);
        }
    }, [osId]);

    useEffect(() => {
        if (isOpen) {
            performSearch(searchTerm);
            loadAddedParts();
        }
    }, [isOpen, performSearch, loadAddedParts]);

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            performSearch(searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, performSearch, isOpen]);

    const handleUsePart = async (part: PartSearchResult, unitId: string) => {
        if (unitId !== currentUnitId) {
            toast.error("Esta peça está em outra unidade. Solicite transferência do aparelho.");
            return;
        }

        const confirmUse = window.confirm(`Usar 1x ${part.name} da unidade atual?`);
        if (!confirmUse) return;

        setIsProcessing(`${part.id}-${unitId}`);
        try {
            const res = await usePartInOS({
                tenantId,
                osId,
                catalogItemId: part.id,
                unitId,
                qty: 1,
                technicianId
            });

            if (res.success) {
                toast.success("Peça adicionada!");
                setResults(prev => prev.map(p => {
                    if (p.id === part.id) {
                        return {
                            ...p,
                            totalStock: p.totalStock - 1,
                            stockByUnit: p.stockByUnit.map(u => u.unitId === unitId ? { ...u, qty: u.qty - 1 } : u)
                        };
                    }
                    return p;
                }));
                loadAddedParts();
                onPartUsed({ id: part.id, name: part.name, qty: 1 });
            } else {
                toast.error(res.error || "Erro ao adicionar peça");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRemovePart = async (osPartId: string) => {
        if (!window.confirm("Remover esta peça da OS e devolver ao estoque?")) return;
        
        setIsProcessing(osPartId);
        try {
            await removePartFromOS({
                tenantId,
                osPartsId: osPartId,
                technicianId
            });
            toast.success("Peça removida");
            loadAddedParts();
            performSearch(searchTerm); // Refresh main list stock
        } catch (error: any) {
            toast.error(error.message || "Erro ao remover");
        } finally {
            setIsProcessing(null);
        }
    };

    const units = useMemo(() => {
        const uSet = new Map<string, string>();
        results.forEach(r => r.stockByUnit.forEach(u => uSet.set(u.unitId, u.unitName)));
        return Array.from(uSet.entries()).map(([id, name]) => ({ id, name }));
    }, [results]);

    const groupedResults = useMemo(() => {
        const groups: Record<string, PartSearchResult[]> = {};
        const typeOrder = ['tela', 'bateria', 'conector', 'camera', 'tampa', 'outro'];
        
        results.forEach(part => {
            const type = part.partType.toLowerCase();
            const groupKey = typeOrder.includes(type) ? type : 'outro';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(part);
        });

        return groups;
    }, [results]);

    const searchSummary = useMemo(() => {
        if (results.length === 0) return null;
        const unitStats: Record<string, number> = {};
        results.forEach(r => r.stockByUnit.forEach(u => {
            unitStats[u.unitName] = (unitStats[u.unitName] || 0) + u.qty;
        }));
        
        const unitStrings = Object.entries(unitStats).map(([name, qty]) => `${name}: ${qty}`);
        return `${results.length} peças encontradas · ${unitStrings.join(' · ')}`;
    }, [results]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-5xl w-full h-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
                    <div className="flex gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                            <Wrench size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pecas em Estoque</h2>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider mt-1">{searchSummary || "Refine sua busca"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar & Filters */}
                <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar por modelo ou componente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-base shadow-sm"
                            />
                            {loading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-indigo-500" size={20} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            <button
                                onClick={() => setUnitFilter("all")}
                                className={cn(
                                    "h-14 px-6 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2",
                                    unitFilter === "all" ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-100 text-slate-400"
                                )}
                            >
                                TODAS AS LOJAS
                            </button>
                            {units.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setUnitFilter(u.id)}
                                    className={cn(
                                        "h-14 px-6 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2",
                                        unitFilter === u.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-100 text-slate-400"
                                    )}
                                >
                                    {u.name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                    <div className="space-y-10">
                        {['tela', 'bateria', 'conector', 'camera', 'tampa', 'outro'].map(groupKey => {
                            const groupItems = (groupedResults[groupKey] || []).filter(p => 
                                unitFilter === "all" || p.stockByUnit.some(u => u.unitId === unitFilter && u.qty > 0)
                            );
                            if (groupItems.length === 0) return null;

                            return (
                                <div key={groupKey} className="space-y-5">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        {groupKey === 'outro' ? 'OUTROS COMPONENTES' : groupKey.toUpperCase()}
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {groupItems.map(part => (
                                            <div 
                                                key={part.id} 
                                                className={cn(
                                                    "bg-white border border-slate-100 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-slate-100/50 group",
                                                    part.totalStock === 0 && "opacity-50"
                                                )}
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h4 className="text-lg font-black text-slate-800">{part.name}</h4>
                                                            <span className={cn(
                                                                "px-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                                                part.quality === 'original' ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                                                            )}>
                                                                {part.quality}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {part.matchedModels.map(m => (
                                                                <span key={m} className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3 lg:border-l lg:pl-6 border-slate-100">
                                                        {part.stockByUnit.map(unit => {
                                                            if (unitFilter !== "all" && unit.unitId !== unitFilter) return null;
                                                            return (
                                                                <div key={unit.unitId} className="flex flex-col gap-1 items-end min-w-[100px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn(
                                                                            "w-2 h-2 rounded-full",
                                                                            unit.status === 'ok' ? "bg-emerald-500" : 
                                                                            unit.status === 'low' ? "bg-amber-500" : "bg-red-500"
                                                                        )} />
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{unit.unitName}</span>
                                                                    </div>
                                                                    <p className={cn(
                                                                        "text-lg font-black tabular-nums",
                                                                        unit.qty > 0 ? "text-slate-700" : "text-slate-300"
                                                                    )}>
                                                                        {unit.qty}
                                                                    </p>
                                                                    {unit.qty > 0 && (
                                                                        unit.unitId === currentUnitId ? (
                                                                            <button
                                                                                disabled={!!isProcessing}
                                                                                onClick={() => handleUsePart(part, unit.unitId)}
                                                                                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                                                            >
                                                                                {isProcessing === `${part.id}-${unit.unitId}` ? <Loader2 size={12} className="animate-spin" /> : "+ USAR"}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md line-clamp-1 max-w-[120px] text-center">
                                                                                REQUER ENVIO
                                                                            </span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {part.totalStock === 0 && (
                                                            <div className="px-6 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-black uppercase">SEM ESTOQUE</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {results.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Package size={64} className="text-slate-200 mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">Nenhum resultado para "{searchTerm}"</h3>
                                <p className="text-sm text-slate-300">Tente buscar por um modelo relacionado ou categoria.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Added Parts Section (Lower) */}
                {addedParts.length > 0 && (
                    <div className="shrink-0 bg-slate-900 text-white p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 size={24} className="text-emerald-400" />
                            <h3 className="text-lg font-black">Peças adicionadas nesta OS</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {addedParts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                            <Wrench size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold truncate max-w-[150px]">{p.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                {p.qty}x · {p.unitName} · R$ {(p.costPrice/100).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemovePart(p.id)}
                                        disabled={!!isProcessing}
                                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                                    >
                                        {isProcessing === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
