"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Building2, Package, DollarSign, ClipboardCheck, Plus, Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import {
    getFornecedorByCnpj,
    upsertFornecedor,
    createCompra,
    updateXmlImportacao,
    type FornecedorPayload,
    type CompraItemPayload
} from "@/services/compras";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient() as any;

const STEPS = [
    { id: 1, label: "Fornecedor", icon: Building2 },
    { id: 2, label: "Itens", icon: Package },
    { id: 3, label: "Financeiro", icon: DollarSign },
    { id: 4, label: "Confirmação", icon: ClipboardCheck },
];

interface ItemForm extends CompraItemPayload {
    isNew?: boolean;
    produtoEncontrado?: any;
}

export default function CadastrarCompraPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { profile } = useAuth();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [xmlImportacao, setXmlImportacao] = useState<any>(null);

    // Step 1 — Fornecedor
    const [fornecedor, setFornecedor] = useState<FornecedorPayload | null>(null);
    const [fornecedorForm, setFornecedorForm] = useState({ nome: "", cnpj: "", ie: "", telefone: "", email: "", contato: "" });
    const [fornecedorExistente, setFornecedorExistente] = useState(false);

    // Step 2 — Itens
    const [itens, setItens] = useState<ItemForm[]>([]);

    // Step 3 — Financeiro
    const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);
    const [dataVencimento, setDataVencimento] = useState("");
    const [formaPagamento, setFormaPagamento] = useState("boleto");
    const [observacoes, setObservacoes] = useState("");
    const [valorFrete, setValorFrete] = useState(0);

    useEffect(() => {
        if (profile?.empresa_id && params.id) {
            loadXmlImportacao();
        }
    }, [profile?.empresa_id, params.id]);

    async function loadXmlImportacao() {
        const { data, error } = await supabase
            .from("xml_importacoes")
            .select("*")
            .eq("id", params.id)
            .single();
        if (error || !data) { toast.error("Nota não encontrada."); return; }
        setXmlImportacao(data);

        // Pré-preencher fornecedor
        const cnpj = data.fornecedor_cnpj;
        if (cnpj && profile?.empresa_id) {
            const found = await getFornecedorByCnpj(profile.empresa_id, cnpj);
            if (found) {
                setFornecedor(found);
                setFornecedorExistente(true);
            } else {
                setFornecedorForm(f => ({ ...f, nome: data.fornecedor_nome || "", cnpj }));
            }
        }

        // Pré-preencher itens
        const itensJson: any[] = data.itens_json || [];
        const itensFormatados: ItemForm[] = itensJson.map(i => ({
            empresa_id: profile!.empresa_id,
            produto_id: null,
            nome_produto: i.nome || i.xProd || "",
            ncm: i.ncm || i.NCM || "",
            cfop: i.cfop || i.CFOP || "",
            ean: i.ean || i.cEAN || "",
            unidade: i.unidade || i.uCom || "UN",
            quantidade: Number(i.quantidade || i.qCom || 1),
            custo_unitario_centavos: Math.round(Number(i.valorUnitario || i.vUnCom || 0) * 100),
            total_centavos: Math.round(Number(i.valorTotal || i.vProd || 0) * 100),
            isNew: true,
        }));
        setItens(itensFormatados);
        if (data.data_emissao) setDataCompra(data.data_emissao.split("T")[0]);
    }

    const totalItens = itens.reduce((s, i) => s + i.total_centavos, 0);
    const totalGeral = totalItens + Math.round(valorFrete * 100);

    // ── STEP 1 save/check
    async function handleSalvarFornecedor() {
        if (!profile) return;
        if (fornecedorExistente && fornecedor) { setStep(2); return; }
        if (!fornecedorForm.nome) { toast.error("Informe o nome do fornecedor."); return; }
        setSaving(true);
        try {
            const saved = await upsertFornecedor({
                ...fornecedorForm,
                empresa_id: profile.empresa_id,
            });
            setFornecedor(saved);
            setStep(2);
        } catch (e: any) {
            toast.error("Erro ao salvar fornecedor: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    // ── STEP 4 submit
    async function handleFinalizar() {
        if (!profile || !fornecedor) { toast.error("Fornecedor é obrigatório."); return; }
        setSaving(true);
        try {
            // 1. Criar produtos novos se marcados
            const itensComProduto: ItemForm[] = [];
            for (const item of itens) {
                if (item.isNew && !item.produto_id) {
                    const { data: prod, error } = await supabase.from("produtos").insert([{
                        empresa_id: profile.empresa_id,
                        nome: item.nome_produto,
                        ncm: item.ncm || "00000000",
                        cfop: item.cfop || "1102",
                        origem: "0",
                        preco_custo_centavos: item.custo_unitario_centavos,
                        preco_venda_centavos: Math.round(item.custo_unitario_centavos * 1.3),
                        estoque_quantidade: item.quantidade,
                        estoque_minimo: 1,
                        condicao: "novo_lacrado",
                        exibir_vitrine: false,
                    }]).select("id").single();
                    if (!error && prod) {
                        itensComProduto.push({ ...item, produto_id: prod.id });
                    } else {
                        itensComProduto.push(item);
                    }
                } else {
                    // Dar entrada em produto existente
                    if (item.produto_id) {
                        const { data: pr } = await supabase.from("produtos").select("estoque_quantidade").eq("id", item.produto_id).single();
                        if (pr) {
                            await supabase.from("produtos").update({
                                estoque_quantidade: (pr.estoque_quantidade || 0) + item.quantidade,
                                preco_custo_centavos: item.custo_unitario_centavos,
                            }).eq("id", item.produto_id);
                        }
                    }
                    itensComProduto.push(item);
                }
            }

            // 2. Criar conta a pagar
            let tituloId: string | null = null;
            if (dataVencimento) {
                const { data: titulo } = await supabase.from("financeiro_titulos").insert([{
                    empresa_id: profile.empresa_id,
                    tipo: "pagar",
                    status: "pendente",
                    descricao: `Compra NF ${xmlImportacao?.numero_nf || "s/n"} — ${fornecedor.nome}`,
                    valor_total_centavos: totalGeral,
                    valor_pago_centavos: 0,
                    data_vencimento: dataVencimento,
                    fornecedor_id: fornecedor.id || null,
                    categoria: "compra_mercadoria",
                    forma_pagamento_prevista: formaPagamento,
                }]).select("id").single();
                if (titulo) tituloId = titulo.id;
            }

            // 3. Criar compra
            const compraId = await createCompra({
                empresa_id: profile.empresa_id,
                fornecedor_id: fornecedor.id || null,
                numero_nf: xmlImportacao?.numero_nf,
                serie: xmlImportacao?.serie,
                chave_acesso: xmlImportacao?.chave_acesso,
                xml_importacao_id: params.id,
                data_compra: dataCompra,
                data_vencimento: dataVencimento || null,
                forma_pagamento: formaPagamento,
                observacoes,
                valor_subtotal_centavos: totalItens,
                valor_frete_centavos: Math.round(valorFrete * 100),
                valor_total_centavos: totalGeral,
                titulo_id: tituloId,
                itens: itensComProduto,
            });

            // 4. Marcar xml_importacao como processada
            await updateXmlImportacao(params.id, {
                compra_registrada: true,
                compra_id: compraId,
                status_processamento: "processado",
            });

            toast.success("Compra registrada com sucesso!");
            router.push("/compras");
        } catch (e: any) {
            toast.error("Erro ao registrar compra: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6 page-enter pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cadastrar Compra</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        NF-e {xmlImportacao?.numero_nf ? `Nº ${xmlImportacao.numero_nf}` : "—"} · {xmlImportacao?.fornecedor_nome || "Aguardando..."}
                    </p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0">
                {STEPS.map((s, idx) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-bold",
                            step === s.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" :
                                step > s.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                        )}>
                            {step > s.id ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                            <span className="hidden sm:inline">{s.label}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={cn("flex-1 h-0.5 mx-2", step > s.id ? "bg-emerald-300" : "bg-slate-200")} />
                        )}
                    </div>
                ))}
            </div>

            {/* ── STEP 1: FORNECEDOR ── */}
            {step === 1 && (
                <GlassCard title="Fornecedor da Nota" icon={Building2}>
                    {fornecedorExistente && fornecedor ? (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4">
                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={24} />
                            <div>
                                <p className="font-bold text-slate-800">{fornecedor.nome}</p>
                                <p className="text-sm text-slate-500">CNPJ {fornecedor.cnpj} · Fornecedor já cadastrado</p>
                            </div>
                            <button onClick={() => setFornecedorExistente(false)} className="ml-auto text-xs text-brand-600 hover:underline font-bold">
                                Alterar
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="label-sm">Razão Social / Nome *</label>
                                <input className="input-glass mt-1" value={fornecedorForm.nome} onChange={e => setFornecedorForm(f => ({ ...f, nome: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-sm">CNPJ</label>
                                <input className="input-glass mt-1" value={fornecedorForm.cnpj} onChange={e => setFornecedorForm(f => ({ ...f, cnpj: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-sm">Inscrição Estadual</label>
                                <input className="input-glass mt-1" value={fornecedorForm.ie} onChange={e => setFornecedorForm(f => ({ ...f, ie: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-sm">Telefone</label>
                                <input className="input-glass mt-1" value={fornecedorForm.telefone} onChange={e => setFornecedorForm(f => ({ ...f, telefone: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-sm">E-mail</label>
                                <input className="input-glass mt-1" type="email" value={fornecedorForm.email} onChange={e => setFornecedorForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-sm">Nome do Contato</label>
                                <input className="input-glass mt-1" value={fornecedorForm.contato} onChange={e => setFornecedorForm(f => ({ ...f, contato: e.target.value }))} />
                            </div>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSalvarFornecedor} disabled={saving} className="btn-primary px-8 flex items-center gap-2">
                            Próximo <ArrowRight size={16} />
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* ── STEP 2: ITENS ── */}
            {step === 2 && (
                <GlassCard title="Itens da Nota Fiscal" icon={Package}>
                    <div className="mt-4 space-y-3">
                        {itens.map((item, idx) => (
                            <div key={idx} className="p-4 border border-slate-200 rounded-xl space-y-3 bg-white/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 text-sm">{item.nome_produto}</p>
                                        <p className="text-xs text-slate-400 font-mono">NCM {item.ncm} · CFOP {item.cfop}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-slate-800">{formatCurrency(item.total_centavos)}</p>
                                        <p className="text-xs text-slate-400">{item.quantidade} × {formatCurrency(item.custo_unitario_centavos)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={item.isNew !== false}
                                            onChange={e => setItens(prev => prev.map((it, i) => i === idx ? { ...it, isNew: e.target.checked } : it))}
                                            className="rounded"
                                        />
                                        Cadastrar produto no estoque
                                    </label>
                                    {item.isNew === false && (
                                        <span className="text-xs text-slate-400 italic">Item ignorado — não entrará no estoque</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-between">
                        <button onClick={() => setStep(1)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold">
                            <ArrowLeft size={16} className="inline mr-1" /> Voltar
                        </button>
                        <button onClick={() => setStep(3)} className="btn-primary px-8 flex items-center gap-2">
                            Próximo <ArrowRight size={16} />
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* ── STEP 3: FINANCEIRO ── */}
            {step === 3 && (
                <GlassCard title="Informações Financeiras" icon={DollarSign}>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-sm">Data da Compra *</label>
                            <input type="date" className="input-glass mt-1" value={dataCompra} onChange={e => setDataCompra(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-sm">Data de Vencimento (para Conta a Pagar)</label>
                            <input type="date" className="input-glass mt-1" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-sm">Forma de Pagamento</label>
                            <select className="input-glass mt-1" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
                                <option value="boleto">Boleto</option>
                                <option value="pix">PIX</option>
                                <option value="prazo">A Prazo</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="cartao">Cartão</option>
                                <option value="transferencia">Transferência</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-sm">Valor do Frete (R$)</label>
                            <input type="number" step="0.01" className="input-glass mt-1" value={valorFrete} onChange={e => setValorFrete(Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                            <label className="label-sm">Observações</label>
                            <textarea className="input-glass mt-1 h-20 resize-none" value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-1 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal Itens</span><span>{formatCurrency(totalItens)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Frete</span><span>{formatCurrency(Math.round(valorFrete * 100))}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2 mt-2">
                            <span>Total da Compra</span><span>{formatCurrency(totalGeral)}</span>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between">
                        <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold">
                            <ArrowLeft size={16} className="inline mr-1" /> Voltar
                        </button>
                        <button onClick={() => setStep(4)} className="btn-primary px-8 flex items-center gap-2">
                            Próximo <ArrowRight size={16} />
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* ── STEP 4: CONFIRMAÇÃO ── */}
            {step === 4 && (
                <div className="space-y-4">
                    <GlassCard title="Resumo da Compra" icon={ClipboardCheck}>
                        <div className="mt-4 space-y-6">
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="label-sm mb-1">Fornecedor</p>
                                    <p className="font-bold text-slate-800">{fornecedor?.nome}</p>
                                    <p className="text-slate-500">{fornecedor?.cnpj}</p>
                                </div>
                                <div>
                                    <p className="label-sm mb-1">Nota Fiscal</p>
                                    <p className="font-bold text-slate-800">Nº {xmlImportacao?.numero_nf || "—"} Série {xmlImportacao?.serie || "—"}</p>
                                    <p className="text-slate-500 font-mono text-xs truncate">{xmlImportacao?.chave_acesso}</p>
                                </div>
                                <div>
                                    <p className="label-sm mb-1">Pagamento</p>
                                    <p className="font-bold text-slate-800 capitalize">{formaPagamento}</p>
                                    {dataVencimento && <p className="text-slate-500">Vence em {dataVencimento.split("-").reverse().join("/")}</p>}
                                </div>
                                <div>
                                    <p className="label-sm mb-1">Total da Compra</p>
                                    <p className="text-2xl font-black text-brand-700">{formatCurrency(totalGeral)}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="label-sm mb-3">O que será criado:</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14} /> Compra registrada com {itens.filter(i => i.isNew !== false).length} {itens.filter(i => i.isNew !== false).length === 1 ? "produto" : "produtos"} no estoque</li>
                                    {!fornecedorExistente && <li className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14} /> Fornecedor "{fornecedor?.nome}" cadastrado</li>}
                                    {dataVencimento && <li className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14} /> Conta a Pagar de {formatCurrency(totalGeral)} em {dataVencimento.split("-").reverse().join("/")}</li>}
                                </ul>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="flex justify-between">
                        <button onClick={() => setStep(3)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold">
                            <ArrowLeft size={16} className="inline mr-1" /> Voltar
                        </button>
                        <button onClick={handleFinalizar} disabled={saving} className="btn-primary px-10 flex items-center gap-2 text-base">
                            {saving ? (
                                <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Registrando...</>
                            ) : (
                                <><CheckCircle2 size={18} /> Finalizar Compra</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
