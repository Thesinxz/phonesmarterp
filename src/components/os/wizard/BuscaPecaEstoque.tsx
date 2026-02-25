"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Package, X, Loader2, Save, ShoppingCart, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { createProduto } from "@/services/estoque";
import { getPecasPorModelo, TIPOS_PECA, type PecaCatalogo } from "@/services/pecas";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatCurrency";

interface BuscaPecaEstoqueProps {
    onSelect: (peca: any) => void;
    modeloEquipamento?: string; // Modelo do aparelho da OS atual
}

export function BuscaPecaEstoque({ onSelect, modeloEquipamento }: BuscaPecaEstoqueProps) {
    const { profile } = useAuth();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Peças sugeridas do catálogo (por modelo)
    const [pecasSugeridas, setPecasSugeridas] = useState<PecaCatalogo[]>([]);
    const [loadingSugeridas, setLoadingSugeridas] = useState(false);

    const [newProduct, setNewProduct] = useState({
        nome: "",
        preco_venda: "",
        preco_custo: "",
        estoque_qtd: "1",
        categoria: "peças"
    });

    // Carregar peças sugeridas quando houver modelo do equipamento
    useEffect(() => {
        if (modeloEquipamento && profile?.empresa_id) {
            loadSugeridas();
        }
    }, [modeloEquipamento, profile?.empresa_id]);

    async function loadSugeridas() {
        if (!modeloEquipamento || !profile?.empresa_id) return;
        setLoadingSugeridas(true);
        try {
            const pecas = await getPecasPorModelo(profile.empresa_id, modeloEquipamento);
            setPecasSugeridas(pecas);
        } catch (e) {
            console.warn("Erro ao buscar peças sugeridas:", e);
        } finally {
            setLoadingSugeridas(false);
        }
    }

    const handleSearch = async (val: string) => {
        setSearch(val);
        if (val.trim().length < 2) {
            setResults([]);
            return;
        }

        if (!profile?.empresa_id) return;

        setLoading(true);
        const supabase = createClient();
        try {
            // Buscar tanto no estoque de produtos quanto no catálogo de peças
            const [produtosRes, pecasRes] = await Promise.all([
                supabase
                    .from("produtos")
                    .select("id, nome, preco_venda_centavos, preco_custo_centavos, estoque_qtd, categoria")
                    .eq("empresa_id", profile.empresa_id)
                    .ilike("nome", `%${val}%`)
                    .limit(5),
                supabase
                    .from("pecas_catalogo")
                    .select("*")
                    .eq("empresa_id", profile.empresa_id)
                    .ilike("nome", `%${val}%`)
                    .limit(5)
            ]);

            const prods = (produtosRes.data || []).map((p: any) => ({ ...p, _source: "produto" }));
            const pecas = (pecasRes.data || []).map((p: any) => ({
                id: p.id,
                nome: p.nome,
                preco_venda_centavos: p.preco_venda_centavos,
                preco_custo_centavos: p.preco_custo_centavos,
                estoque_qtd: p.estoque_qtd,
                categoria: p.tipo_peca,
                qualidade: p.qualidade,
                _source: "catalogo"
            }));

            setResults([...pecas, ...prods]);
        } catch (err) {
            console.error("Erro na busca:", err);
        } finally {
            setLoading(false);
        }
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
                produto_id: data.id,
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

    const handleSearchClick = (prod: any) => {
        onSelect({
            id: prod.id,
            nome: prod.nome,
            preco: prod.preco_venda_centavos,
            custo: prod.preco_custo_centavos,
            qtd: 1
        });
        setResults([]);
        setSearch("");
        toast.success(`${prod.nome} adicionado!`);
    };

    const handleSelectSugerida = (peca: PecaCatalogo) => {
        onSelect({
            id: peca.id,
            nome: peca.nome,
            preco: peca.preco_venda_centavos,
            custo: peca.preco_custo_centavos,
            qtd: 1
        });
        toast.success(`${peca.nome} adicionado!`);
    };

    // Agrupar sugeridas por tipo
    const sugeridasPorTipo = pecasSugeridas.reduce((acc, p) => {
        const tipo = p.tipo_peca;
        if (!acc[tipo]) acc[tipo] = [];
        acc[tipo].push(p);
        return acc;
    }, {} as Record<string, PecaCatalogo[]>);

    return (
        <div className="space-y-4 relative">
            {/* Peças sugeridas por modelo */}
            {modeloEquipamento && pecasSugeridas.length > 0 && !showNewForm && (
                <div className="bg-gradient-to-r from-brand-50 to-indigo-50 rounded-2xl border border-brand-100 p-5 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Wrench size={16} className="text-brand-600" />
                        <h4 className="text-sm font-black text-brand-700">
                            Peças compatíveis com {modeloEquipamento}
                        </h4>
                        <span className="text-[10px] bg-brand-100 text-brand-600 font-bold px-2 py-0.5 rounded-full">
                            {pecasSugeridas.length} peças
                        </span>
                    </div>

                    {Object.entries(sugeridasPorTipo).map(([tipo, pecas]) => {
                        const tipoInfo = TIPOS_PECA.find(t => t.value === tipo);
                        return (
                            <div key={tipo}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    {tipoInfo?.emoji} {tipoInfo?.label || tipo}
                                </p>
                                <div className="space-y-1">
                                    {pecas.map(peca => (
                                        <button
                                            key={peca.id}
                                            type="button"
                                            onClick={() => handleSelectSugerida(peca)}
                                            className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-white hover:border-brand-200 hover:bg-brand-50/50 transition-all text-left group"
                                        >
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{peca.nome}</p>
                                                <div className="flex gap-2 mt-0.5">
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                                                        peca.qualidade === 'original' ? "bg-emerald-100 text-emerald-700" :
                                                            peca.qualidade === 'oem' ? "bg-blue-100 text-blue-700" :
                                                                "bg-amber-100 text-amber-700"
                                                    )}>
                                                        {peca.qualidade}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-bold",
                                                        peca.estoque_qtd > 0 ? "text-emerald-600" : "text-red-500"
                                                    )}>
                                                        {peca.estoque_qtd > 0 ? `${peca.estoque_qtd} em estoque` : "Sem estoque"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-brand-600">
                                                    {formatCurrency(peca.preco_venda_centavos)}
                                                </span>
                                                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {loadingSugeridas && modeloEquipamento && (
                <div className="text-center py-4 text-sm text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Buscando peças para {modeloEquipamento}...
                </div>
            )}

            {/* Busca manual */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar peça no estoque ou catálogo..."
                        className="w-full h-14 pl-12 pr-12 rounded-2xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && search && results.length === 0) {
                                onSelect({
                                    id: `manual-${Date.now()}`,
                                    produto_id: null,
                                    nome: search,
                                    preco: 0,
                                    custo: 0,
                                    qtd: 1,
                                    isManual: true
                                });
                                setSearch("");
                                setResults([]);
                                toast.info("Peça manual adicionada! Ajuste o preço abaixo.");
                            }
                        }}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(""); setResults([]); }}
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

            {/* Resultados da busca */}
            {!showNewForm && results.length > 0 && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 z-20 absolute left-0 right-0 max-h-[400px] overflow-y-auto">
                    {results.map(prod => (
                        <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleSearchClick(prod)}
                            className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left border-b border-slate-100 last:border-0"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    {prod._source === "catalogo" ? <Wrench size={24} /> : <Package size={24} />}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-base">{prod.nome}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest",
                                            prod.estoque_qtd > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {prod.estoque_qtd > 0 ? `Estoque: ${prod.estoque_qtd}` : "Sem estoque"}
                                        </span>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                                            {prod._source === "catalogo" ? `🔧 ${prod.categoria}` : prod.categoria}
                                        </span>
                                        {prod.qualidade && (
                                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                                {prod.qualidade}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-brand-600">{formatCurrency(prod.preco_venda_centavos)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Empty State / Manual */}
            {!showNewForm && search.length >= 2 && results.length === 0 && !loading && (
                <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-6 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <Package className="text-slate-300" size={32} />
                    </div>
                    <div>
                        <p className="text-slate-700 font-bold text-lg">"{search}" não encontrado</p>
                        <p className="text-slate-400 text-sm">O que você deseja fazer?</p>
                    </div>
                    <div className="max-w-xs mx-auto space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                            <input
                                type="text"
                                placeholder="0,00"
                                id="manual-price-input"
                                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold focus:bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const priceBtn = document.getElementById('add-manual-btn');
                                        priceBtn?.click();
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            id="add-manual-btn"
                            onClick={() => {
                                const priceInput = document.getElementById('manual-price-input') as HTMLInputElement;
                                const val = Math.round(parseFloat(priceInput?.value.replace(",", ".") || "0") * 100);
                                onSelect({
                                    id: `manual-${Date.now()}`,
                                    produto_id: null,
                                    nome: search,
                                    preco: val,
                                    custo: 0,
                                    qtd: 1,
                                    isManual: true
                                });
                                setSearch("");
                                setResults([]);
                                toast.success("Peça manual adicionada!");
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <ShoppingCart size={20} /> Adicionar Manualmente
                        </button>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                        <button
                            type="button"
                            onClick={() => {
                                setNewProduct(p => ({ ...p, nome: search }));
                                setShowNewForm(true);
                            }}
                            className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-2 mx-auto"
                        >
                            <Plus size={16} /> Cadastrar permanentemente no Estoque
                        </button>
                    </div>
                </div>
            )}

            {/* Formulário de Cadastro Rápido */}
            {showNewForm && (
                <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden animate-in zoom-in-95">
                    <div className="bg-indigo-600 px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <Plus size={20} />
                            <h3 className="font-bold">Cadastro Rápido de Peça</h3>
                        </div>
                        <button type="button" onClick={() => setShowNewForm(false)} className="text-white/60 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Produto / Peça</label>
                                <input
                                    type="text"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                    value={newProduct.nome}
                                    onChange={e => setNewProduct(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="Ex: Tela Original iPhone 13"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Preço de Venda (R$)</label>
                                <input
                                    type="text"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                    value={newProduct.preco_venda}
                                    onChange={e => setNewProduct(p => ({ ...p, preco_venda: e.target.value }))}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Preço de Custo (R$)</label>
                                <input
                                    type="text"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                    value={newProduct.preco_custo}
                                    onChange={e => setNewProduct(p => ({ ...p, preco_custo: e.target.value }))}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Qtd em Estoque</label>
                                <input
                                    type="number"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                    value={newProduct.estoque_qtd}
                                    onChange={e => setNewProduct(p => ({ ...p, estoque_qtd: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                                <select
                                    className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                    value={newProduct.categoria}
                                    onChange={e => setNewProduct(p => ({ ...p, categoria: e.target.value }))}
                                >
                                    <option value="peças">Peças</option>
                                    <option value="acessórios">Acessórios</option>
                                    <option value="periféricos">Periféricos</option>
                                    <option value="diversos">Diversos</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setShowNewForm(false)}
                                className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleCreateProduct} disabled={saving}
                                className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                                {saving ? "Salvando..." : "Salvar e Adicionar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
