import { useState } from "react";
import { X, Save, User, Phone, MapPin, Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createCliente } from "@/services/clientes";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { type Cliente } from "@/types/database";

interface CadastroCompletoClienteModalProps {
    onClose: () => void;
    onSuccess: (cliente: Cliente) => void;
    initialName?: string;
}

export function CadastroCompletoClienteModal({ onClose, onSuccess, initialName = "" }: CadastroCompletoClienteModalProps) {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingApi, setFetchingApi] = useState(false);

    const [form, setForm] = useState({
        nome: initialName,
        cpf_cnpj: "",
        email: "",
        telefone: "",
        instagram: "",
        segmento: "novo",
        // Endereço
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        // Fiscal
        inscricaoEstadual: "",
        indicadorIe: "9", // 9 - Não Contribuinte
        inscricaoMunicipal: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Masks and Fetchers
    const formatCPFCNPJ = (value: string) => {
        const v = value.replace(/\D/g, "");
        if (v.length <= 11) {
            return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        }
        return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    };

    const formatTelefone = (value: string) => {
        const v = value.replace(/\D/g, "");
        if (v.length <= 10) {
            return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
        }
        return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2");
    };

    const formatCEP = (value: string) => {
        return value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9);
    };

    async function fetchCNPJ(cnpjStr: string) {
        const clean = cnpjStr.replace(/\D/g, "");
        if (clean.length !== 14) return;
        setFetchingApi(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({
                    ...prev,
                    nome: data.razao_social || data.nome_fantasia || prev.nome,
                    telefone: data.ddd_telefone_1 ? formatTelefone(data.ddd_telefone_1) : prev.telefone,
                    email: data.email || prev.email,
                    cep: formatCEP(data.cep) || prev.cep,
                    logradouro: data.logradouro || prev.logradouro,
                    numero: data.numero || prev.numero,
                    bairro: data.bairro || prev.bairro,
                    cidade: data.municipio || prev.cidade,
                    uf: data.uf || prev.uf,
                }));
                toast.success("Dados do CNPJ importados");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setFetchingApi(false);
        }
    }

    async function fetchCEP(cepStr: string) {
        const clean = cepStr.replace(/\D/g, "");
        if (clean.length !== 8) return;
        setFetchingApi(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (!data.erro) {
                    setForm(prev => ({
                        ...prev,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        uf: data.uf,
                    }));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        console.log("[DEBUG] Inicio do handleSave NO MODAL COMPLETO:", form);
        if (!profile?.empresa_id) {
            console.error("[DEBUG] Erro de autenticação: profile ou empresa_id ausente:", profile);
            return;
        }
        if (!form.nome.trim()) {
            console.log("[DEBUG] Abortado: nome em branco");
            toast.error("O nome do cliente é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const endereco = {
                cep: form.cep,
                logradouro: form.logradouro,
                numero: form.numero,
                bairro: form.bairro,
                cidade: form.cidade,
                uf: form.uf,
            };

            const payload = {
                empresa_id: profile.empresa_id,
                nome: form.nome.trim(),
                cpf_cnpj: form.cpf_cnpj.trim() || null,
                telefone: form.telefone.trim() || null,
                email: form.email.trim() || null,
                instagram: form.instagram.trim() || null,
                segmento: form.segmento as any,
                endereco_json: endereco,
                pontos_fidelidade: 0,
                inscricao_estadual: form.inscricaoEstadual.trim() || null,
                indicador_ie: parseInt(form.indicadorIe, 10),
                inscricao_municipal: form.inscricaoMunicipal.trim() || null,
            };

            console.log("[DEBUG] Chamando createCliente com payload:", payload);
            const novoCliente = await createCliente(payload as any);
            console.log("[DEBUG] Sucesso createCliente:", novoCliente);

            toast.success("Cliente cadastrado com sucesso!");
            router.refresh();
            onSuccess(novoCliente);
        } catch (error: any) {
            console.error("[DEBUG] Erro no try/catch ao cadastrar cliente:", error);
            toast.error("Erro ao cadastrar: " + error.message);
        } finally {
            console.log("[DEBUG] Finalizando handleSave");
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 py-10 overflow-y-auto animate-in fade-in">
            <GlassCard className="w-full max-w-4xl p-6 bg-white relative animate-in zoom-in-95 my-auto max-h-full overflow-y-auto scrollbar-thin">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">Cadastro de Cliente</h2>
                        <p className="text-sm text-slate-500">Adicione os dados completos para faturamento</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Dados Pessoais */}
                    <GlassCard title="Dados Principais" icon={User} className="bg-slate-50 border-none shadow-none">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Nome Completo *</label>
                                <input
                                    required
                                    name="nome"
                                    value={form.nome}
                                    onChange={handleChange}
                                    placeholder="Ex: João da Silva"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">CPF / CNPJ</label>
                                    {fetchingApi && form.cpf_cnpj.length > 13 && <span className="text-[10px] text-brand-500 font-bold animate-pulse">Buscando...</span>}
                                </div>
                                <input
                                    name="cpf_cnpj"
                                    value={form.cpf_cnpj}
                                    onChange={(e) => {
                                        const v = formatCPFCNPJ(e.target.value);
                                        setForm(prev => ({ ...prev, cpf_cnpj: v }));
                                        if (v.replace(/\D/g, "").length === 14) fetchCNPJ(v);
                                    }}
                                    placeholder="000.000.000-00"
                                    maxLength={18}
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Segmento</label>
                                <select
                                    name="segmento"
                                    value={form.segmento}
                                    onChange={handleChange}
                                    className="input-glass mt-1.5 appearance-none bg-white"
                                >
                                    <option value="novo">Novo</option>
                                    <option value="vip">VIP</option>
                                    <option value="atacadista">Atacadista</option>
                                </select>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Contato */}
                    <GlassCard title="Contato" icon={Phone} className="bg-slate-50 border-none shadow-none">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        name="telefone"
                                        value={form.telefone}
                                        onChange={(e) => {
                                            setForm(prev => ({ ...prev, telefone: formatTelefone(e.target.value) }));
                                        }}
                                        maxLength={15}
                                        placeholder="(00) 00000-0000"
                                        className="input-glass pl-9 mt-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="cliente@email.com"
                                        className="input-glass pl-9 mt-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Instagram</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                                    <input
                                        name="instagram"
                                        value={form.instagram}
                                        onChange={(e) => {
                                            const cleanVal = e.target.value.replace('@', '').replace(/\s+/g, '');
                                            setForm(prev => ({ ...prev, instagram: cleanVal }));
                                        }}
                                        placeholder="usuario_insta"
                                        className="input-glass pl-9 mt-1.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Endereço */}
                    <GlassCard title="Endereço" icon={MapPin} className="bg-slate-50 border-none shadow-none">
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">CEP</label>
                                    {fetchingApi && form.cep.length > 7 && <span className="text-[10px] text-brand-500 font-bold animate-pulse">Buscando...</span>}
                                </div>
                                <input
                                    name="cep"
                                    value={form.cep}
                                    onChange={(e) => {
                                        const v = formatCEP(e.target.value);
                                        setForm(prev => ({ ...prev, cep: v }));
                                        if (v.replace(/\D/g, "").length === 8) fetchCEP(v);
                                    }}
                                    maxLength={9}
                                    placeholder="00000-000"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Rua</label>
                                <input
                                    name="logradouro"
                                    value={form.logradouro}
                                    onChange={handleChange}
                                    placeholder="Rua das Flores"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Nº</label>
                                <input
                                    name="numero"
                                    value={form.numero}
                                    onChange={handleChange}
                                    placeholder="123"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Bairro</label>
                                <input
                                    name="bairro"
                                    value={form.bairro}
                                    onChange={handleChange}
                                    placeholder="Centro"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Cidade</label>
                                <input
                                    name="cidade"
                                    value={form.cidade}
                                    onChange={handleChange}
                                    placeholder="São Paulo"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">UF</label>
                                <input
                                    name="uf"
                                    value={form.uf}
                                    onChange={handleChange}
                                    placeholder="SP"
                                    maxLength={2}
                                    className="input-glass mt-1.5 uppercase"
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Fiscal */}
                    <GlassCard title="Dados Fiscais" icon={User} className="bg-slate-50 border-none shadow-none">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Indicador IE</label>
                                <select
                                    name="indicadorIe"
                                    value={form.indicadorIe}
                                    onChange={handleChange}
                                    className="input-glass mt-1.5 appearance-none bg-white"
                                >
                                    <option value="1">1 - Contribuinte ICMS</option>
                                    <option value="2">2 - Contribuinte Isento</option>
                                    <option value="9">9 - Não Contribuinte</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Inscrição Estadual</label>
                                <input
                                    name="inscricaoEstadual"
                                    value={form.inscricaoEstadual}
                                    onChange={handleChange}
                                    placeholder={form.indicadorIe === "9" ? "Não Contribuinte" : "Isento ou Nro IE"}
                                    className="input-glass mt-1.5"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Inscrição Municipal</label>
                                <input
                                    name="inscricaoMunicipal"
                                    value={form.inscricaoMunicipal}
                                    onChange={handleChange}
                                    placeholder="Para NFS-e"
                                    className="input-glass mt-1.5"
                                />
                            </div>
                        </div>
                    </GlassCard>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur-md pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !form.nome.trim()}
                            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Cliente
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
