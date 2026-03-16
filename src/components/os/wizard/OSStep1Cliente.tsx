"use client";

import { useState, useEffect } from "react";
import { Plus, X, User, Phone, Mail, FileText, Search, Check, MapPin, Building2, Save, Loader2, RotateCcw, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { createCliente } from "@/services/clientes";
import { maskPhone, maskCPF, maskCEP } from "@/utils/masks";

interface OSStep1ClienteProps {
    onSelect: (clienteId: string, clienteNome: string) => void;
    selectedId?: string;
}

export function OSStep1Cliente({ onSelect, selectedId }: OSStep1ClienteProps) {
    const { profile } = useAuth();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [recentClients, setRecentClients] = useState<any[]>([]);

    const loadRecentClients = async () => {
        if (!profile?.empresa_id) return;
        const supabase = createClient();
        console.log("DEBUG: Carregando clientes recentes para empresa:", profile.empresa_id);
        try {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, telefone, email, cpf_cnpj")
                .eq("empresa_id", profile.empresa_id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) {
                console.error("Erro ao carregar clientes recentes:", error);
                return;
            }
            setRecentClients(data || []);
        } catch (err) {
            console.error("Erro inesperado ao carregar clientes recentes:", err);
        }
    };

    useEffect(() => {
        if (profile?.empresa_id) {
            loadRecentClients();
        }
    }, [profile?.empresa_id]);

    // Form para novo cliente (espelhando a página de clientes)
    const [newClient, setNewClient] = useState({
        nome: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
        segmento: "novo",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        inscricaoEstadual: "",
        indicadorIe: "9",
        inscricaoMunicipal: "",
    });

    const handleSearch = async (val: string) => {
        // Aplica máscara na busca se for CPF ou Telefone
        let maskedVal = val;
        const onlyDigits = val.replace(/\D/g, "");
        if (onlyDigits.length > 0) {
            if (onlyDigits.length <= 11) {
                // Tenta telefone primeiro se começar com ddd ou cpf
                maskedVal = onlyDigits.length > 10 ? maskPhone(onlyDigits) : maskCPF(onlyDigits);
            } else {
                maskedVal = maskCPF(onlyDigits);
            }
        }

        setSearch(maskedVal);

        // Critério mínimo para busca
        if (onlyDigits.length < 3 && val.trim().length < 3) {
            setResults([]);
            return;
        }

        if (!profile?.empresa_id) {
            console.warn("Busca abortada: profile.empresa_id não disponível");
            return;
        }

        setSearching(true);
        const supabase = createClient();

        // Constrói a query com suporte a espaços (fuzzy)
        const cleanSearch = val.trim().replace(/\s+/g, "%");
        let orQuery = `nome.ilike.%${cleanSearch}%`;

        if (onlyDigits.length >= 3) {
            orQuery += `,cpf_cnpj.ilike.%${onlyDigits}%,telefone.ilike.%${onlyDigits}%`;
        }

        try {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, telefone, email, cpf_cnpj")
                .eq("empresa_id", profile.empresa_id)
                .or(orQuery)
                .limit(10);

            if (error) {
                console.error("Erro na busca de clientes:", error);
                toast.error("Erro ao buscar clientes no banco de dados");
                return;
            }

            setResults(data || []);
        } catch (err) {
            console.error("Erro inesperado na busca:", err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelect = (client: any) => {
        setSelectedClient(client);
        onSelect(client.id, client.nome);
        setResults([]);
        setSearch("");
    };

    const handleViaCEP = async () => {
        const cep = newClient.cep.replace(/\D/g, "");
        if (cep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (data.erro) {
                toast.error("CEP não encontrado");
                return;
            }

            setNewClient(p => ({
                ...p,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                uf: data.uf
            }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        }
    };

    const handleCreateClient = async () => {
        if (!newClient.nome || !newClient.telefone) {
            toast.error("Nome e telefone são obrigatórios");
            return;
        }

        if (!profile?.empresa_id) {
            toast.error("Erro de autenticação. Recarregue a página.");
            return;
        }

        setSaving(true);
        try {
            const endereco = {
                cep: newClient.cep,
                logradouro: newClient.logradouro,
                numero: newClient.numero,
                bairro: newClient.bairro,
                cidade: newClient.cidade,
                uf: newClient.uf,
            };

            console.log("DEBUG: Iniciando cadastro de cliente com data:", {
                nome: newClient.nome,
                cpf_cnpj: newClient.cpf_cnpj,
                email: newClient.email,
                telefone: newClient.telefone,
                endereco
            });

            const data = await createCliente({
                empresa_id: profile.empresa_id,
                nome: newClient.nome,
                cpf_cnpj: newClient.cpf_cnpj || null,
                email: newClient.email || null,
                telefone: newClient.telefone || null,
                segmento: newClient.segmento as any,
                endereco_json: endereco,
                pontos_fidelidade: 0,
                inscricao_estadual: newClient.inscricaoEstadual || null,
                indicador_ie: parseInt(newClient.indicadorIe, 10),
                inscricao_municipal: newClient.inscricaoMunicipal || null,
                instagram: null,
            });

            console.log("DEBUG: Cliente cadastrado com sucesso. ID:", data.id);
            toast.success("Cliente cadastrado com sucesso!");
            handleSelect(data);
            setShowNewForm(false);
        } catch (error: any) {
            console.error("ERRO TÉCNICO no cadastro de cliente:", error);
            console.error("DEBUG Detalhe do Erro:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            toast.error(`Erro ao cadastrar cliente: ${error.message || "Verifique o console"}`);
        } finally {
            setSaving(false);
        }
    };

    const openNewForm = () => {
        // Inteligência: se o que foi digitado parece um CPF (só números), preenche no campo correto
        const onlyDigits = search.replace(/\D/g, "");
        const isNumeric = onlyDigits.length > 0 && /^\d+$/.test(onlyDigits);

        if (isNumeric) {
            if (onlyDigits.length >= 11) {
                setNewClient(p => ({ ...p, nome: "", cpf_cnpj: maskCPF(onlyDigits), telefone: "" }));
            } else {
                setNewClient(p => ({ ...p, nome: "", cpf_cnpj: "", telefone: maskPhone(onlyDigits) }));
            }
        } else {
            setNewClient(p => ({ ...p, nome: search, cpf_cnpj: "", telefone: "" }));
        }
        setShowNewForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">1</div>
                <h2>Quem é o cliente?</h2>
            </div>

            {!selectedClient && (
                <div className="space-y-4">
                    <div className="flex gap-2 relative">
                        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome, CPF ou telefone..."
                            className="w-full h-12 pl-12 pr-4 rounded-lg border border-slate-200 bg-white shadow-sm outline-none text-sm transition-all focus:border-indigo-600"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={openNewForm}
                            className="btn-primary shrink-0"
                            title="Novo Cliente"
                        >
                            <Plus size={16} className="mr-2" />
                            Novo Cliente
                        </button>
                    </div>

                    {/* Clientes Recentes ou Resultados */}
                    {search.length === 0 && !searching && recentClients.length > 0 && (
                        <div className="space-y-3 mt-6">
                            <div className="section-label flex items-center justify-between mb-0">
                                <span>CLIENTES RECENTES</span>
                                <button
                                    onClick={loadRecentClients}
                                    className="text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1 normal-case tracking-normal"
                                >
                                    <RotateCcw size={10} /> Atualizar
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {recentClients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => handleSelect(client)}
                                        className="sidebar-card hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer flex-row items-center gap-3"
                                        style={{ padding: '12px 16px' }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                            {client.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-slate-800 truncate">{client.nome}</div>
                                            <div className="text-xs text-slate-500 truncate mt-0.5">
                                                {client.telefone} {client.email ? `· ${client.email}` : ''}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resultados da busca */}
                    {results.length > 0 && (
                        <div className="mt-6 flex flex-col gap-2">
                            <div className="section-label">RESULTADOS DA BUSCA</div>
                            {results.map(client => (
                                <div
                                    key={client.id}
                                    onClick={() => handleSelect(client)}
                                    className="sidebar-card hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer flex-row items-center gap-3"
                                    style={{ padding: '12px 16px' }}
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                        {client.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-slate-800 truncate">{client.nome}</div>
                                        <div className="text-xs text-slate-500 truncate mt-0.5">
                                            {client.telefone} {client.email ? `· ${client.email}` : ''} {client.cpf_cnpj ? `· ${client.cpf_cnpj}` : ''}
                                        </div>
                                    </div>
                                    <Check className="text-indigo-500 shrink-0" size={18} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!showNewForm && search.length > 0 && results.length === 0 && !searching && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500 mb-4">Nenhum cliente encontrado com "{search}"</p>
                            <button
                                type="button"
                                onClick={openNewForm}
                                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                            >
                                <Plus size={18} /> Cadastrar "{search}"
                            </button>
                        </div>
                    )}
                </div>
            )}

            {selectedClient && (
                <div className="sidebar-card bg-emerald-50/30 border-emerald-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                {selectedClient.nome.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{selectedClient.nome}</h3>
                                <div className="flex gap-2 mt-0.5">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Phone size={12} /> {selectedClient.telefone}
                                    </span>
                                    {selectedClient.email && (
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Mail size={12} /> {selectedClient.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Form Completo para Novo Cliente ( Wizard Mode ) */}
            {showNewForm && (
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
                    <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Novo Cadastro</h3>
                            <p className="text-xs text-slate-400 uppercase font-black tracking-widest mt-1">Complete todos os dados</p>
                        </div>
                        <button type="button" onClick={() => setShowNewForm(false)} className="p-2 text-slate-400 hover:bg-white rounded-lg transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={newClient.nome}
                                    onChange={e => setNewClient(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="João Silva"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">CPF ou CNPJ</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={newClient.cpf_cnpj}
                                    onChange={e => setNewClient(p => ({ ...p, cpf_cnpj: maskCPF(e.target.value) }))}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Telefone / WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={newClient.telefone}
                                    onChange={e => setNewClient(p => ({ ...p, telefone: maskPhone(e.target.value) }))}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="email"
                                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={newClient.email}
                                    onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                                    placeholder="exemplo@email.com"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CEP</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        className="w-full h-10 pl-9 pr-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none"
                                        value={newClient.cep}
                                        onChange={e => setNewClient(p => ({ ...p, cep: maskCEP(e.target.value) }))}
                                        onBlur={handleViaCEP}
                                        placeholder="00000-000"
                                    />
                                </div>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Logradouro</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none"
                                    value={newClient.logradouro}
                                    onChange={e => setNewClient(p => ({ ...p, logradouro: e.target.value }))}
                                    placeholder="Rua, Av..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nº / Apto</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none"
                                    value={newClient.numero}
                                    onChange={e => setNewClient(p => ({ ...p, numero: e.target.value }))}
                                    placeholder="123"
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bairro</label>
                                <input
                                    type="text"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none"
                                    value={newClient.bairro}
                                    onChange={e => setNewClient(p => ({ ...p, bairro: e.target.value }))}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cidade</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input
                                        type="text"
                                        className="w-full h-10 pl-9 pr-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none"
                                        value={newClient.cidade}
                                        onChange={e => setNewClient(p => ({ ...p, cidade: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">UF</label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none uppercase"
                                    value={newClient.uf}
                                    onChange={e => setNewClient(p => ({ ...p, uf: e.target.value.toUpperCase() }))}
                                />
                            </div>
                        </div>

                        {/* Campos Fiscais */}
                        <div className="pt-4 border-t border-slate-50 mt-4">
                            <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 flex items-center gap-1.5">
                                <FileText size={14} className="text-indigo-500" />
                                Dados Fiscais
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Indicador IE</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none transition-all appearance-none"
                                        value={newClient.indicadorIe}
                                        onChange={e => setNewClient(p => ({ ...p, indicadorIe: e.target.value }))}
                                    >
                                        <option value="1">1 - Contribuinte ICMS</option>
                                        <option value="2">2 - Contribuinte Isento</option>
                                        <option value="9">9 - Não Contribuinte</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Insc. Estadual</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none transition-all"
                                        placeholder={newClient.indicadorIe === "9" ? "Não Contribuinte" : "Isento ou Nº IE"}
                                        value={newClient.inscricaoEstadual}
                                        onChange={e => setNewClient(p => ({ ...p, inscricaoEstadual: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Insc. Municipal</label>
                                    <input
                                        type="text"
                                        className="w-full h-10 px-3 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white text-sm outline-none transition-all"
                                        placeholder="Apenas para NFS-e"
                                        value={newClient.inscricaoMunicipal}
                                        onChange={e => setNewClient(p => ({ ...p, inscricaoMunicipal: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                        <button
                            type="button"
                            onClick={() => setShowNewForm(false)}
                            className="flex-1 h-14 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateClient}
                            disabled={saving}
                            className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
                            {saving ? "Salvando..." : "Salvar e Continuar"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
