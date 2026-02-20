"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    User,
    DollarSign,
    Wrench,
    Mail,
    Lock,
    Target
} from "lucide-react";
import { createTecnico } from "@/services/tecnicos";
import { useAuth } from "@/context/AuthContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";

export default function NovoTecnicoPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        nome: "",
        email: "",
        papel: "tecnico" as any,
        comissao: "10",
        meta: "5000",
        especialidades: "",
        ativo: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        const supabase = createClient();

        try {
            // 1. Create Public User record
            // Note: In a real app, you would use a Supabase Edge Function to invite the user
            // For now we create the public record and the technician extension
            const { data: userData, error: userError } = await (supabase.from("usuarios") as any).insert({
                empresa_id: profile.empresa_id,
                nome: form.nome,
                email: form.email,
                papel: form.papel,
                permissoes_json: {},
                ativo: true
            }).select().single();

            if (userError) throw userError;

            // 2. Create Technician record
            await createTecnico({
                empresa_id: profile.empresa_id,
                usuario_id: userData.id,
                comissao_pct: parseFloat(form.comissao),
                meta_mensal_centavos: Math.round(parseFloat(form.meta) * 100),
                especialidades: form.especialidades.split(",").map(s => s.trim()).filter(s => s !== ""),
                ativo: true
            });

            router.push("/tecnicos");
            router.refresh();
        } catch (error) {
            console.error("Erro ao cadastrar técnico:", error);
            alert("Erro ao cadastrar integrante da equipe.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 page-enter max-w-3xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/tecnicos" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Novo Integrante</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Cadastre um novo técnico ou funcionário</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info */}
                <GlassCard title="Informações Pessoais" icon={User}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Nome Completo *</label>
                            <input
                                required
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                className="input-glass mt-1.5"
                                placeholder="Ex: Rodrigo Silva"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">E-mail Corporativo *</label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="input-glass pl-10"
                                    placeholder="tecnico@empresa.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Função / Papel *</label>
                            <select
                                name="papel"
                                value={form.papel}
                                onChange={handleChange}
                                className="input-glass mt-1.5 appearance-none"
                            >
                                <option value="tecnico">Técnico</option>
                                <option value="gerente">Gerente</option>
                                <option value="atendente">Atendente</option>
                                <option value="financeiro">Financeiro</option>
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Technician Settings */}
                <GlassCard title="Configurações Técnicas" icon={Wrench}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Comissão (%)</label>
                            <div className="relative mt-1.5">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="number"
                                    name="comissao"
                                    value={form.comissao}
                                    onChange={handleChange}
                                    className="input-glass pl-10"
                                    placeholder="10"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Percentual sobre a mão de obra</p>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Meta Mensal (R$)</label>
                            <div className="relative mt-1.5">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="number"
                                    name="meta"
                                    value={form.meta}
                                    onChange={handleChange}
                                    className="input-glass pl-10"
                                    placeholder="5000"
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-semibold text-slate-700">Especialidades (separadas por vírgula)</label>
                            <input
                                name="especialidades"
                                value={form.especialidades}
                                onChange={handleChange}
                                className="input-glass mt-1.5"
                                placeholder="iPhone, Samsung, Micro-soldagem, Apple Watch"
                            />
                        </div>
                    </div>
                </GlassCard>

                <div className="flex justify-end gap-3 pt-4">
                    <Link href="/tecnicos" className="btn-secondary h-12 px-8">Cancelar</Link>
                    <button
                        disabled={loading}
                        className="btn-primary h-12 px-8"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={18} className="mr-2" />
                                Salvar Cadastro
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
