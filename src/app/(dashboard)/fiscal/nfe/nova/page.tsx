"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    Send,
    User,
    Package,
    DollarSign,
    FileText,
    Calculator,
    AlertCircle,
    Plus,
    Trash2,
    Search
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { maskCPF, maskCEP, maskPhone } from "@/utils/masks";

export default function NovaNFePage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Dados Gerais da NF-e
    const [geral, setGeral] = useState({
        naturezaOperacao: "Venda de Mercadoria",
        tipoDocumento: "1", // 1 - Saída
        finalidade: "1", // 1 - Normal
        dataEmissao: new Date().toISOString().split("T")[0],
    });

    // Destinatário
    const [destinatario, setDestinatario] = useState({
        nome: "",
        cpf_cnpj: "",
        indicadorIE: "9",
        inscricaoEstadual: "",
        email: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
    });

    // Itens (Produtos)
    const [itens, setItens] = useState<any[]>([]);

    // Totais e Pagamento
    const [totais, setTotais] = useState({
        frete: "0,00",
        seguro: "0,00",
        outrasDespesas: "0,00",
        desconto: "0,00",
    });

    const [pagamento, setPagamento] = useState({
        forma: "dinheiro",
        parcelas: "1",
    });

    const calcularTotalProdutos = () => {
        return itens.reduce((acc, item) => acc + (item.quantidade * item.valorUnitario), 0);
    };

    const calcularTotalNota = () => {
        const prod = calcularTotalProdutos();
        const parseBr = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;

        const frete = parseBr(totais.frete);
        const seguro = parseBr(totais.seguro);
        const outras = parseBr(totais.outrasDespesas);
        const desc = parseBr(totais.desconto);

        return prod + frete + seguro + outras - desc;
    };

    const handleAddItem = () => {
        setItens([
            ...itens,
            {
                id: Date.now().toString(),
                nome: "",
                ncm: "",
                cfop: "5102",
                quantidade: 1,
                valorUnitario: 0,
            }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        setItens(itens.filter(i => i.id !== id));
    };

    const handleItemChange = (id: string, field: string, value: any) => {
        setItens(itens.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSubmit = async (acao: "rascunho" | "emitir") => {
        if (!profile?.empresa_id) {
            toast.error("Erro de autenticação");
            return;
        }

        if (itens.length === 0) {
            toast.error("Adicione pelo menos um item à nota fiscal");
            return;
        }

        if (!destinatario.nome || !destinatario.cpf_cnpj) {
            toast.error("Preencha os dados básicos do destinatário");
            return;
        }

        setLoading(true);
        try {
            // Em um cenário real, aqui seria a montagem do JSON para a API interna de emissão
            // Por enquanto, salvamos no banco de dados com status correspondente.
            const payload = {
                empresa_id: profile.empresa_id,
                tipo: "NFE",
                ambiente: "homologacao", // Puxaria da configuracao fiscal
                status: acao === "emitir" ? "processando" : "pendente",
                valor_total_centavos: Math.round(calcularTotalNota() * 100),
                dados_json: { geral, destinatario, itens, totais, pagamento }, // Campo para armazenar o JSON estruturado
                data_emissao: geral.dataEmissao,
            };

            const supabase = createClient() as any;
            const { error } = await supabase.from("documentos_fiscais").insert([payload]);

            if (error) throw error;

            toast.success(acao === "emitir" ? "NF-e enviada para processamento!" : "Rascunho salvo com sucesso!");
            router.refresh();
            router.push("/fiscal");

        } catch (error) {
            console.error("Erro ao processar NF-e:", error);
            toast.error("Ocorreu um erro ao processar a nota fiscal.");
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
                        <h1 className="text-2xl font-bold text-slate-800">Nova NF-e</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Emissão de Nota Fiscal Eletrônica (Mod. 55)</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleSubmit("rascunho")}
                        disabled={loading}
                        className="btn-secondary h-12 px-6"
                    >
                        <Save size={18} />
                        Salvar Rascunho
                    </button>
                    <button
                        onClick={() => handleSubmit("emitir")}
                        disabled={loading}
                        className="btn-primary h-12 px-8 flex items-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                        Transmitir NF-e
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Coluna Esquerda: Dados Principais */}
                <div className="col-span-2 space-y-6">
                    {/* Dados Gerais */}
                    <GlassCard title="Dados Gerais da Operação" icon={FileText}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="label-sm">Natureza da Operação *</label>
                                <input
                                    value={geral.naturezaOperacao}
                                    onChange={e => setGeral({ ...geral, naturezaOperacao: e.target.value })}
                                    className="input-glass mt-1"
                                    placeholder="Ex: Venda de Mercadoria"
                                />
                            </div>
                            <div>
                                <label className="label-sm">Tipo de Documento *</label>
                                <select
                                    className="input-glass mt-1 appearance-none"
                                    value={geral.tipoDocumento}
                                    onChange={e => setGeral({ ...geral, tipoDocumento: e.target.value })}
                                >
                                    <option value="1">1 - Saída</option>
                                    <option value="0">0 - Entrada</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-sm">Finalidade da Emissão *</label>
                                <select
                                    className="input-glass mt-1 appearance-none"
                                    value={geral.finalidade}
                                    onChange={e => setGeral({ ...geral, finalidade: e.target.value })}
                                >
                                    <option value="1">1 - Normal</option>
                                    <option value="2">2 - Complementar</option>
                                    <option value="3">3 - Ajuste</option>
                                    <option value="4">4 - Devolução/Retorno</option>
                                </select>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Destinatário */}
                    <GlassCard title="Destinatário (Cliente)" icon={User}>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        placeholder="Buscar cliente salvo..."
                                        className="input-glass pl-9"
                                    />
                                </div>
                                <button className="btn-secondary whitespace-nowrap px-4 py-2">Buscar</button>
                            </div>

                            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="label-sm">Razão Social / Nome Completo *</label>
                                    <input
                                        value={destinatario.nome}
                                        onChange={e => setDestinatario({ ...destinatario, nome: e.target.value })}
                                        className="input-glass mt-1"
                                        placeholder="Nome do cliente"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">CPF / CNPJ *</label>
                                    <input
                                        value={destinatario.cpf_cnpj}
                                        onChange={e => setDestinatario({ ...destinatario, cpf_cnpj: maskCPF(e.target.value) })}
                                        className="input-glass mt-1"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">E-mail</label>
                                    <input
                                        value={destinatario.email}
                                        onChange={e => setDestinatario({ ...destinatario, email: e.target.value })}
                                        className="input-glass mt-1"
                                        placeholder="email@cliente.com"
                                        type="email"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">Indicador de Inscrição Estadual *</label>
                                    <select
                                        value={destinatario.indicadorIE}
                                        onChange={e => setDestinatario({ ...destinatario, indicadorIE: e.target.value })}
                                        className="input-glass mt-1 appearance-none"
                                    >
                                        <option value="1">1 - Contribuinte ICMS</option>
                                        <option value="2">2 - Contribuinte Isento</option>
                                        <option value="9">9 - Não Contribuinte</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-sm">Inscrição Estadual (IE)</label>
                                    <input
                                        value={destinatario.inscricaoEstadual}
                                        onChange={e => setDestinatario({ ...destinatario, inscricaoEstadual: e.target.value })}
                                        className="input-glass mt-1"
                                        placeholder={destinatario.indicadorIE === "9" ? "Isento/Não Contribuinte" : "Número da IE"}
                                        disabled={destinatario.indicadorIE === "9"}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 grid grid-cols-6 gap-4">
                                <div className="col-span-2">
                                    <label className="label-sm">CEP *</label>
                                    <input
                                        value={destinatario.cep}
                                        onChange={e => setDestinatario({ ...destinatario, cep: maskCEP(e.target.value) })}
                                        className="input-glass mt-1"
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="label-sm">Logradouro *</label>
                                    <input
                                        value={destinatario.logradouro}
                                        onChange={e => setDestinatario({ ...destinatario, logradouro: e.target.value })}
                                        className="input-glass mt-1"
                                        placeholder="Rua, Av..."
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="label-sm">Nº *</label>
                                    <input
                                        value={destinatario.numero}
                                        onChange={e => setDestinatario({ ...destinatario, numero: e.target.value })}
                                        className="input-glass mt-1"
                                        placeholder="123"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="label-sm">Bairro *</label>
                                    <input
                                        value={destinatario.bairro}
                                        onChange={e => setDestinatario({ ...destinatario, bairro: e.target.value })}
                                        className="input-glass mt-1"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="label-sm">Cidade *</label>
                                    <input
                                        value={destinatario.cidade}
                                        onChange={e => setDestinatario({ ...destinatario, cidade: e.target.value })}
                                        className="input-glass mt-1"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="label-sm">UF *</label>
                                    <input
                                        value={destinatario.uf}
                                        onChange={e => setDestinatario({ ...destinatario, uf: e.target.value.toUpperCase() })}
                                        className="input-glass mt-1 uppercase"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Produtos/Serviços */}
                    <GlassCard title="Produtos e Serviços" icon={Package}>
                        <div className="space-y-4">
                            {itens.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                    <p className="text-slate-500 font-medium">Nenhum item adicionado à NF-e</p>
                                    <button
                                        onClick={handleAddItem}
                                        className="mt-3 btn-secondary mx-auto"
                                    >
                                        <Plus size={16} /> Adicionar Primeiro Item
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {itens.map((item, index) => (
                                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            <div className="grid grid-cols-12 gap-4">
                                                <div className="col-span-12 pr-8">
                                                    <label className="label-sm">Descrição do Produto/Serviço *</label>
                                                    <input
                                                        value={item.nome}
                                                        onChange={e => handleItemChange(item.id, "nome", e.target.value)}
                                                        className="input-glass mt-1 font-medium text-slate-800"
                                                        placeholder="Ex: iPhone 13 Pro Max 128GB"
                                                    />
                                                </div>
                                                <div className="col-span-4 lg:col-span-3">
                                                    <label className="label-sm">NCM *</label>
                                                    <input
                                                        value={item.ncm}
                                                        onChange={e => handleItemChange(item.id, "ncm", e.target.value)}
                                                        className="input-glass mt-1 font-mono text-sm"
                                                        placeholder="8517.12.31"
                                                    />
                                                </div>
                                                <div className="col-span-4 lg:col-span-3">
                                                    <label className="label-sm">CFOP *</label>
                                                    <input
                                                        value={item.cfop}
                                                        onChange={e => handleItemChange(item.id, "cfop", e.target.value)}
                                                        className="input-glass mt-1 font-mono text-sm"
                                                        placeholder="5102"
                                                    />
                                                </div>
                                                <div className="col-span-4 lg:col-span-2">
                                                    <label className="label-sm">Qtd *</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantidade}
                                                        onChange={e => handleItemChange(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                                                        className="input-glass mt-1"
                                                        min="0.001"
                                                        step="1"
                                                    />
                                                </div>
                                                <div className="col-span-6 lg:col-span-4">
                                                    <label className="label-sm">Valor Unit. (R$) *</label>
                                                    <input
                                                        type="number"
                                                        value={item.valorUnitario}
                                                        onChange={e => handleItemChange(item.id, "valorUnitario", parseFloat(e.target.value) || 0)}
                                                        className="input-glass mt-1 font-bold text-slate-700"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={handleAddItem}
                                        className="btn-secondary w-full border-dashed border-2 bg-transparent hover:bg-slate-50 text-slate-600"
                                    >
                                        <Plus size={16} /> Adicionar Novo Item
                                    </button>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Coluna Direita: Totais e Pagamento */}
                <div className="space-y-6">
                    <GlassCard title="Totalizadores" icon={Calculator}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm font-medium text-slate-500">Total Produtos</span>
                                <span className="font-bold text-slate-700">{formatCurrency(calcularTotalProdutos() * 100)}</span>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="label-sm">Valor do Frete (R$)</label>
                                    <input
                                        value={totais.frete}
                                        onChange={e => setTotais({ ...totais, frete: e.target.value })}
                                        className="input-glass mt-1 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">Valor do Seguro (R$)</label>
                                    <input
                                        value={totais.seguro}
                                        onChange={e => setTotais({ ...totais, seguro: e.target.value })}
                                        className="input-glass mt-1 text-right"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">Desconto Global (R$)</label>
                                    <input
                                        value={totais.desconto}
                                        onChange={e => setTotais({ ...totais, desconto: e.target.value })}
                                        className="input-glass mt-1 text-right text-red-500 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="label-sm">Outras Despesas (R$)</label>
                                    <input
                                        value={totais.outrasDespesas}
                                        onChange={e => setTotais({ ...totais, outrasDespesas: e.target.value })}
                                        className="input-glass mt-1 text-right"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex justify-between items-center">
                                <span className="font-bold text-indigo-700 uppercase font-sm">Valor Total NF-e</span>
                                <span className="text-2xl font-black text-indigo-700">
                                    {formatCurrency(calcularTotalNota() * 100)}
                                </span>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard title="Cobrança / Pagamento" icon={DollarSign}>
                        <div className="space-y-4">
                            <div>
                                <label className="label-sm">Forma de Pagamento</label>
                                <select
                                    className="input-glass mt-1 appearance-none"
                                    value={pagamento.forma}
                                    onChange={e => setPagamento({ ...pagamento, forma: e.target.value })}
                                >
                                    <option value="dinheiro">01 - Dinheiro</option>
                                    <option value="cheque">02 - Cheque</option>
                                    <option value="credito">03 - Cartão de Crédito</option>
                                    <option value="debito">04 - Cartão de Débito</option>
                                    <option value="boleto">15 - Boleto Bancário</option>
                                    <option value="pix">17 - PIX</option>
                                    <option value="outros">99 - Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="label-sm">Condição / Parcelas</label>
                                <select
                                    className="input-glass mt-1 appearance-none"
                                    value={pagamento.parcelas}
                                    onChange={e => setPagamento({ ...pagamento, parcelas: e.target.value })}
                                >
                                    <option value="1">À Vista (1x)</option>
                                    <option value="2">2 Parcelas (Prazo)</option>
                                    <option value="3">3 Parcelas (Prazo)</option>
                                    <option value="4">4 Parcelas (Prazo)</option>
                                    <option value="5">5 Parcelas (Prazo)</option>
                                    <option value="6">6 Parcelas (Prazo)</option>
                                </select>
                            </div>

                            <div className="p-3 mt-4 rounded-lg bg-yellow-50 flex gap-2">
                                <AlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-700 leading-relaxed font-medium">
                                    As faturas serão geradas automaticamente informando as parcelas e os vencimentos padrão do sistema.
                                </p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
