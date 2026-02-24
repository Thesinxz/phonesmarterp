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
    const [form, setForm] = useState({
        nome: "",
        cpf_cnpj: "",
        email: "",
        telefone: "",
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.empresa_id) {
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

            await createCliente({
                empresa_id: profile.empresa_id,
                nome: form.nome,
                cpf_cnpj: form.cpf_cnpj || null,
                email: form.email || null,
                telefone: form.telefone || null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                segmento: form.segmento as any,
                endereco_json: endereco,
                pontos_fidelidade: 0,
                inscricao_estadual: form.inscricaoEstadual || null,
                indicador_ie: parseInt(form.indicadorIe, 10),
                inscricao_municipal: form.inscricaoMunicipal || null,
            });

            router.push("/clientes");
            router.refresh();
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert("Erro ao salvar cliente. Verifique os dados.");
        } finally {
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
                            <label className="text-sm font-medium text-slate-700">CPF / CNPJ</label>
                            <input
                                name="cpf_cnpj"
                                value={form.cpf_cnpj}
                                onChange={handleChange}
                                placeholder="000.000.000-00"
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
                    </div>
                </GlassCard>

                {/* Endereço */}
                <GlassCard title="Endereço" icon={MapPin}>
                    <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">CEP</label>
                            <input
                                name="cep"
                                value={form.cep}
                                onChange={handleChange}
                                placeholder="00000-000"
                                className="input-glass mt-1.5"
                                onBlur={() => {/* TODO: Busca CEP automática */ }}
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
