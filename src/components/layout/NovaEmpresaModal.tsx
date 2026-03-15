"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createEmpresa } from "@/app/actions/companies";
import { 
    X, 
    Building2, 
    Save, 
    Loader2, 
    Search, 
    MapPin, 
    ChevronRight, 
    ChevronLeft, 
    Sparkles, 
    Zap, 
    CheckCircle2,
    Building,
    FileText,
    Phone,
    Mail,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { createPortal } from "react-dom";

interface NovaEmpresaModalProps {
    onClose: () => void;
}

const ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function NovaEmpresaModal({ onClose }: NovaEmpresaModalProps) {
    const { user, profile, empresa, userCompanies, refreshProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Form States
    const [name, setName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [telefone, setTelefone] = useState("");
    const [email, setEmail] = useState("");
    const [searchingCnpj, setSearchingCnpj] = useState(false);

    const [address, setAddress] = useState({
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "SP"
    });

    // Import states
    const [copyFromId, setCopyFromId] = useState("");

    useEffect(() => {
        setIsMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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

            setAddress(prev => ({
                ...prev,
                logradouro: data.logradouro || "",
                numero: data.numero || "",
                bairro: data.bairro || "",
                cidade: data.municipio || "",
                estado: data.uf || "SP",
                cep: data.cep || prev.cep
            }));

            if (data.ddd_telefone_1) setTelefone(data.ddd_telefone_1);
            if (data.email) setEmail(data.email);

            toast.success("Dados da empresa carregados com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao buscar CNPJ. Verifique se está correto.");
        } finally {
            setSearchingCnpj(false);
        }
    }

    const buscarCep = async () => {
        const cepClean = address.cep.replace(/\D/g, '');
        if (cepClean.length !== 8) return;
        
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setAddress({
                    ...address,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf
                });
            } else {
                toast.error("CEP não encontrado.");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            toast.error("Erro ao conectar com busca de CEP.");
        }
    };

    const copyHeadquartersAddress = async () => {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { data } = await (supabase
            .from("configuracoes") as any)
            .select("valor")
            .eq("empresa_id", userCompanies[0].empresa_id)
            .eq("chave", "nfe_emitente")
            .maybeSingle();
        
        if (data?.valor) {
            const v = data.valor as any;
            setAddress({
                cep: v.cep || "",
                logradouro: v.logradouro || "",
                numero: v.numero || "",
                complemento: v.complemento || "",
                bairro: v.bairro || "",
                cidade: v.municipio || "",
                estado: v.uf || "SP"
            });
            toast.success("Endereço da matriz copiado!");
        } else {
            toast.error("Não foi possível carregar o endereço da matriz.");
        }
    };

    async function handleSubmit() {
        if (!name.trim() || !user || !cnpj) {
            toast.error("Preencha os campos obrigatórios.");
            return;
        }

        setLoading(true);
        try {
            const result = await createEmpresa({
                userId: user.id,
                nome: name.trim(),
                cnpj: cnpj.replace(/\D/g, ''),
                telefone,
                email,
                endereco: address,
                copyFromEmpresaId: copyFromId
            });

            if (result.success) {
                toast.success("Nova empresa criada com sucesso!");
                await refreshProfile();
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error("Erro ao criar empresa:", err);
            toast.error(err.message || "Erro ao criar nova empresa.");
        } finally {
            setLoading(false);
        }
    }

    if (!isMounted) return null;

    const StepIndicator = () => (
        <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                        step === s ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : 
                        step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                        {step > s ? <CheckCircle2 size={16} /> : s}
                    </div>
                    {s < 3 && <div className={cn("w-8 h-0.5 rounded-full", step > s ? "bg-emerald-500" : "bg-slate-100")} />}
                </div>
            ))}
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center shrink-0 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-xl shadow-brand-500/20">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Nova Empresa</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mt-1">Passo {step} de 3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <StepIndicator />

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <h4 className="text-lg font-bold text-slate-800">Identificação da Empresa</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CNPJ *</label>
                                        <div className="relative">
                                            <input 
                                                value={cnpj}
                                                onChange={e => setCnpj(e.target.value)}
                                                placeholder="00.000.000/0001-00"
                                                className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                            />
                                            <button 
                                                onClick={buscarCnpj}
                                                disabled={searchingCnpj}
                                                className="absolute right-2 top-1.5 w-9 h-9 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center hover:bg-brand-100 transition-all disabled:opacity-50"
                                            >
                                                {searchingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Fantasia *</label>
                                        <input 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Ex: Phone Smart - Filial Centro"
                                            className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone</label>
                                            <input 
                                                value={telefone}
                                                onChange={e => setTelefone(e.target.value)}
                                                placeholder="(00) 00000-0000"
                                                className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                                            <input 
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="contato@empresa.com"
                                                className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-bold text-slate-800">Endereço da Sede</h4>
                                <button 
                                    onClick={copyHeadquartersAddress}
                                    className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 underline"
                                >
                                    Usar endereço da matriz
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">CEP *</label>
                                    <div className="relative">
                                        <input 
                                            value={address.cep}
                                            onChange={e => setAddress({...address, cep: e.target.value})}
                                            onBlur={buscarCep}
                                            placeholder="00000-000"
                                            className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none font-mono"
                                        />
                                        <button 
                                            onClick={buscarCep}
                                            className="absolute right-2 top-1.5 w-9 h-9 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center hover:bg-brand-100 transition-all"
                                        >
                                            <Search size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Logradouro *</label>
                                    <input 
                                        value={address.logradouro}
                                        onChange={e => setAddress({...address, logradouro: e.target.value})}
                                        className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Número *</label>
                                    <input 
                                        value={address.numero}
                                        onChange={e => setAddress({...address, numero: e.target.value})}
                                        className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bairro *</label>
                                    <input 
                                        value={address.bairro}
                                        onChange={e => setAddress({...address, bairro: e.target.value})}
                                        className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cidade *</label>
                                    <input 
                                        value={address.cidade}
                                        onChange={e => setAddress({...address, cidade: e.target.value})}
                                        className="w-full h-12 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado *</label>
                                    <select 
                                        value={address.estado}
                                        onChange={e => setAddress({...address, estado: e.target.value})}
                                        className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none appearance-none"
                                    >
                                        {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h4 className="text-lg font-bold text-slate-800">Personalização e Dados</h4>
                            
                            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 text-brand-600">
                                    <Sparkles size={20} />
                                    <span className="text-sm font-black uppercase tracking-widest">Clonagem de Configurações</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Você pode copiar as configurações (taxas, categorias, formas de pagamento) de uma empresa existente para esta nova filial.
                                </p>

                                <div className="space-y-2">
                                    <select
                                        value={copyFromId}
                                        onChange={e => setCopyFromId(e.target.value)}
                                        className="w-full h-12 px-5 rounded-2xl bg-white border-2 border-slate-100 focus:border-brand-500/10 focus:ring-4 focus:ring-brand-500/5 transition-all text-sm font-bold outline-none"
                                    >
                                        <option value="">Não copiar (Configuração limpa)</option>
                                        {userCompanies.map(c => (
                                            <option key={c.empresa_id} value={c.empresa_id}>Copiar de: {c.empresa.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-brand-700 uppercase tracking-widest mb-1">Provisionamento Automático</p>
                                    <p className="text-[11px] text-brand-600/80 leading-relaxed">
                                        Ao concluir, criaremos automaticamente a unidade <strong>Matriz</strong> e vincularemos seu usuário como administrador desta nova empresa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <button 
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="px-6 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft size={16} />
                        {step === 1 ? "Cancelar" : "Voltar"}
                    </button>

                    <div className="flex items-center gap-3">
                        {step < 3 ? (
                            <button 
                                onClick={() => {
                                    if (step === 1 && (!name || !cnpj)) {
                                        toast.error("Preencha o nome e CNPJ.");
                                        return;
                                    }
                                    if (step === 2 && (!address.cep || !address.logradouro || !address.numero)) {
                                        toast.error("Preencha o endereço completo.");
                                        return;
                                    }
                                    setStep(step + 1);
                                }}
                                className="h-12 px-8 bg-brand-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-3"
                            >
                                Próximo Passo
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="h-12 px-8 bg-brand-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-brand-600 shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-3"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        Finalizar Cadastro
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
