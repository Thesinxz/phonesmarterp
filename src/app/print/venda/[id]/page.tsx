"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Printer, FileText, Receipt, ArrowLeft } from "lucide-react";

export default function VendaPrintPage() {
    const params = useParams();
    const id = params.id as string;

    const [venda, setVenda] = useState<any>(null);
    const [itens, setItens] = useState<any[]>([]);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formatConfig, setFormatConfig] = useState<"80mm" | "a4">("80mm");

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const supabase = createClient();

            // Buscar Venda + Cliente
            const { data: vendaData, error: vendaErr } = await supabase
                .from('vendas')
                .select(`
                    id, created_at, total_centavos, desconto_centavos, forma_pagamento, observacoes,
                    clientes (nome, cpf, telefone, email, endereco, numero, bairro, cidade, uf)
                `)
                .eq('id', id)
                .single();

            if (vendaErr) throw vendaErr;
            setVenda(vendaData);

            // Buscar Itens
            const { data: itensData, error: itensErr } = await supabase
                .from('venda_itens')
                .select(`
                    id, quantidade, preco_unitario_centavos, total_centavos,
                    produtos (nome, sku, imei)
                `)
                .eq('venda_id', id);

            if (itensErr) throw itensErr;
            setItens(itensData || []);

            // Buscar Empresa Info
            const { data: configData } = await supabase
                .from('configuracoes')
                .select('valor')
                .eq('chave', 'nfe_emitente')
                .single() as { data: any };

            if (configData?.valor) {
                setEmpresa(configData.valor);
            } else {
                // Fallback to auth context
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.empresa_id) {
                    const { data: empData } = await supabase.from('empresas').select('nome, cnpj').eq('id', user.user_metadata.empresa_id).single();
                    setEmpresa(empData);
                }
            }

        } catch (error) {
            console.error("Erro ao carregar venda:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando recibo...</div>;
    }

    if (!venda) {
        return <div className="p-8 text-center text-rose-500 font-bold">Venda não encontrada ou sem permissão.</div>;
    }

    const { clientes } = venda;

    return (
        <div className="min-h-screen bg-slate-100/50 print:bg-white flex flex-col items-center py-8 print:py-0">
            {/* Control Bar (Hidden when printing) */}
            <div className="w-full max-w-2xl bg-white p-4 rounded-2xl shadow-sm mb-6 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.close()} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800">Opções de Impressão</h1>
                        <p className="text-xs text-slate-500">Escolha o formato e imprima</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFormatConfig("80mm")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${formatConfig === "80mm" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                        <Receipt size={16} /> Bobina 80mm
                    </button>
                    <button
                        onClick={() => setFormatConfig("a4")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${formatConfig === "a4" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                        <FileText size={16} /> A4 PDF
                    </button>
                    <div className="w-px h-8 bg-slate-200 mx-2" />
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
                    >
                        <Printer size={16} /> Imprimir Agora
                    </button>
                </div>
            </div>

            {/* Receipt Paper */}
            <div className={`bg-white shadow-xl print:shadow-none print:m-0 mx-auto ${formatConfig === "80mm" ? "w-[300px] p-4 text-[11px] leading-snug font-mono" : "w-full max-w-3xl p-10 text-sm font-sans"}`}>

                {/* Header ======================================================= */}
                {formatConfig === "80mm" ? (
                    <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-3">
                        <h2 className="font-bold text-sm uppercase">{empresa?.razao_social || empresa?.nome || "MINHA EMPRESA"}</h2>
                        {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                        {empresa?.telefone && <p>Tel: {empresa.telefone}</p>}
                        {empresa?.logradouro && <p>{empresa.logradouro}, {empresa.numero}</p>}
                        <br />
                        <h3 className="font-bold text-sm uppercase tracking-wider">RECIBO DE VENDA</h3>
                        <p>#{venda.id.split('-')[0].toUpperCase()} • {format(new Date(venda.created_at), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                ) : (
                    <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{empresa?.razao_social || empresa?.nome || "MINHA EMPRESA"}</h2>
                            <div className="text-slate-500 mt-1">
                                {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                                {empresa?.telefone && <p>Tel: {empresa.telefone}</p>}
                                {empresa?.logradouro && <p>{empresa.logradouro}, {empresa.numero} - {empresa.bairro} - {empresa.municipio}/{empresa.uf}</p>}
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-3xl font-black text-slate-200 uppercase tracking-widest">RECIBO</h3>
                            <p className="font-bold text-slate-800 mt-2">Nº Venda: <span className="text-brand-600">{venda.id.split('-')[0].toUpperCase()}</span></p>
                            <p className="text-slate-500">Data: {format(new Date(venda.created_at), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                    </div>
                )}


                {/* Cliente ======================================================= */}
                {clientes && (
                    <div className={`mb-4 ${formatConfig === "80mm" ? "border-b border-dashed border-slate-300 pb-3" : "bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6"}`}>
                        <div className={formatConfig === "80mm" ? "uppercase" : "font-bold text-slate-800 mb-2"}>
                            {formatConfig === "80mm" ? "CLIENTE" : "Dados do Cliente"}
                        </div>
                        {formatConfig === "80mm" ? (
                            <>
                                <p>{clientes.nome.substring(0, 30)}</p>
                                {clientes.cpf && <p>CPF: {clientes.cpf}</p>}
                                {clientes.telefone && <p>Tel: {clientes.telefone}</p>}
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                <p><span className="font-medium text-slate-800">Nome:</span> {clientes.nome}</p>
                                {clientes.cpf && <p><span className="font-medium text-slate-800">CPF/CNPJ:</span> {clientes.cpf}</p>}
                                {clientes.telefone && <p><span className="font-medium text-slate-800">Telefone:</span> {clientes.telefone}</p>}
                                {clientes.email && <p><span className="font-medium text-slate-800">E-mail:</span> {clientes.email}</p>}
                                {clientes.endereco && <p className="col-span-2"><span className="font-medium text-slate-800">Endereço:</span> {clientes.endereco}, {clientes.numero} - {clientes.bairro}, {clientes.cidade}/{clientes.uf}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Items ======================================================= */}
                <div className="mb-4">
                    {formatConfig === "80mm" ? (
                        <div className="w-full">
                            <div className="flex border-b border-slate-900 pb-1 mb-2 font-bold uppercase">
                                <div className="flex-1">DESCRIÇÃO</div>
                                <div className="w-12 text-center">QTD</div>
                                <div className="w-16 text-right">TOTAL</div>
                            </div>
                            {itens.map((item, i) => (
                                <div key={i} className="mb-2">
                                    <div className="uppercase line-clamp-2">{item.produtos?.nome || "Item Não Encontrado"}</div>
                                    <div className="flex justify-between text-slate-500 mt-1">
                                        <span>
                                            {item.quantidade}x {(item.preco_unitario_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-black font-bold">
                                            {(item.total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {item.produtos?.imei && <div>IMEI: {item.produtos.imei}</div>}
                                </div>
                            ))}
                            <div className="border-t border-dashed border-slate-300 mt-3 pt-3">
                                {venda.desconto_centavos > 0 && (
                                    <div className="flex justify-between mb-1">
                                        <span>Desconto</span>
                                        <span>- {(venda.desconto_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-sm mt-1">
                                    <span>TOTAL</span>
                                    <span>R$ {(venda.total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span>Pagamento</span>
                                    <span className="uppercase">{venda.forma_pagamento.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full mb-8">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="py-3 font-black text-slate-400 uppercase text-xs tracking-wider">Descrição do Item</th>
                                        <th className="py-3 font-black text-slate-400 uppercase text-xs tracking-wider text-center">Quant.</th>
                                        <th className="py-3 font-black text-slate-400 uppercase text-xs tracking-wider text-right">V. Unitário</th>
                                        <th className="py-3 font-black text-slate-400 uppercase text-xs tracking-wider text-right">V. Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itens.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-100 last:border-0">
                                            <td className="py-4">
                                                <div className="font-bold text-slate-800">{item.produtos?.nome || "Item Não Encontrado"}</div>
                                                {(item.produtos?.imei || item.produtos?.sku) && (
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {item.produtos.imei ? `IMEI: ${item.produtos.imei}` : `SKU: ${item.produtos.sku}`}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 text-center font-medium">{item.quantidade}</td>
                                            <td className="py-4 text-right text-slate-600">R$ {(item.preco_unitario_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="py-4 text-right font-black text-slate-800">R$ {(item.total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end mt-6">
                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Subtotal</span>
                                        <span>R$ {((venda.total_centavos + venda.desconto_centavos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {venda.desconto_centavos > 0 && (
                                        <div className="flex justify-between text-rose-500">
                                            <span>Desconto</span>
                                            <span>- R$ {(venda.desconto_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3">
                                        <span className="font-black text-slate-800 uppercase">Total Final</span>
                                        <span className="text-2xl font-black text-brand-600">R$ {(venda.total_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 text-slate-500">
                                        <span>Método de Pagto.</span>
                                        <span className="font-bold text-slate-800 uppercase">{venda.forma_pagamento.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer ======================================================= */}
                <div className={`mt-8 ${formatConfig === "80mm" ? "text-center text-[10px] border-t border-dashed border-slate-300 pt-3 space-y-2" : "border-t border-slate-200 pt-6 text-sm text-slate-500 space-y-4"}`}>
                    {venda.observacoes && (
                        <div className={formatConfig === "80mm" ? "" : "bg-slate-50 p-4 rounded-xl text-slate-700"}>
                            <p className="font-bold">Observações:</p>
                            <p>{venda.observacoes}</p>
                        </div>
                    )}
                    <p className={formatConfig === "80mm" ? "" : "text-center italic"}>
                        {formatConfig === "80mm" ?
                            "OBRIGADO PELA PREFERÊNCIA!\nDOCUMENTO NÃO FISCAL" :
                            "Obrigado pela preferência! Este é um recibo simples (documento não fiscal)."
                        }
                    </p>
                    {formatConfig === "a4" && (
                        <div className="pt-20 pb-4 text-center">
                            <div className="w-64 border-t border-slate-400 mx-auto mb-2"></div>
                            <p className="font-bold text-slate-800 uppercase text-xs">Assinatura do Responsável</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:bg-white { background: white !important; }
                    .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
                }
            `}} />
        </div>
    );
}
