"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Barcode, CheckCircle2, CheckSquare, Target, AlertTriangle, Save, RefreshCw, Smartphone, BarChart3 } from "lucide-react";
import { getProdutos, processarBalanco, type BalancoItem } from "@/services/estoque";
import { type Produto } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface ScannedItem {
    produto: Produto;
    qtdEsperada: number;
    qtdContada: number;
    ultimaLeitura?: Date;
}

export default function BalancoEstoquePage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [lookupMap, setLookupMap] = useState<Record<string, string>>({});
    const [inventory, setInventory] = useState<Record<string, ScannedItem>>({});
    const [recentScans, setRecentScans] = useState<string[]>([]);
    const [inputVal, setInputVal] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const [filtroTab, setFiltroTab] = useState<"todos" | "divergentes" | "pendentes">("todos");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const produtos = await getProdutos();

            const newInventory: Record<string, ScannedItem> = {};
            const newLookup: Record<string, string> = {};

            produtos.forEach(p => {
                newInventory[p.id] = {
                    produto: p,
                    qtdEsperada: p.estoque_qtd,
                    qtdContada: 0
                };

                if (p.codigo_barras) newLookup[p.codigo_barras.toUpperCase()] = p.id;
                if (p.sku) newLookup[p.sku.toUpperCase()] = p.id;
                if (p.imei) newLookup[p.imei.toUpperCase()] = p.id;
            });

            setInventory(newInventory);
            setLookupMap(newLookup);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar estoque base");
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        const code = inputVal.trim().toUpperCase();
        if (!code) return;

        const prodId = lookupMap[code];
        if (!prodId) {
            toast.error(`Código ${code} não reconhecido no sistema!`);
            // Pode tocar um som de erro aqui se desejar
        } else {
            setInventory(prev => {
                const item = prev[prodId];
                return {
                    ...prev,
                    [prodId]: {
                        ...item,
                        qtdContada: item.qtdContada + 1,
                        ultimaLeitura: new Date()
                    }
                };
            });

            setRecentScans(prev => {
                const filtered = prev.filter(id => id !== prodId);
                return [prodId, ...filtered]; // Move para o topo
            });

            toast.success(`${inventory[prodId].produto.nome} contabilizado!`, { duration: 1500 });
        }

        setInputVal("");
        inputRef.current?.focus();
    };

    const playSuccessSound = () => {
        // Opcional: sons de bipe para scanners (Pode ser implementado futuramente)
    };

    const handleManualAdjustment = (id: string, diff: number) => {
        setInventory(prev => {
            const item = prev[id];
            const newQtd = Math.max(0, item.qtdContada + diff);
            return {
                ...prev,
                [id]: { ...item, qtdContada: newQtd }
            };
        });

        setRecentScans(prev => {
            const filtered = prev.filter(pId => pId !== id);
            return [id, ...filtered];
        });

        inputRef.current?.focus();
    };

    async function handleFinalize() {
        if (!profile) return;
        if (!confirm("Tem certeza que deseja aplicar as divergências no estoque atual? Todas as quantidades serão ajustadas.")) return;

        setProcessing(true);
        try {
            const itensParaAjuste: BalancoItem[] = Object.values(inventory)
                .filter(item => item.qtdContada !== item.qtdEsperada)
                .map(item => ({
                    produto_id: item.produto.id,
                    empresa_id: profile.empresa_id,
                    qtdEsperada: item.qtdEsperada,
                    qtdContada: item.qtdContada
                }));

            if (itensParaAjuste.length > 0) {
                await processarBalanco(itensParaAjuste);
                toast.success(`${itensParaAjuste.length} produtos ajustados com sucesso!`);
            } else {
                toast.info("Nenhuma divergência de estoque encontrada.");
            }

            router.push("/estoque");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar balanço de estoque.");
            setProcessing(false);
        }
    }

    const allItems = Object.values(inventory);
    const totalEsperado = allItems.reduce((acc, curr) => acc + curr.qtdEsperada, 0);
    const totalContado = allItems.reduce((acc, curr) => acc + curr.qtdContada, 0);

    // Calcula Progresso
    const displayList = allItems
        .filter(item => {
            if (filtroTab === "divergentes") return item.qtdContada !== item.qtdEsperada;
            if (filtroTab === "pendentes") return item.qtdContada < item.qtdEsperada;
            return true;
        })
        .sort((a, b) => {
            // Ordenar por recentes primeiro se existirem
            const aRecent = recentScans.indexOf(a.produto.id);
            const bRecent = recentScans.indexOf(b.produto.id);
            if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
            if (aRecent !== -1) return -1;
            if (bRecent !== -1) return 1;
            return a.produto.nome.localeCompare(b.produto.nome);
        });

    if (loading) {
        return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent flex items-center justify-center rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 page-enter max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/estoque" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Balanço de Estoque</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Escaneie os itens para reconciliar seu estoque</p>
                    </div>
                </div>

                <button
                    onClick={handleFinalize}
                    disabled={processing}
                    className="btn-primary h-11 px-6 flex items-center gap-2"
                >
                    {processing ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Processar Atualização
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Scanner Interface */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="bg-indigo-600 border-indigo-500 shadow-indigo-500/20 text-white p-6 relative overflow-hidden">
                        <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                        <h2 className="text-white/80 font-bold mb-4 flex items-center gap-2">
                            <Target size={18} /> Módulo Scanner
                        </h2>

                        <form onSubmit={handleScan} className="relative z-10">
                            <div className="bg-white/10 rounded-xl p-1 mb-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputVal}
                                    onChange={e => setInputVal(e.target.value)}
                                    placeholder="Bipar Código (IMEI ou SKU)..."
                                    className="w-full h-14 bg-white rounded-lg px-4 text-slate-800 font-bold tracking-wider outline-none ring-2 ring-transparent focus:ring-white border-0 transition-all placeholder:text-slate-400 placeholder:font-normal"
                                />
                            </div>
                            <p className="text-xs text-white/70 text-center font-medium mt-3 flex items-center justify-center gap-1.5">
                                <CheckSquare size={14} /> Foco Automático Ativado
                            </p>
                        </form>
                    </GlassCard>

                    <GlassCard title="Resumo do Balanço" icon={BarChart3}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mapeado no Sistema</span>
                                <span className="text-2xl font-black text-slate-700">{totalEsperado}</span>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-center items-center">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Contado</span>
                                <span className="text-2xl font-black text-indigo-700">{totalContado}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-sm font-bold text-slate-600">Progresso</span>
                                <span className="text-sm font-bold text-indigo-600">{Math.round((totalContado / (totalEsperado || 1)) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (totalContado / (totalEsperado || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Lista de Auditoria */}
                <div className="lg:col-span-2">
                    <GlassCard>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="text-emerald-500" size={20} />
                                Auditoria de Produtos
                            </h2>

                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setFiltroTab("todos")}
                                    className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filtroTab === "todos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                >
                                    Todos ({allItems.length})
                                </button>
                                <button
                                    onClick={() => setFiltroTab("divergentes")}
                                    className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filtroTab === "divergentes" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                >
                                    Divergentes ({allItems.filter(i => i.qtdContada !== i.qtdEsperada).length})
                                </button>
                                <button
                                    onClick={() => setFiltroTab("pendentes")}
                                    className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filtroTab === "pendentes" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                                >
                                    Faltando ({allItems.filter(i => i.qtdContada < i.qtdEsperada).length})
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {displayList.map((item) => {
                                const isDivergent = item.qtdContada !== item.qtdEsperada;
                                const isScanned = item.qtdContada > 0;
                                const isRecentlyScanned = recentScans[0] === item.produto.id;

                                return (
                                    <div
                                        key={item.produto.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            isDivergent ? "bg-red-50/30 border-red-100" : "bg-emerald-50/30 border-emerald-100",
                                            isRecentlyScanned && "ring-2 ring-indigo-500 scale-[1.01] shadow-md bg-indigo-50/50 border-indigo-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-white border shadow-sm flex items-center justify-center shrink-0">
                                                {item.produto.imagem_url ? (
                                                    <img src={item.produto.imagem_url} alt="Prod" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Smartphone className="text-slate-300" size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">{item.produto.nome}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    {item.produto.codigo_barras && (
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                            <Barcode size={10} /> {item.produto.codigo_barras}
                                                        </span>
                                                    )}
                                                    {item.produto.imei && (
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                            # {item.produto.imei}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Sistema</p>
                                                <p className="font-mono text-sm font-medium text-slate-600">{item.qtdEsperada}</p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Contado</p>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleManualAdjustment(item.produto.id, -1)} className="w-6 h-6 rounded-md bg-white border shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold leading-none select-none">-</button>
                                                    <span className={cn("font-mono font-black text-lg min-w-[30px] text-center", isDivergent ? "text-rose-600" : "text-emerald-600")}>
                                                        {item.qtdContada}
                                                    </span>
                                                    <button onClick={() => handleManualAdjustment(item.produto.id, 1)} className="w-6 h-6 rounded-md bg-white border shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 font-bold leading-none select-none">+</button>
                                                </div>
                                            </div>

                                            <div className="w-8 flex justify-end">
                                                {isDivergent ? (
                                                    <AlertTriangle className="text-rose-500" size={20} />
                                                ) : (
                                                    <CheckCircle2 className="text-emerald-500" size={20} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {displayList.length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic">
                                    Nenhum item encontrado para o filtro selecionado.
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

            </div>
        </div>
    );
}
