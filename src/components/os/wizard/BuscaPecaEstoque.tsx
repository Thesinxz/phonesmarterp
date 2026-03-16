"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Package, X, Loader2, Save, ShoppingCart, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { createProduto } from "@/services/estoque";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { PartCard } from "./PartCard";
import { ModelPartsPopup } from "./ModelPartsPopup";

interface BuscaPecaEstoqueProps {
    onSelect: (peca: any) => void;
    modeloEquipamento?: string; // Modelo do aparelho da OS atual
    addedParts?: any[];
}

export function BuscaPecaEstoque({ onSelect, modeloEquipamento, addedParts = [] }: BuscaPecaEstoqueProps) {
    const { profile } = useAuth();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showModelPopup, setShowModelPopup] = useState(false);
    const [hasOpenedAuto, setHasOpenedAuto] = useState(false);
    
    // Lista de marcas conhecidas para detecção de busca por modelo
    const brands = ['iphone', 'samsung', 'motorola', 'moto', 'xiaomi', 'redmi', 'poco', 'realme', 'lg', 'asus', 'positivo', 'multilaser'];

    const isModelSearch = (term: string): boolean => {
        const termLower = term.toLowerCase();
        return brands.some(b => termLower.includes(b)) || /^(a\d{2}|s\d{2}|g\d{2})/i.test(term);
    };

    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-abrir popup se houver modelo ao focar ou ao iniciar
    useEffect(() => {
        if (modeloEquipamento && !hasOpenedAuto && !showModelPopup) {
            setShowModelPopup(true);
            setHasOpenedAuto(true);
        }
    }, [modeloEquipamento, hasOpenedAuto]);

    const handleSearch = async (val: string) => {
        setSearch(val);
        const term = val.trim();

        if (term.length < 2) {
            setResults([]);
            return;
        }

        if (isModelSearch(term)) {
            // Modo modelo → popup abre ao digitar se detectado
            // Mas talvez seja melhor o usuário dar enter ou clicar em algo
            // O request diz: "Ao digitar modelo no campo de busca (modo 1 detectado) -> Abrir popup"
            setShowModelPopup(true);
            return;
        }

        // Modo peça → busca inline
        if (!profile?.empresa_id) return;

        setLoading(true);
        const supabase = createClient();
        try {
            const { data, error } = await (supabase as any)
                .from('catalog_items')
                .select('id, name, sale_price, cost_price, stock_qty, part_type, quality, shelf_location, image_url')
                .eq('empresa_id', profile.empresa_id)
                .eq('item_type', 'peca')
                .ilike('name', `%${term}%`)
                .order('stock_qty', { ascending: false })
                .limit(8);

            if (error) throw error;
            setResults(data || []);
        } catch (err) {
            console.error("Erro na busca inline:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFromSource = (part: any, qty: number) => {
        onSelect({
            id: part.id,
            nome: part.name,
            preco: part.sale_price,
            custo: part.cost_price,
            qtd: qty
        });
        // Feedback ja é dado no OSStep4PecasServicos
    };

    const handleCreateProduct = async () => {
        if (!newProduct.nome || !newProduct.preco_venda) {
            toast.error("Nome e preço são obrigatórios");
            return;
        }

        if (!profile?.empresa_id) {
            toast.error("Sua sessão expirou. Recarregue a página.");
            return;
        }

        setSaving(true);
        try {
            const cleanVenda = newProduct.preco_venda.replace(/\./g, "").replace(",", ".");
            const cleanCusto = newProduct.preco_custo.replace(/\./g, "").replace(",", ".");
            const precoVendaCentavos = Math.round(parseFloat(cleanVenda) * 100);
            const precoCustoCentavos = Math.round(parseFloat(cleanCusto) * 100) || 0;
            const estoque = parseInt(newProduct.estoque_qtd) || 0;

            const data = await createProduto({
                empresa_id: profile.empresa_id,
                nome: newProduct.nome,
                preco_venda_centavos: precoVendaCentavos,
                preco_custo_centavos: precoCustoCentavos,
                estoque_qtd: estoque,
                categoria: newProduct.categoria,
                condicao: "peca_reposicao",
            } as any);

            toast.success("Peça cadastrada e adicionada!");
            onSelect({
                id: data.id,
                nome: data.nome,
                preco: data.preco_venda_centavos || precoVendaCentavos,
                custo: data.preco_custo_centavos || precoCustoCentavos,
                qtd: 1
            });
            setSearch("");
            setResults([]);
            setShowNewForm(false);
            setNewProduct({ nome: "", preco_venda: "", preco_custo: "", estoque_qtd: "1", categoria: "peças" });
        } catch (error: any) {
            toast.error(`Erro ao cadastrar: ${error.message || error}`);
        } finally {
            setSaving(false);
        }
    };

    const [newProduct, setNewProduct] = useState({
        nome: "",
        preco_venda: "",
        preco_custo: "",
        estoque_qtd: "1",
        categoria: "peças"
    });

    // Close results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setResults([]);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-4 relative" ref={containerRef}>
            
            {showModelPopup && (
                <ModelPartsPopup 
                  modelo={isModelSearch(search) ? search : (modeloEquipamento || "")}
                  onAdd={handleAddFromSource}
                  onClose={() => {
                      setShowModelPopup(false);
                      setSearch("");
                      setResults([]);
                  }}
                  addedParts={addedParts}
                />
            )}

            {/* Busca manual */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={modeloEquipamento ? `Buscar peças para ${modeloEquipamento}...` : "Buscar peça (ex: frontal, bateria...)"}
                        className="w-full h-14 pl-12 pr-12 rounded-2xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => {
                            if (!search && modeloEquipamento) setShowModelPopup(true);
                        }}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setResults([]);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    )}
                    {loading && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                            <Loader2 className="text-indigo-500 animate-spin" size={20} />
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setNewProduct(p => ({ ...p, nome: search }));
                        setShowNewForm(true);
                    }}
                    className="h-14 px-6 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                >
                    <Plus size={24} />
                    <span className="hidden sm:inline">Nova Peça</span>
                </button>
            </div>

            {/* Resultados da busca (Dropdown) */}
            {results.length > 0 && !showModelPopup && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[400px] overflow-y-auto p-2">
                    {results.map(part => (
                        <PartCard 
                            key={part.id}
                            part={part}
                            onAdd={(qty) => {
                                handleAddFromSource(part, qty);
                                setResults([]);
                                setSearch("");
                            }}
                            alreadyAdded={addedParts.some(p => p.id === part.id)}
                            osModelo={modeloEquipamento}
                        />
                    ))}
                </div>
            )}

            {/* Empty State / Manual */}
            {!showNewForm && search.length >= 2 && results.length === 0 && !loading && !showModelPopup && (
                <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <Package size={24} className="text-slate-300" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700">Peça não encontrada no estoque</p>
                        <p className="text-xs text-slate-400 mt-1">Deseja adicionar como item manual ou cadastrar?</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                        <button
                            type="button"
                            onClick={() => {
                                onSelect({
                                    id: `manual-${Date.now()}`,
                                    nome: search,
                                    preco: 0,
                                    custo: 0,
                                    qtd: 1,
                                    isManual: true
                                });
                                setSearch("");
                                setResults([]);
                                toast.info("Item manual adicionado. Ajuste o preço abaixo.");
                            }}
                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                            Adicionar Manual
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowNewForm(true)}
                            className="flex-1 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
                        >
                            Cadastrar no Estoque
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro Rápido (Simplificado) */}
            {showNewForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNewForm(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-bold">Nova Peça no Estoque</h3>
                            <button onClick={() => setShowNewForm(false)} className="text-white/60 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição</label>
                                <input 
                                    type="text"
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl mt-1 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={newProduct.nome}
                                    onChange={e => setNewProduct(p => ({ ...p, nome: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Preço Venda</label>
                                    <input 
                                        type="text"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl mt-1 outline-none"
                                        value={newProduct.preco_venda}
                                        onChange={e => setNewProduct(p => ({ ...p, preco_venda: e.target.value }))}
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Preço Custo</label>
                                    <input 
                                        type="text"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl mt-1 outline-none"
                                        value={newProduct.preco_custo}
                                        onChange={e => setNewProduct(p => ({ ...p, preco_custo: e.target.value }))}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowNewForm(false)} className="flex-1 h-11 rounded-xl border border-slate-200 font-bold text-slate-500">Cancelar</button>
                                <button type="button" onClick={handleCreateProduct} disabled={saving} className="flex-1 h-11 bg-indigo-600 rounded-xl text-white font-bold shadow-lg shadow-indigo-200">
                                    {saving ? "Salvando..." : "Cadastrar e Adicionar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
