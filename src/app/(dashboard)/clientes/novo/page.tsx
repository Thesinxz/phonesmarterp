"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, MapPin, Phone, Mail, User } from "lucide-react";
import Link from "next/link";
import { createCliente } from "@/services/clientes";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";

export default function NovoClientePage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingApi, setFetchingApi] = useState(false);
    const [form, setForm] = useState({
        nome: "",
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("[DEBUG] Inicio Salvar Cliente NOVO:", form);
        if (!profile?.empresa_id) {
            console.error("[DEBUG] Erro de autenticação: profile ou empresa_id ausente:", profile);
            alert("Erro de autenticação. Recarregue a página.");
            return;
        }
        setLoading(true);

        try {
            // Montar objeto endereco_json
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
                nome: form.nome,
                cpf_cnpj: form.cpf_cnpj || null,
                email: form.email || null,
                telefone: form.telefone || null,
                instagram: form.instagram || null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                segmento: form.segmento as any,
                endereco_json: endereco,
                pontos_fidelidade: 0,
                inscricao_estadual: form.inscricaoEstadual || null,
                indicador_ie: parseInt(form.indicadorIe, 10),
                inscricao_municipal: form.inscricaoMunicipal || null,
            };

            console.log("[DEBUG] Chamando createCliente com payload:", payload);
            const res = await createCliente(payload);
            console.log("[DEBUG] Sucesso createCliente:", res);

            router.push("/clientes");
            router.refresh();
        } catch (error) {
            console.error("[DEBUG] Erro no try/catch ao salvar cliente:", error);
            alert("Erro ao salvar cliente. Verifique os dados no console.");
        } finally {
            console.log("[DEBUG] Finalizando handleSubmit");
            setLoading(false);
        }
    };


    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/clientes" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Novo Cliente</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Preencha os dados abaixo</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <GlassCard title="Dados Pessoais" icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
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
                                <label className="text-sm font-medium text-slate-700">CPF / CNPJ</label>
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
                            <label className="text-sm font-medium text-slate-700">Segmento</label>
                            <select
                                name="segmento"
                                value={form.segmento}
                                onChange={handleChange}
                                className="input-glass mt-1.5 appearance-none"
                            >
                                <option value="novo">Novo</option>
                                <option value="vip">VIP</option>
                                <option value="atacadista">Atacadista</option>
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Contato */}
                <GlassCard title="Contato" icon={Phone}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    name="telefone"
                                    value={form.telefone}
                                    onChange={handleChange}
                                    placeholder="(00) 00000-0000"
                                    className="input-glass pl-9 mt-1.5"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Email</label>
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
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">Instagram</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                                <input
                                    name="instagram"
                                    value={form.instagram}
                                    onChange={(e) => {
                                        // Auto remova @ e espaços antes de salvar no state
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
                <GlassCard title="Endereço" icon={MapPin}>
                    <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">CEP</label>
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
                            <label className="text-sm font-medium text-slate-700">Rua</label>
                            <input
                                name="logradouro"
                                value={form.logradouro}
                                onChange={handleChange}
                                placeholder="Rua das Flores"
                                className="input-glass mt-1.5"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-sm font-medium text-slate-700">Nº</label>
                            <input
                                name="numero"
                                value={form.numero}
                                onChange={handleChange}
                                placeholder="123"
                                className="input-glass mt-1.5"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">Bairro</label>
                            <input
                                name="bairro"
                                value={form.bairro}
                                onChange={handleChange}
                                placeholder="Centro"
                                className="input-glass mt-1.5"
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-sm font-medium text-slate-700">Cidade</label>
                            <input
                                name="cidade"
                                value={form.cidade}
                                onChange={handleChange}
                                placeholder="São Paulo"
                                className="input-glass mt-1.5"
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-sm font-medium text-slate-700">UF</label>
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
                <GlassCard title="Dados Fiscais" icon={User}>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Indicador IE</label>
                            <select
                                name="indicadorIe"
                                value={form.indicadorIe}
                                onChange={handleChange}
                                className="input-glass mt-1.5 appearance-none"
                            >
                                <option value="1">1 - Contribuinte ICMS</option>
                                <option value="2">2 - Contribuinte Isento</option>
                                <option value="9">9 - Não Contribuinte</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Inscrição Estadual (IE)</label>
                            <input
                                name="inscricaoEstadual"
                                value={form.inscricaoEstadual}
                                onChange={handleChange}
                                placeholder={form.indicadorIe === "9" ? "Não Contribuinte" : "Isento ou Nro IE"}
                                className="input-glass mt-1.5"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Inscrição Municipal (IM)</label>
                            <input
                                name="inscricaoMunicipal"
                                value={form.inscricaoMunicipal}
                                onChange={handleChange}
                                placeholder="Apenas para NFS-e"
                                className="input-glass mt-1.5"
                            />
                        </div>
                    </div>
                </GlassCard>

                <div className="flex justify-end gap-3 pt-4">
                    <Link href="/clientes" className="btn-secondary text-slate-600 border-slate-200 hover:bg-slate-50">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Cliente
                    </button>
                </div>
            </form>
        </div>
    );
}
