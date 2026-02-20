"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { Zap } from "lucide-react";

export default function PrintVendaPage({ params }: { params: { id: string } }) {
    const [venda, setVenda] = useState<any>(null);
    const [empresa, setEmpresa] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const supabase = createClient();

            // Fetch Venda with Items and Cliente
            const { data: vendaData } = await supabase
                .from("vendas")
                .select(`
                    *,
                    cliente:clientes(*),
                    itens:venda_itens(
                        *,
                        produto:produtos(nome)
                    )
                `)
                .eq("id", params.id)
                .single();

            // Fetch Empresa Config
            const { data: configData } = await supabase
                .from("configuracoes")
                .select("*")
                .eq("chave", "emitente")
                .single();

            setVenda(vendaData);
            setEmpresa((configData as any)?.valor || {});
            setLoading(false);

            // Auto print when data is ready
            if (vendaData) {
                setTimeout(() => window.print(), 500);
            }
        }

        loadData();
    }, [params.id]);

    if (loading) return <div className="p-8 text-center font-mono">Carregando...</div>;
    if (!venda) return <div className="p-8 text-center font-mono">Venda não encontrada.</div>;

    return (
        <div className="w-[80mm] mx-auto bg-white p-4 font-mono text-[11px] leading-tight text-black print:p-0">
            {/* Header */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-black pb-4">
                <div className="flex justify-center mb-1">
                    <Zap size={24} className="fill-black" />
                </div>
                <h1 className="text-sm font-bold uppercase">{empresa.nome_fantasia || "SMART OS ERP"}</h1>
                <p>{empresa.razao_social}</p>
                <p>CNPJ: {empresa.cnpj}</p>
                <p>{empresa.logradouro}, {empresa.numero}</p>
                <p>{empresa.bairro} - {empresa.municipio}/{empresa.uf}</p>
                <p>TEL: {empresa.telefone}</p>
            </div>

            {/* Sale Info */}
            <div className="mb-4 space-y-0.5 border-b border-dashed border-black pb-2 text-[10px]">
                <div className="flex justify-between">
                    <span className="font-bold">RECIBO DE VENDA</span>
                    <span className="font-bold">#{venda.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                    <span>DATA:</span>
                    <span>{formatDate(venda.created_at)}</span>
                </div>
                <div className="flex justify-between">
                    <span>CLIENTE:</span>
                    <span>{venda.cliente?.nome || "CONSUMIDOR"}</span>
                </div>
                {venda.cliente?.cpf_cnpj && (
                    <div className="flex justify-between">
                        <span>CPF/CNPJ:</span>
                        <span>{venda.cliente.cpf_cnpj}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="mb-4">
                <div className="grid grid-cols-[1fr_40px_60px_60px] font-bold border-b border-black mb-1 py-1 text-[9px] uppercase">
                    <span>Item</span>
                    <span className="text-center">Qtd</span>
                    <span className="text-right">Unit</span>
                    <span className="text-right">Total</span>
                </div>
                <div className="space-y-2">
                    {venda.itens.map((item: any, i: number) => (
                        <div key={i} className="grid grid-cols-[1fr_40px_60px_60px] items-start">
                            <span className="uppercase">{item.produto?.nome}</span>
                            <span className="text-center">{item.quantidade}</span>
                            <span className="text-right">{formatCurrency(item.preco_unitario_centavos)}</span>
                            <span className="text-right font-bold">{formatCurrency(item.total_centavos)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="border-t border-black pt-2 space-y-1 mb-6">
                <div className="flex justify-between text-xs">
                    <span>SUBTOTAL:</span>
                    <span>{formatCurrency(venda.total_centavos + (venda.desconto_centavos || 0))}</span>
                </div>
                {venda.desconto_centavos > 0 && (
                    <div className="flex justify-between text-xs">
                        <span>DESCONTO:</span>
                        <span>- {formatCurrency(venda.desconto_centavos)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(venda.total_centavos)}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1">
                    <span>FORMA PGTO:</span>
                    <span className="uppercase font-bold">{venda.forma_pagamento}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t border-dashed border-black pt-4 space-y-4">
                <p className="font-bold uppercase">Obrigado pela preferência!</p>
                <div className="text-[9px] text-gray-600 italic">
                    <p>Este documento não é um documento fiscal.</p>
                    <p>Smart OS ERP - www.smartos.com.br</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body {
                        background: white;
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}
