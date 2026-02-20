"use client";

import { useState } from "react";
import { Search, Plus, Package, X, Loader2, Save, ShoppingCart, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { createProduto } from "@/services/estoque";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface BuscaPecaEstoqueProps {
    onSelect: (peca: any) => void;
}

export function BuscaPecaEstoque({ onSelect }: BuscaPecaEstoqueProps) {
    const { profile } = useAuth();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [newProduct, setNewProduct] = useState({
        nome: "",
        preco_venda: "",
        preco_custo: "",
        estoque_qtd: "1",
        categoria: "peças"
    });

    const handleSearch = async (val: string) => {
        setSearch(val);
        if (val.trim().length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        console.log(`DEBUG: Buscando peças com termo: "${val}"`);
        const supabase = createClient();
        try {
            const { data, error } = await supabase
                .from("produtos")
                .select("id, nome, preco_venda_centavos, preco_custo_centavos, estoque_qtd, categoria")
                .ilike("nome", `%${val}%`)
                .limit(10);

            if (error) {
                console.error("DEBUG: Erro na busca de produtos:", error);
                toast.error("Erro ao buscar no estoque");
            } else {
                console.log(`DEBUG: Resultado da busca: ${data?.length || 0} itens encontrados`);
                setResults(data || []);
            }
        } catch (err) {
            console.error("DEBUG: Exceção na busca:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProduct = async () => {
        console.log("DEBUG: Iniciando cadastro de produto...", newProduct);
        if (!newProduct.nome || !newProduct.preco_venda) {
            toast.error("Nome e preço são obrigatórios");
            return;
        }

        if (!profile?.empresa_id) {
            toast.error("Sua sessão expirou. Recarregue a página.");
            console.error("DEBUG: Empresa ID ausente no perfil do usuário");
            return;
        }

        setSaving(true);
        try {
            // Limpa formatação brasileira (ex: 1.200,50 -> 1200.50)
            const cleanVenda = newProduct.preco_venda.replace(/\./g, "").replace(",", ".");
            const cleanCusto = newProduct.preco_custo.replace(/\./g, "").replace(",", ".");

            const precoVendaCentavos = Math.round(parseFloat(cleanVenda) * 100);
            const precoCustoCentavos = Math.round(parseFloat(cleanCusto) * 100) || 0;
            const estoque = parseInt(newProduct.estoque_qtd) || 0;

            console.log("DEBUG: Payload convertido para centavos:", { precoVendaCentavos, precoCustoCentavos, estoque });

            const data = await createProduto({
                empresa_id: profile.empresa_id,
                nome: newProduct.nome,
                preco_venda_centavos: precoVendaCentavos,
                preco_custo_centavos: precoCustoCentavos,
                estoque_qtd: estoque,
                categoria: newProduct.categoria,
                condicao: "novo_lacrado",
            } as any);

            console.log("DEBUG: Produto criado com sucesso:", data);
            toast.success("Produto cadastrado e adicionado!");

            // Passa para o wizard o objeto formatado
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
            setNewProduct({
                nome: "",
                preco_venda: "",
                preco_custo: "",
                estoque_qtd: "1",
                categoria: "peças"
            });
        } catch (error: any) {
            console.error("DEBUG: Erro fatal ao cadastrar produto:", error);
            const msg = error.message || JSON.stringify(error);
            toast.error(`Erro ao cadastrar: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const addManualPart = () => {
        if (!search) return;

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
        toast.info("Peça manual adicionada (ajuste o preço no resumo)");
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar peça no estoque..."
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg transition-all"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />}
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setNewProduct(p => ({ ...p, nome: search }));
                        setShowNewForm(true);
                    }}
                    className="h-14 px-6 rounded-2xl bg-slate-800 text-white font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 shrink-0"
                    title="Novo Produto"
                >
                    <Plus size={24} />
                    <span className="hidden sm:inline">Nova Peça</span>
                </button>
            </div>

            {/* Resultados da busca */}
            {!showNewForm && results.length > 0 && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-top-4 z-10">
                    {results.map(prod => (
                        <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                                console.log("DEBUG: Selecionando produto da busca:", prod);
                                onSelect({
                                    id: prod.id,
                                    nome: prod.nome,
                                    preco: prod.preco_venda_centavos,
                                    custo: prod.preco_custo_centavos,
                                    qtd: 1
                                });
                                setResults([]);
                                setSearch("");
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{prod.nome}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                                            Estoque: {prod.estoque_qtd}
                                        </span>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                                            {prod.categoria}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600">R$ {(prod.preco_venda_centavos / 100).toFixed(2)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Empty State / Opção Manual */}
            {!showNewForm && search.length >= 2 && results.length === 0 && !loading && (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                    <p className="text-slate-500 font-medium">Nenhuma peça encontrada com "{search}"</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setNewProduct(p => ({ ...p, nome: search }));
                                setShowNewForm(true);
                            }}
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                        >
                            <Plus size={18} /> Cadastrar "{search}"
                        </button>
                        <button
                            type="button"
                            onClick={addManualPart}
                            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            <ShoppingCart size={18} /> Apenas usar este nome
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
                            <button
                                type="button"
                                onClick={() => setShowNewForm(false)}
                                className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateProduct}
                                disabled={saving}
                                className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                            >
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
