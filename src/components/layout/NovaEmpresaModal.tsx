"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { provisionAdditionalCompany, cloneCompanyData } from "@/services/empresa_vinculos";
import { X, Building2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NovaEmpresaModalProps {
    onClose: () => void;
}

export function NovaEmpresaModal({ onClose }: NovaEmpresaModalProps) {
    const { user, profile, empresa, userCompanies, refreshProfile } = useAuth();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    // Import states
    const [importSourceId, setImportSourceId] = useState(empresa?.id || "");
    const [importClients, setImportClients] = useState(false);
    const [importProducts, setImportProducts] = useState(false);

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
                profile.nome
            );

            // Se houver opções de importação selecionadas
            if (importSourceId && (importClients || importProducts)) {
                // O provisionAdditionalCompany retorna { empresa_id, usuario_id }
                const newEmpId = result?.[0]?.empresa_id;
                if (newEmpId) {
                    await cloneCompanyData(importSourceId, newEmpId, {
                        clients: importClients,
                        products: importProducts
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
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Nova Empresa</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Adicionar contexto</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Nome da Empresa</label>
                        <input
                            autoFocus
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Filial Centro, Loja 2..."
                            className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Import Section */}
                    <div className="space-y-3 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Importar Dados (Clonagem)</p>

                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={importClients}
                                    onChange={(e) => setImportClients(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Importar Clientes</span>
                            </label>

                            <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={importProducts}
                                    onChange={(e) => setImportProducts(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Importar Catálogo de Produtos</span>
                            </label>
                        </div>

                        {(importClients || importProducts) && userCompanies.length > 1 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Copiar da empresa:</label>
                                <select
                                    value={importSourceId}
                                    onChange={(e) => setImportSourceId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                >
                                    {userCompanies.map(c => (
                                        <option key={c.empresa_id} value={c.empresa_id}>{c.empresa.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100/50">
                        <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                            <strong>Nota:</strong> Esta empresa será criada no plano Starter. Você poderá configurar os dados fiscais e logotipo individualmente após a criação.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 px-4 py-3 rounded-2xl bg-brand-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={16} />
                                    Criar Empresa
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
