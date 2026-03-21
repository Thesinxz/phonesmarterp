"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Layers, Plus, Tag, Save, Trash2, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import type { PricingSegment, Brand, ProductType } from "@/types/database";
import { ModelAliasesPanel } from "./ModelAliasesPanel";

export function CatalogoPanel({ initialTab }: { initialTab?: 'segmentos' | 'marcas' | 'tipos' | 'apelidos' }) {
    const { profile } = useAuth();
    const supabase = createClient() as any;

    const [segments, setSegments] = useState<PricingSegment[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'segmentos' | 'marcas' | 'tipos' | 'apelidos'>(initialTab || 'segmentos');

    // Sincronizar activeTab se o prop mudar
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Módulos
    useEffect(() => {
        if (profile?.empresa_id) {
            loadData();
        }
    }, [profile?.empresa_id]);

    async function loadData() {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const [bRes, sRes, tRes] = await Promise.all([
                supabase.from('brands').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('pricing_segments').select('*').eq('empresa_id', profile.empresa_id).order('name'),
                supabase.from('product_types').select('*').eq('empresa_id', profile.empresa_id).order('name')
            ]);
            
            if (bRes.data) setBrands(bRes.data);
            if (sRes.data) setSegments(sRes.data);
            if (tRes.data) setProductTypes(tRes.data);
        } catch (e) {
            console.error("Erro loadData:", e);
            toast.error("Erro ao carregar catálogo");
        } finally {
            setLoading(false);
        }
    }

    // Formulários Add
    const [newSegmentName, setNewSegmentName] = useState("");
    const [newSegmentMargin, setNewSegmentMargin] = useState("");

    const [newBrandName, setNewBrandName] = useState("");
    const [newBrandSegment, setNewBrandSegment] = useState("");

    const [newTypeName, setNewTypeName] = useState("");
    const [showDeviceSpecs, setShowDeviceSpecs] = useState(false);
    const [showImei, setShowImei] = useState(false);

    async function handleAddSegment(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        try {
            const marginValue = newSegmentMargin.replace(',', '.');
            const marginNum = Math.round((parseFloat(marginValue) || 0) * 100);
            
            const { error } = await supabase.from('pricing_segments').insert({
                empresa_id: profile.empresa_id,
                name: newSegmentName,
                default_margin: marginNum,
                description: null
            });
            if (error) throw error;
            toast.success("Segmento adicionado.");
            setNewSegmentName("");
            setNewSegmentMargin("");
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erro");
        }
    }

    async function handleDeleteSegment(id: string) {
        if (typeof window !== "undefined" && !window.confirm("Remover segmento? Modelos que o usavam perderão o link.")) return;
        try {
            await supabase.from('pricing_segments').delete().eq('id', id);
            toast.success("Removido com sucesso");
            loadData();
        } catch (e: any) {
            toast.error("Erro ao remover");
        }
    }

    async function handleAddBrand(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        try {
            const { error } = await supabase.from('brands').insert({
                empresa_id: profile.empresa_id,
                name: newBrandName,
                default_pricing_segment_id: newBrandSegment || null
            });
            if (error) throw error;
            toast.success("Marca adicionada.");
            setNewBrandName("");
            setNewBrandSegment("");
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erro");
        }
    }

    async function handleDeleteBrand(id: string) {
        if (typeof window !== "undefined" && !window.confirm("Remover marca? Produtos ficarão sem marca.")) return;
        try {
            await supabase.from('brands').delete().eq('id', id);
            toast.success("Removida com sucesso");
            loadData();
        } catch (e: any) {
            toast.error("Erro ao remover. Remova dos produtos antes.");
        }
    }

    async function handleAddType(e: React.FormEvent) {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        try {
            const slug = newTypeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            const { error } = await supabase.from('product_types').insert({
                empresa_id: profile.empresa_id,
                name: newTypeName,
                slug,
                show_device_specs: showDeviceSpecs,
                show_imei: showImei,
                show_grade: showDeviceSpecs,
                show_battery_health: showDeviceSpecs
            });
            if (error) throw error;
            toast.success("Tipo de produto adicionado.");
            setNewTypeName("");
            setShowDeviceSpecs(false);
            setShowImei(false);
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Erro");
        }
    }

    async function handleDeleteType(id: string) {
        if (typeof window !== "undefined" && !window.confirm("Remover tipo de produto?")) return;
        try {
            await supabase.from('product_types').delete().eq('id', id);
            toast.success("Removido com sucesso");
            loadData();
        } catch (e: any) {
            toast.error("Erro ao remover");
        }
    }

    const formatBRL = (cents: number) => {
        if (isNaN(cents)) return "0,00";
        return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
            {!initialTab && (
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('segmentos')}
                        className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all", activeTab === 'segmentos' ? "bg-brand-500 text-white shadow-brand-glow" : "bg-white text-slate-500")}
                    >
                        Perfis de Precificação
                    </button>
                    <button
                        onClick={() => setActiveTab('marcas')}
                        className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all", activeTab === 'marcas' ? "bg-brand-500 text-white shadow-brand-glow" : "bg-white text-slate-500")}
                    >
                        Marcas
                    </button>
                    <button
                        onClick={() => setActiveTab('tipos')}
                        className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all", activeTab === 'tipos' ? "bg-brand-500 text-white shadow-brand-glow" : "bg-white text-slate-500")}
                    >
                        Tipos de Produto (Categorias)
                    </button>
                    <button
                        onClick={() => setActiveTab('apelidos')}
                        className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all", activeTab === 'apelidos' ? "bg-brand-500 text-white shadow-brand-glow" : "bg-white text-slate-500")}
                    >
                        Equivalência de Modelos
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-slate-400 p-8 text-center animate-pulse font-bold">Carregando dados...</div>
            ) : (
                <>
                    {activeTab === 'segmentos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GlassCard title="Perfis de Precificação" icon={Layers}>
                                <p className="text-xs text-slate-500 mb-2">Cadastre as regras de margem de lucro por perfil (Ex: Apple, Xiaomi, Usados). A margem é em R$ e será somada ao custo do produto na hora da precificação.</p>
                                <p className="text-[11px] text-slate-400 mb-6">
                                  Perfis de margem usados nas ferramentas de cálculo e precificação de produtos.
                                  Não são categorias do catálogo — para categorizar produtos, use a aba Categorias.
                                </p>

                                <form onSubmit={handleAddSegment} className="flex gap-2 items-end mb-6 pb-6 border-b border-slate-100">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Perfil</label>
                                        <input required value={newSegmentName} onChange={e => setNewSegmentName(e.target.value)} placeholder="Ex: Apple Semi Novos" className="input-glass mt-1 w-full" />
                                    </div>
                                    <div className="w-32">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Margem (R$)</label>
                                        <input required value={newSegmentMargin} onChange={e => setNewSegmentMargin(e.target.value)} placeholder="Ex: 400,00" className="input-glass mt-1 w-full" />
                                    </div>
                                    <button className="btn-primary h-10 px-4" title="Novo Perfil"><Plus size={16} /></button>
                                </form>

                                <div className="space-y-3">
                                    {segments.map(seg => (
                                        <div key={seg.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{seg.name}</p>
                                                <p className="text-xs text-brand-600 font-black">+ R$ {formatBRL(seg.default_margin)} de perfil base</p>
                                            </div>
                                            <button onClick={() => handleDeleteSegment(seg.id)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {segments.length === 0 && <p className="text-sm text-slate-500 italic">Nenhum segmento cadastrado.</p>}
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {activeTab === 'marcas' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GlassCard title="Marcas de Produtos" icon={Tag}>
                                <p className="text-xs text-slate-500 mb-6">Cadastre as marcas (Ex: Apple, Xiaomi). Se a marca seguir um padrão fixo de preços, adicione um segmento padrão para facilitar no cadastro de produtos.</p>

                                <form onSubmit={handleAddBrand} className="flex gap-2 items-end mb-6 pb-6 border-b border-slate-100">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Marca</label>
                                        <input required value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Ex: Apple" className="input-glass mt-1 w-full" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Segmento Padrão (Opcional)</label>
                                        <select value={newBrandSegment} onChange={e => setNewBrandSegment(e.target.value)} className="input-glass mt-1 w-full text-sm font-bold">
                                            <option value="">Nenhum / Escolher depois</option>
                                            {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <button className="btn-primary h-10 px-4"><Plus size={16} /></button>
                                </form>

                                <div className="space-y-3">
                                    {brands.map(brand => (
                                        <div key={brand.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{brand.name}</p>
                                                {brand.default_pricing_segment_id && (
                                                    <p className="text-xs text-slate-500 font-medium">Lincado ao perfil: <span className="font-bold">{segments.find(s => s.id === brand.default_pricing_segment_id)?.name}</span></p>
                                                )}
                                            </div>
                                            <button onClick={() => handleDeleteBrand(brand.id)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {brands.length === 0 && <p className="text-sm text-slate-500 italic">Nenhuma marca cadastrada.</p>}
                                </div>
                            </GlassCard>
                        </div>
                    )}
                    {activeTab === 'tipos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GlassCard title="Tipos de Produto" icon={Layers}>
                                <p className="text-xs text-slate-500 mb-6">Defina as categorias principais (Ex: Smartphone, Tablet, Peça). Isso controla quais campos (IMEI, Bateria) aparecem na edição.</p>
                                
                                <form onSubmit={handleAddType} className="space-y-4 mb-6 pb-6 border-b border-slate-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Categoria</label>
                                        <input required value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Ex: Smartphone" className="input-glass mt-1 w-full" />
                                    </div>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={showImei} onChange={e => setShowImei(e.target.checked)} className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                                            <span className="text-xs font-bold text-slate-700">Controlar IMEI</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={showDeviceSpecs} onChange={e => setShowDeviceSpecs(e.target.checked)} className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                                            <span className="text-xs font-bold text-slate-700">Specs de Celular (Saúde, Grade, etc)</span>
                                        </label>
                                    </div>
                                    <button className="btn-primary w-full py-2">
                                        <Plus size={16} className="mr-2" />
                                        Adicionar Categoria
                                    </button>
                                </form>

                                <div className="space-y-3">
                                    {productTypes.map(type => (
                                        <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{type.name}</p>
                                                <div className="flex gap-2 mt-1">
                                                    {type.show_imei && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-black uppercase">IMEI</span>}
                                                    {type.show_device_specs && <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-black uppercase">SPECS</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteType(type.id)} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {productTypes.length === 0 && <p className="text-sm text-slate-500 italic">Nenhum tipo cadastrado.</p>}
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {activeTab === 'apelidos' && (
                        <ModelAliasesPanel />
                    )}
                </>
            )}
        </div>
    );
}
