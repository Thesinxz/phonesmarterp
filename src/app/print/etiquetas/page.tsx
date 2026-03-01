"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { type Produto } from "@/types/database";

interface PrintItem {
    id: string;
    q: number;
    p?: number;
}

function EtiquetasPrintContent() {
    const searchParams = useSearchParams();
    const [itens, setItens] = useState<(Produto & { quantity: number })[]>([]);
    const [subdominio, setSubdominio] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const format = searchParams.get("f") || "40x25";
    const type = searchParams.get("t") || "barcode";

    useEffect(() => {
        const rawData = searchParams.get("data");
        if (!rawData) return;

        try {
            const data: PrintItem[] = JSON.parse(rawData);
            loadData(data);
        } catch (e) {
            console.error("Erro ao processar dados de impressão:", e);
        }
    }, [searchParams]);

    async function loadData(printData: PrintItem[]) {
        try {
            const supabase = createClient();
            const ids = printData.map(d => d.id);

            // 1. Buscar Produtos
            const { data: products, error: prodError } = await supabase
                .from('produtos')
                .select('*')
                .in('id', ids);

            if (prodError) throw prodError;

            // 2. Buscar Subdomínio da Empresa (para o QR Code)
            if (products && products.length > 0) {
                const { data: empresa } = await supabase
                    .from('empresas')
                    .select('subdominio')
                    .eq('id', (products[0] as any).empresa_id)
                    .single();

                if (empresa) setSubdominio((empresa as any).subdominio);
            }

            const merged = printData.map(pd => {
                const prod = products?.find((p: any) => p.id === pd.id);
                return prod ? { ...(prod as any), quantity: pd.q, p: (pd as any).p } : null;
            }).filter(Boolean) as (Produto & { quantity: number; p: number })[];

            setItens(merged);
        } catch (error) {
            console.error("Erro ao carregar dados para impressão:", error);
        } finally {
            setLoading(false);
            // Auto-trigger print
            setTimeout(() => {
                window.print();
            }, 1200);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-800 font-bold uppercase tracking-widest text-xs">Preparando Lote de Impressão...</p>
        </div>
    );

    const allLabels = itens.flatMap(item =>
        Array.from({ length: item.quantity }).map(() => item)
    );

    return (
        <div className="bg-white min-h-screen">
            <div className="flex flex-col items-center">
                {allLabels.map((item, i) => {
                    const identifier = item.codigo_barras || item.sku || item.imei || "S/COD";

                    const vitrineUrl = subdominio
                        ? `${window.location.origin}/v/${subdominio}/produto/${item.id}`
                        : `${window.location.origin}/p/${item.id}`;

                    const codeUrl = type === 'barcode'
                        ? `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(identifier)}&code=Code128&dpi=96`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(vitrineUrl)}`;

                    return (
                        <div
                            key={i}
                            className={`flex flex-col justify-between overflow-hidden relative box-border bg-white text-black print:break-after-page
                                ${format === "40x25" ? "w-[40mm] h-[25mm] p-1" :
                                    format === "50x30" ? "w-[50mm] h-[30mm] p-1.5" :
                                        "w-[100mm] h-[150mm] p-4"}
                            `}
                        >
                            {/* Nome */}
                            <div className={`font-bold leading-tight uppercase font-sans text-center line-clamp-2
                                ${format === "40x25" ? "text-[7px]" :
                                    format === "50x30" ? "text-[9px]" : "text-2xl mb-4"}
                            `}>
                                {item.nome}
                            </div>

                            {/* Preço */}
                            <div className="flex-1 flex items-center justify-center">
                                <span className={`font-black tracking-tighter
                                    ${format === "40x25" ? "text-sm" :
                                        format === "50x30" ? "text-lg" : "text-[80px]"}
                                `}>
                                    R$ {((item as any).p ? (item as any).p / 100 : item.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Código */}
                            <div className={`w-full flex flex-col items-center justify-end
                                ${format === "100x150" ? "h-1/2 mb-8" : "h-1/3 pb-0.5"}
                            `}>
                                <img
                                    src={codeUrl}
                                    alt="Code"
                                    className="h-full w-full object-contain"
                                    style={{ imageRendering: 'auto' }}
                                />
                                {format === "100x150" && (
                                    <span className="mt-6 text-3xl font-mono tracking-widest">{identifier}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${format === "40x25" ? "40mm 25mm" :
                        format === "50x30" ? "50mm 30mm" : "100mm 150mm"}; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        background: white;
                    }
                    .print\\:break-after-page { break-after: page; }
                }
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            `}} />
        </div>
    );
}

export default function LabelsPrintPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <EtiquetasPrintContent />
        </Suspense>
    );
}
