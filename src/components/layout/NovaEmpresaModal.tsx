"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { provisionAdditionalCompany, cloneCompanyData } from "@/services/empresa_vinculos";
import { X, Building2, Save, Loader2, Search, MapPin, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface NovaEmpresaModalProps {
    onClose: () => void;
}

const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function NovaEmpresaModal({ onClose }: NovaEmpresaModalProps) {
    const { user, profile, empresa, userCompanies, refreshProfile } = useAuth();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Advanced Info States
    const [cnpj, setCnpj] = useState("");
    const [searchingCnpj, setSearchingCnpj] = useState(false);
    const [emitente, setEmitente] = useState({
        razao_social: "",
        nome_fantasia: "",
        ie: "",
        logradouro: "",
        numero: "",
        bairro: "",
        municipio: "",
        uf: "SP",
        cep: "",
        telefone: "",
        email: ""
    });

    // Import states
    const [importSourceId, setImportSourceId] = useState(empresa?.id || "");
    const [importClients, setImportClients] = useState(false);
    const [importProducts, setImportProducts] = useState(false);
    const [importConfigs, setImportConfigs] = useState(true);

    async function buscarCnpj() {
        const cnpjClean = cnpj.replace(/\D/g, '');
        if (cnpjClean.length !== 14) {
            toast.error("CNPJ inválido. Digite 14 números.");
            return;
        }

        setSearchingCnpj(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
            if (!res.ok) throw new Error("CNPJ não encontrado");
            const data = await res.json();

            if (data.nome_fantasia || data.razao_social) {
                if (!name) setName(data.nome_fantasia || data.razao_social);
            }

            setEmitente(prev => ({
                ...prev,
                razao_social: data.razao_social || "",
                nome_fantasia: data.nome_fantasia || data.razao_social || "",
                logradouro: data.logradouro || "",
                numero: data.numero || "",
                bairro: data.bairro || "",
                municipio: data.municipio || "",
                uf: data.uf || "SP",
                cep: data.cep || "",
                telefone: data.ddd_telefone_1 || "",
                email: data.email || ""
            }));

            toast.success("Dados da empresa carregados com sucesso!");
            setShowAdvanced(true);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao buscar CNPJ. Verifique se está correto.");
        } finally {
            setSearchingCnpj(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !user || !profile) return;

        setLoading(true);
        try {
            const subdomain = name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 7);

            const result = await provisionAdditionalCompany(
                name.trim(),
                subdomain,
                user.id,
                user.email || "",
                profile.nome,
                cnpj.replace(/\D/g, ''),
                showAdvanced ? { ...emitente, cnpj: cnpj.replace(/\D/g, '') } : {}
            );

            // Se houver opções de importação selecionadas
            if (importSourceId && (importClients || importProducts || importConfigs)) {
                // O provisionAdditionalCompany retorna { empresa_id, usuario_id }
                const newEmpId = result?.[0]?.empresa_id;
                if (newEmpId) {
                    await cloneCompanyData(importSourceId, newEmpId, {
                        clients: importClients,
                        products: importProducts,
                        configs: importConfigs
                    });
                }
            }

            toast.success("Nova empresa criada com sucesso!");
            await refreshProfile();
            onClose();
        } catch (err) {
            console.error("Erro ao criar empresa:", err);
            toast.error("Erro ao criar nova empresa. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Nova Empresa</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">Gestão Multinível / Filial</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 md:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Fantasia *</label>
                            <input
                                autoFocus
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ponto Smart - Filial Centro"
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-brand-500/5 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CNPJ (Opcional)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                    className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-500/10 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-mono font-bold text-slate-700 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={buscarCnpj}
                                    disabled={searchingCnpj || !cnpj}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 disabled:opacity-50 transition-colors"
                                >
                                    {searchingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Section Toggle */}
                    <div className="border-t border-slate-50 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-slate-400 hover:text-brand-500 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Informações Fiscais e Endereço</span>
                        </button>

                        {showAdvanced && (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.razao_social}
                                        onChange={e => setEmitente({ ...emitente, razao_social: e.target.value })}
                                        placeholder="Empresa Ltda"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Inscrição Estadual</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.ie}
                                        onChange={e => setEmitente({ ...emitente, ie: e.target.value })}
                                        placeholder="Isento ou número"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">CEP</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.cep}
                                        onChange={e => setEmitente({ ...emitente, cep: e.target.value })}
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Logradouro</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.logradouro}
                                        onChange={e => setEmitente({ ...emitente, logradouro: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Número</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.numero}
                                        onChange={e => setEmitente({ ...emitente, numero: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Bairro</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.bairro}
                                        onChange={e => setEmitente({ ...emitente, bairro: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Município</label>
                                    <input
                                        className="input-glass text-sm h-11"
                                        value={emitente.municipio}
                                        onChange={e => setEmitente({ ...emitente, municipio: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">UF</label>
                                    <select
                                        className="input-glass text-sm h-11"
                                        value={emitente.uf}
                                        onChange={e => setEmitente({ ...emitente, uf: e.target.value })}
                                    >
                                        {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Import Section */}
                    <div className="space-y-4 bg-slate-50/80 rounded-[28px] p-6 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="text-amber-500" size={16} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Importar Dados (Clonagem Inteligente)</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                importClients ? "bg-white border-brand-500/20 shadow-sm" : "bg-transparent border-transparent hover:bg-white"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={importClients}
                                    onChange={(e) => setImportClients(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">Clientes</span>
                                    <span className="text-[9px] text-slate-400">Importar base de clientes atual</span>
                                </div>
                            </label>

                            <label className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                importProducts ? "bg-white border-brand-500/20 shadow-sm" : "bg-transparent border-transparent hover:bg-white"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={importProducts}
                                    onChange={(e) => setImportProducts(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">Produtos</span>
                                    <span className="text-[9px] text-slate-400">Importar catálogo e estoque</span>
                                </div>
                            </label>

                            <label className={cn(
                                "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                importConfigs ? "bg-white border-brand-500/20 shadow-sm" : "bg-transparent border-transparent hover:bg-white"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={importConfigs}
                                    onChange={(e) => setImportConfigs(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800">Configurações</span>
                                    <span className="text-[9px] text-slate-400">Copiar taxas, margens e categorias</span>
                                </div>
                            </label>
                        </div>

                        {(importClients || importProducts || importConfigs) && userCompanies.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fonte da Importação:</label>
                                <select
                                    value={importSourceId}
                                    onChange={(e) => setImportSourceId(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-brand-500/5 transition-all"
                                >
                                    {userCompanies.map(c => (
                                        <option key={c.empresa_id} value={c.empresa_id}>{c.empresa.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </form>

                <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/30 flex gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="flex-[2] px-6 py-4 rounded-2xl bg-brand-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 group"
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Save size={18} className="group-hover:scale-110 transition-transform" />
                                Criar Empresa e Aplicar Configurações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
