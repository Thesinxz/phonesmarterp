"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Wrench, User, FileText, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";

export default function NovaNFSePage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Dados Gerais da NFS-e
    const [geral, setGeral] = useState({
        osId: "",
        codigoServicoCnae: "",
        aliquotaIss: "2.00",
        descricaoServico: "",
    });

    // Simulando uma busca de OS finalizada
    const [osMocada, setOsMocada] = useState<any>(null);

    const buscarOS = () => {
        if (!geral.osId) {
            toast.error("Informe o ID da Ordem de Serviço");
            return;
        }

        // Mock de OS
        setOsMocada({
            id: geral.osId,
            numero: 3055,
            cliente: { nome: "Empresa Cliente S/A", cnpj: "12.345.678/0001-90" },
            valorTotalServicos: 450.00,
            descricao: "Manutenção Preventiva e Corretiva em Servidor Local"
        });

        setGeral(prev => ({
            ...prev,
            descricaoServico: "Manutenção Preventiva e Corretiva em Servidor Local"
        }));

        toast.success("Ordem de Serviço importada com sucesso!");
    };

    const calcularISS = () => {
        if (!osMocada) return 0;
        const aliquota = parseFloat(geral.aliquotaIss) || 0;
        return (osMocada.valorTotalServicos * aliquota) / 100;
    };

    const handleSubmit = async () => {
        if (!profile?.empresa_id) {
            toast.error("Erro de autenticação");
            return;
        }

        if (!osMocada) {
            toast.error("Importe uma OS primeiro para emitir a NFS-e");
            return;
        }

        if (!geral.codigoServicoCnae) {
            toast.error("O Código do Serviço (Lista LC 116/03) é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                empresa_id: profile.empresa_id,
                tipo: "NFSE",
                ambiente: "homologacao",
                status: "processando",
                valor_total_centavos: Math.round(osMocada.valorTotalServicos * 100),
                dados_json: { geral, os: osMocada, issReais: calcularISS() },
                data_emissao: new Date().toISOString(),
                os_id: osMocada.id
            };

            const supabase = createClient() as any;
            const { error } = await supabase.from("documentos_fiscais").insert([payload]);

            if (error) throw error;

            toast.success("NFS-e enviada para processamento na Prefeitura!");
            router.push("/fiscal");

        } catch (error) {
            console.error("Erro ao processar NFS-e:", error);
            toast.error("Ocorreu um erro ao processar a nota de serviço.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/fiscal" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nova NFS-e</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Nota Fiscal de Serviços Eletrônica (Prefeitura)</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !osMocada}
                        className="btn-primary h-12 px-8 flex items-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                        Transmitir NFS-e
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Integração OS */}
                <GlassCard title="Origem da Ordem de Serviço" icon={Wrench}>
                    <div className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="label-sm">ID da OS</label>
                                <input
                                    value={geral.osId}
                                    onChange={e => setGeral({ ...geral, osId: e.target.value })}
                                    className="input-glass mt-1"
                                    placeholder="Ex: 3055"
                                />
                            </div>
                            <button onClick={buscarOS} className="btn-secondary h-11 px-4">
                                Buscar OS
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <label className="label-sm">Código do Serviço (LC 116/03) *</label>
                            <input
                                value={geral.codigoServicoCnae}
                                onChange={e => setGeral({ ...geral, codigoServicoCnae: e.target.value })}
                                className="input-glass mt-1 font-mono text-sm"
                                placeholder="Ex: 14.01 (Lubrificação, limpeza e manutenção)"
                            />
                        </div>

                        <div>
                            <label className="label-sm">Aliquota ISS (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={geral.aliquotaIss}
                                onChange={e => setGeral({ ...geral, aliquotaIss: e.target.value })}
                                className="input-glass mt-1"
                            />
                        </div>

                        <div>
                            <label className="label-sm">Descrição do Serviço (Aparece na Nota)</label>
                            <textarea
                                value={geral.descricaoServico}
                                onChange={e => setGeral({ ...geral, descricaoServico: e.target.value })}
                                className="input-glass mt-1 min-h-[100px] resize-y"
                                placeholder="Descreva o serviço para o corpo da nota..."
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-50 flex gap-2">
                            <AlertCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                                A NFS-e é enviada para o webservice da prefeitura configurada nos dados da sua empresa. Apenas valores de Mão de Obra são tributados aqui.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Resumo da OS Mapeada */}
                <div className="space-y-6">
                    <GlassCard title="Tomador do Serviço" icon={User}>
                        {osMocada ? (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase">Cliente</p>
                                <p className="font-bold text-slate-800">{osMocada.cliente.nome}</p>
                                <p className="text-sm font-mono text-slate-500">{osMocada.cliente.cnpj}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Busque uma OS para carregar o cliente.</p>
                        )}
                    </GlassCard>

                    <GlassCard title="Valores Tributáveis" icon={FileText}>
                        {osMocada ? (
                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600 font-medium">Valor Total dos Serviços</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(osMocada.valorTotalServicos * 100)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600 font-medium">Alíquota Média ISS</span>
                                    <span className="font-bold text-slate-800">{geral.aliquotaIss}%</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-600 font-medium">Valor Estimado ISS</span>
                                    <span className="font-bold text-amber-600">{formatCurrency(calcularISS() * 100)}</span>
                                </div>

                                <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 flex justify-between items-center mt-4">
                                    <span className="font-bold text-brand-700 uppercase font-sm">Total NFS-e</span>
                                    <span className="text-2xl font-black text-brand-700">
                                        {formatCurrency(osMocada.valorTotalServicos * 100)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                                <FileText size={32} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">Nenhum serviço mapeado</p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
