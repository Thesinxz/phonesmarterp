"use client";

import { useAuth } from "@/context/AuthContext";
import { 
    Building2, 
    MoreVertical, 
    Pencil, 
    Settings, 
    Trash2, 
    Plus, 
    MapPin, 
    Phone, 
    Mail, 
    FileText, 
    Building,
    CheckCircle2,
    Search,
    RefreshCw,
    X,
    AlertTriangle,
    Loader2,
    Users
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateEmpresaDados, deleteEmpresa } from "@/app/actions/companies";
import { NovaEmpresaModal } from "@/components/layout/NovaEmpresaModal";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpgradeBanner } from "@/components/plans/UpgradeBanner";

const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface EmpresaDetalhes {
    id: string;
    nome: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    unidades_count: number;
    usuarios_count: number;
    is_ativa: boolean;
}

export default function GestaoEmpresasPage() {
    const { profile, empresa: activeEmpresa, switchCompany, refreshProfile, user, userCompanies } = useAuth();
    const [empresas, setEmpresas] = useState<EmpresaDetalhes[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNovaModalOpen, setIsNovaModalOpen] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<any | null>(null);
    const [deletingEmpresa, setDeletingEmpresa] = useState<any | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    const { hasAccess: hasMultiEmpresa, upgrade } = useFeatureGate('multi_empresa');

    // Form states for Edit
    const [formData, setFormData] = useState({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: ""
    });

    console.log('[GestaoEmpresas] profile:', profile);
    console.log('[GestaoEmpresas] userCompanies:', userCompanies);

    const loadEmpresas = async () => {
        if (userCompanies.length === 0) {
            console.log('[GestaoEmpresas] Sem empresas no contexto, tentando carregar...');
            // Se o contexto ainda está vazio, podemos tentar um refresh ou apenas esperar
        }

        setLoading(true);
        try {
            const supabase = createClient();
            
            // Usar userCompanies (profiles) do contexto em vez de fazer nova query
            const resultados = await Promise.all(userCompanies.map(async (p: any) => {
                const emp = p.empresa;
                if (!emp) return null;
                
                // Buscar config nfe_emitente para pegar CNPJ/Endereço
                const { data: config } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("empresa_id", emp.id)
                    .eq("chave", "nfe_emitente")
                    .maybeSingle();

                const emitente = (config as any)?.valor || {};
                
                // Contar unidades e usuários
                const { count: unitsCount } = await (supabase.from("units") as any)
                    .select("*", { count: 'exact', head: true })
                    .eq("empresa_id", emp.id);
                
                const { count: usersCount } = await (supabase.from("usuarios") as any)
                    .select("*", { count: 'exact', head: true })
                    .eq("empresa_id", emp.id);

                let endereco = "não configurado";
                if (emitente.logradouro) {
                    endereco = `${emitente.logradouro}, ${emitente.numero || 'S/N'} · ${emitente.municipio || ''} · ${emitente.uf || ''}`;
                }

                const item: EmpresaDetalhes = {
                    id: emp.id,
                    nome: emp.nome,
                    cnpj: emitente.cnpj || "não configurado",
                    telefone: emitente.telefone || "não configurado",
                    email: emitente.email || "não configurado",
                    endereco,
                    unidades_count: unitsCount || 0,
                    usuarios_count: usersCount || 0,
                    is_ativa: emp.id === activeEmpresa?.id
                };
                return item;
            }));

            // Filtrar itens nulos e garantir tipagem correta para o estado
            const validas = resultados.filter((e): e is EmpresaDetalhes => e !== null);
            setEmpresas(validas);
        } catch (error) {
            console.error("Erro ao carregar empresas:", error);
            toast.error("Erro ao carregar lista de empresas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userCompanies.length > 0) {
            loadEmpresas();
        }
    }, [userCompanies, activeEmpresa?.id]);

    const handleEditClick = async (empId: string) => {
        const supabase = createClient();
        setIsActionLoading(true);
        try {
            const { data: config } = await supabase
                .from("configuracoes")
                .select("valor")
                .eq("empresa_id", empId)
                .eq("chave", "nfe_emitente")
                .maybeSingle();

            const emitente = (config as any)?.valor || {};
            const empData = empresas.find(e => e.id === empId);

            setFormData({
                nome: empData?.nome || "",
                cnpj: emitente.cnpj || "",
                telefone: emitente.telefone || "",
                email: emitente.email || "",
                cep: emitente.cep || "",
                logradouro: emitente.logradouro || "",
                numero: emitente.numero || "",
                complemento: emitente.complemento || "",
                bairro: emitente.bairro || "",
                cidade: emitente.municipio || "",
                estado: emitente.uf || ""
            });
            setEditingEmpresa(empData);
        } catch (error) {
            toast.error("Erro ao carregar dados da empresa.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!user?.id || !editingEmpresa) return;
        setIsActionLoading(true);
        try {
            const result = await updateEmpresaDados({
                empresaId: editingEmpresa.id,
                userId: user.id,
                nome: formData.nome,
                cnpj: formData.cnpj,
                telefone: formData.telefone,
                email: formData.email,
                endereco: {
                    cep: formData.cep,
                    logradouro: formData.logradouro,
                    numero: formData.numero,
                    complemento: formData.complemento,
                    bairro: formData.bairro,
                    cidade: formData.cidade,
                    estado: formData.estado
                }
            });

            if (result.success) {
                toast.success("Dados atualizados com sucesso!");
                setEditingEmpresa(null);
                loadEmpresas();
                if (editingEmpresa.id === activeEmpresa?.id) {
                    refreshProfile();
                }
            } else {
                toast.error(result.error || "Erro ao salvar alterações.");
            }
        } catch (error) {
            toast.error("Erro inesperado ao salvar.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user?.id || !deletingEmpresa) return;
        
        if (confirmDeleteName.toLowerCase() !== deletingEmpresa.nome.toLowerCase()) {
            toast.error("O nome digitado não coincide.");
            return;
        }

        setIsActionLoading(true);
        try {
            const result = await deleteEmpresa({
                empresaId: deletingEmpresa.id,
                userId: user.id,
                confirmationName: confirmDeleteName
            });

            if (result.success) {
                toast.success("Empresa excluída permanentemente.");
                setDeletingEmpresa(null);
                setConfirmDeleteName("");
                
                // Forçar atualização do contexto e da lista
                await refreshProfile();
                
                // Recarregar para garantir estado limpo do AuthContext
                window.location.href = '/configuracoes/empresas';
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Erro ao excluir empresa.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const buscarCep = async () => {
        const cep = formData.cep.replace(/\D/g, '');
        if (cep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf
                }));
            }
        } catch (e) {
            console.warn("Erro ao buscar CEP");
        }
    };

    if (loading && userCompanies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="animate-spin text-brand-500" size={40} />
                <p className="text-slate-500 font-medium animate-pulse">Carregando suas empresas...</p>
            </div>
        );
    }

    if (!hasMultiEmpresa && userCompanies.length > 1) {
        // Se já tem mais de uma empresa (importada ou antiga), mas o plano não permite gerenciar/trocar
        // (Isso é uma segurança extra para evitar burlar o plano)
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 p-6 rounded-3xl border border-white/60 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Empresas</h1>
                    <p className="text-slate-500 text-sm font-medium">Gerencie suas filiais, dados cadastrais e acessos.</p>
                </div>
                <button 
                    onClick={() => {
                        if (hasMultiEmpresa) {
                            setIsNovaModalOpen(true);
                        } else {
                            toast.error("O recurso Multi-empresa está disponível a partir do plano PRO.");
                            upgrade();
                        }
                    }}
                    className={cn(
                        "btn-primary",
                        !hasMultiEmpresa && "opacity-60 grayscale cursor-not-allowed"
                    )}
                >
                    <Plus size={18} />
                    Nova Empresa
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {empresas.map((emp) => (
                    <GlassCard 
                        key={emp.id}
                        className={cn(
                            "group hover:border-brand-200 transition-all duration-300",
                            emp.is_ativa && "border-brand-500/30 ring-1 ring-brand-500/10"
                        )}
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-brand-500/10",
                                        emp.is_ativa ? "bg-brand-500 text-white" : "bg-white border border-slate-100 text-slate-400"
                                    )}>
                                        {emp.nome.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-800 leading-none">{emp.nome}</h3>
                                            {emp.is_ativa && (
                                                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                    Ativa
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-slate-400">
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                <FileText size={12} />
                                                {emp.cnpj}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                <Building size={12} />
                                                {emp.unidades_count} {emp.unidades_count === 1 ? 'Unidade' : 'Unidades'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                <Users size={12} />
                                                {emp.usuarios_count} {emp.usuarios_count === 1 ? 'Usuário' : 'Usuários'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 md:gap-2">
                                    {/* Sincronizar / Atualizar */}
                                    <button 
                                        onClick={async () => {
                                            if (emp.is_ativa) {
                                                setIsActionLoading(true);
                                                await refreshProfile();
                                                await loadEmpresas();
                                                setIsActionLoading(false);
                                                toast.success("Dados sincronizados.");
                                            } else {
                                                if (hasMultiEmpresa) {
                                                    await switchCompany(emp.id);
                                                } else {
                                                    toast.error("O recurso Multi-empresa está disponível a partir do plano PRO.");
                                                    upgrade();
                                                }
                                            }
                                        }}
                                        disabled={isActionLoading || (!hasMultiEmpresa && !emp.is_ativa)}
                                        className={cn(
                                            "p-2 rounded-xl transition-all",
                                            emp.is_ativa 
                                                ? "text-brand-600 bg-brand-50 ring-1 ring-brand-200" 
                                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
                                            (!hasMultiEmpresa && !emp.is_ativa) && "opacity-40 grayscale cursor-not-allowed"
                                        )}
                                        title={emp.is_ativa ? "Sincronizar dados desta empresa" : "Alternar para esta empresa"}
                                    >
                                        <RefreshCw size={18} className={cn(isActionLoading && emp.is_ativa && "animate-spin")} />
                                    </button>

                                    {/* Editar */}
                                    <button 
                                        onClick={() => handleEditClick(emp.id)}
                                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                        title="Editar dados cadastrais"
                                    >
                                        <Pencil size={18} />
                                    </button>

                                    {/* Excluir (Oculto para a ativa) */}
                                    {!emp.is_ativa && (
                                        <button 
                                            onClick={() => {
                                                setConfirmDeleteName("");
                                                setDeletingEmpresa(emp);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            title="Excluir filial permanentemente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                        <MapPin size={12} className="text-slate-400" />
                                        {emp.endereco}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                        <Phone size={12} className="text-slate-400" />
                                        {emp.telefone}
                                    </div>
                                </div>
                                <Link 
                                    href={`/configuracoes?tab=empresa`}
                                    className="text-[10px] font-bold text-brand-600 hover:underline uppercase tracking-widest"
                                >
                                    Configurações Avançadas →
                                </Link>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Edit Modal */}
            {editingEmpresa && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingEmpresa(null)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                                    <Pencil size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Editar Empresa</h2>
                                    <p className="text-xs text-slate-500 font-medium">Atualize os dados de {editingEmpresa.nome}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingEmpresa(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome da Empresa</label>
                                        <input 
                                            value={formData.nome}
                                            onChange={e => setFormData({...formData, nome: e.target.value})}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            placeholder="Nome fantasia"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CNPJ</label>
                                        <input 
                                            value={formData.cnpj}
                                            onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone</label>
                                        <input 
                                            value={formData.telefone}
                                            onChange={e => setFormData({...formData, telefone: e.target.value})}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                                        <input 
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            placeholder="contato@empresa.com"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-4 flex items-center gap-2">
                                        <MapPin size={12} />
                                        Endereço da Sede
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CEP</label>
                                            <div className="relative">
                                                <input 
                                                    value={formData.cep}
                                                    onChange={e => setFormData({...formData, cep: e.target.value})}
                                                    onBlur={buscarCep}
                                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                                    placeholder="00000-000"
                                                />
                                                <button onClick={buscarCep} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 hover:text-brand-600">
                                                    <Search size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Logradouro</label>
                                            <input 
                                                value={formData.logradouro}
                                                onChange={e => setFormData({...formData, logradouro: e.target.value})}
                                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Número</label>
                                            <input 
                                                value={formData.numero}
                                                onChange={e => setFormData({...formData, numero: e.target.value})}
                                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bairro</label>
                                            <input 
                                                value={formData.bairro}
                                                onChange={e => setFormData({...formData, bairro: e.target.value})}
                                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cidade</label>
                                            <input 
                                                value={formData.cidade}
                                                onChange={e => setFormData({...formData, cidade: e.target.value})}
                                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado</label>
                                            <select 
                                                value={formData.estado}
                                                onChange={e => setFormData({...formData, estado: e.target.value})}
                                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-all text-sm font-semibold appearance-none bg-white"
                                            >
                                                {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setEditingEmpresa(null)}
                                className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveEdit}
                                disabled={isActionLoading}
                                className="btn-primary min-w-[140px]"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : "Salvar Alterações"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deletingEmpresa && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingEmpresa(null)} />
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 p-8">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 text-center tracking-tight">Excluir Empresa?</h2>
                        <p className="text-slate-500 text-sm text-center mt-2 leading-relaxed">
                            Esta ação é <span className="text-red-600 font-bold">irreversível</span>. Todos os dados da empresa <strong>{deletingEmpresa.nome}</strong> serão apagados.
                        </p>

                        <div className="mt-8 space-y-4">
                            <div className="space-y-1.5 text-center">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Digite o nome da empresa para confirmar:</label>
                                <input 
                                    value={confirmDeleteName}
                                    onChange={e => setConfirmDeleteName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-red-100 bg-red-50/30 text-center focus:border-red-500 outline-none transition-all text-sm font-bold"
                                    placeholder={deletingEmpresa.nome}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={handleDelete}
                                    disabled={isActionLoading || confirmDeleteName.toLowerCase() !== deletingEmpresa.nome.toLowerCase()}
                                    className="w-full h-12 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <Trash2 size={18} />
                                            Confirmar Exclusão
                                        </>
                                    )}
                                </button>
                                <button 
                                    onClick={() => setDeletingEmpresa(null)}
                                    className="w-full h-12 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isNovaModalOpen && (
                <NovaEmpresaModal onClose={() => setIsNovaModalOpen(false)} />
            )}
        </div>
    );
}
