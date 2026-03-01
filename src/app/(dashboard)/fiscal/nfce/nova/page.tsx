"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, ShoppingCart, DollarSign, Package, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";

export default function NovaNFCePage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Dados Gerais da NFC-e
    const [geral, setGeral] = useState({
        vendaId: "",
        cpfCnpjConsumidor: "",
        nomeConsumidor: "",
    });

    // Simulando uma busca de venda finalizada
    const [venda, setVenda] = useState<any>(null);

    const buscarVenda = () => {
        if (!geral.vendaId) {
            toast.error("Informe o ID da Venda");
            return;
        }

        // Mock de Venda
        setVenda({
            id: geral.vendaId,
            numero: 1042,
            valorTotal: 1500.50,
            formaPagamento: "cartao_credito",
            itens: [
                { nome: "Produto Exemplo A", quantidade: 1, valor: 1000.00 },
                { nome: "Serviço Simples", quantidade: 5, valor: 100.10 }
            ]
        });
        toast.success("Venda importada com sucesso!");
    };

    const handleSubmit = async (acao: "rascunho" | "emitir") => {
        if (!profile?.empresa_id) {
            toast.error("Erro de autenticação");
            return;
        }

        if (!venda) {
            toast.error("Importe uma venda primeiro para emitir a NFC-e");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                empresa_id: profile.empresa_id,
                tipo: "NFCE",
                ambiente: "homologacao",
                status: acao === "emitir" ? "processando" : "pendente",
                valor_total_centavos: Math.round(venda.valorTotal * 100),
                dados_json: { geral, venda },
                data_emissao: new Date().toISOString(),
                venda_id: venda.id
            };

            const supabase = createClient() as any;
            const { error } = await supabase.from("documentos_fiscais").insert([payload]);

            if (error) throw error;

            toast.success(acao === "emitir" ? "NFC-e enviada para processamento!" : "Rascunho salvo com sucesso!");
            router.push("/fiscal");

        } catch (error) {
            console.error("Erro ao processar NFC-e:", error);
            toast.error("Ocorreu um erro ao processar a nota.");
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
                        <h1 className="text-2xl font-bold text-slate-800">Nova NFC-e</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Nota Fiscal de Consumidor Eletrônica (Mod. 65)</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSubmit("emitir")}
                        disabled={loading || !venda}
                        className="btn-primary h-12 px-8 flex items-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                        Transmitir NFC-e
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Integração Venda */}
                <GlassCard title="Origem da Venda" icon={ShoppingCart}>
                    <div className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="label-sm">ID da Venda (PDV/Pedidos)</label>
                                <input
                                    value={geral.vendaId}
                                    onChange={e => setGeral({ ...geral, vendaId: e.target.value })}
                                    className="input-glass mt-1"
                                    placeholder="Ex: 1042 ou UUID"
                                />
                            </div>
                            <button onClick={buscarVenda} className="btn-secondary h-11 px-4">
                                Importar
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <label className="label-sm">CPF/CNPJ do Consumidor (Opcional)</label>
                            <input
                                value={geral.cpfCnpjConsumidor}
                                onChange={e => setGeral({ ...geral, cpfCnpjConsumidor: e.target.value })}
                                className="input-glass mt-1"
                                placeholder="Para nota paulista/identificação"
                            />
                        </div>
                        <div>
                            <label className="label-sm">Nome do Consumidor (Opcional)</label>
                            <input
                                value={geral.nomeConsumidor}
                                onChange={e => setGeral({ ...geral, nomeConsumidor: e.target.value })}
                                className="input-glass mt-1"
                                placeholder="João da Silva"
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-blue-50 flex gap-2">
                            <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                A NFC-e é emitida de forma síncrona para vendas ao consumidor final presencial ou entrega no mesmo município.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Resumo da Venda Importada */}
                <GlassCard title="Resumo a Emitir" icon={Package}>
                    {venda ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Venda #</span>
                                    <span className="font-black text-slate-800 text-lg">{venda.numero}</span>
                                </div>
                                <div className="space-y-2 divider-y">
                                    {venda.itens.map((i: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-100/50 last:border-0">
                                            <span className="text-slate-600">{i.quantidade}x {i.nome}</span>
                                            <span className="font-medium text-slate-800">{formatCurrency(i.valor * 100)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-brand-50 border border-brand-100 flex justify-between items-center">
                                <span className="font-bold text-brand-700 uppercase font-sm">Total NFC-e</span>
                                <span className="text-2xl font-black text-brand-700">
                                    {formatCurrency(venda.valorTotal * 100)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma venda importada</p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
