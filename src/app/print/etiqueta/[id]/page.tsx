"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Printer, Tag, ArrowLeft } from "lucide-react";
import { type Produto } from "@/types/database";

export default function PrintEtiquetaPage() {
    const params = useParams();
    const id = params.id as string;

    const [produto, setProduto] = useState<Produto | null>(null);
    const [loading, setLoading] = useState(true);
    const [qtd, setQtd] = useState(1);
    const [formatConfig, setFormatConfig] = useState<"40x25" | "50x30">("40x25");

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProduto(data as Produto);
        } catch (error) {
            console.error("Erro ao carregar produto:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando etiqueta...</div>;
    }

    if (!produto) {
        return <div className="p-8 text-center text-rose-500 font-bold">Produto não encontrado.</div>;
    }

    const identifier = produto.codigo_barras || produto.sku || produto.imei || "SEM-CODIGO";
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(identifier)}&code=Code128&dpi=96&dataseparator=`;

    // Multiplicar elementos para imprimir várias cópias na mesma bobina
    const etiquetas = Array.from({ length: qtd });

    return (
        <div className="min-h-screen bg-slate-100/50 print:bg-white flex flex-col items-center py-8 print:py-0">
            {/* Control Bar (Hidden when printing) */}
            <div className="w-full max-w-2xl bg-white p-4 rounded-2xl shadow-sm mb-6 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.close()} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800">Imprimir Etiqueta</h1>
                        <p className="text-xs text-slate-500">Impressora Térmica (Zebra/Argox/Elgin)</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-600">Qtd:</span>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={qtd}
                            onChange={e => setQtd(Number(e.target.value) || 1)}
                            className="w-12 text-center bg-transparent font-bold text-slate-800 outline-none"
                        />
                    </div>

                    <div className="bg-slate-100 p-1 rounded-lg flex">
                        <button
                            onClick={() => setFormatConfig("40x25")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${formatConfig === "40x25" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            40x25mm
                        </button>
                        <button
                            onClick={() => setFormatConfig("50x30")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${formatConfig === "50x30" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            50x30mm
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
                    >
                        <Printer size={16} /> Imprimir Agora
                    </button>
                </div>
            </div>

            {/* Label Canvas */}
            <div className="print:m-0 flex flex-col items-center gap-4">
                {etiquetas.map((_, i) => (
                    <div
                        key={i}
                        className={`bg-white shadow-xl print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden relative box-border
                            ${formatConfig === "40x25" ? "w-[40mm] h-[25mm] p-1" : "w-[50mm] h-[30mm] p-1.5"}
                        `}
                    >
                        {/* Nome do Produto (Truncado) */}
                        <div className={`font-bold leading-tight uppercase font-sans text-center text-black line-clamp-2
                            ${formatConfig === "40x25" ? "text-[7px]" : "text-[8px] mb-0.5"}
                        `}>
                            {produto.nome}
                        </div>

                        {/* Preço de Venda em Destaque */}
                        <div className="flex-1 flex items-center justify-center">
                            <span className={`font-black tracking-tight text-black
                                ${formatConfig === "40x25" ? "text-sm" : "text-lg"}
                            `}>
                                R$ {(produto.preco_venda_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Código de Barras (Imagem) */}
                        <div className="h-1/3 w-full flex flex-col items-center justify-end pb-0.5">
                            <img
                                src={barcodeUrl}
                                alt="Barcode"
                                className="h-full w-[90%] object-contain"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Print Styles para Tamanhos Térmicos */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${formatConfig === "40x25" ? "40mm 25mm" : "50mm 30mm"}; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        background: white;
                    }
                    .print\\:hidden { display: none !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
}
