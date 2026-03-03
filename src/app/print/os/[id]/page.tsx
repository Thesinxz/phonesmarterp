"use client";

import { useEffect, useState } from "react";
import { getOrdemServicoById } from "@/services/os";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";

export default function PrintOSPage({ params }: { params: { id: string } }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [os, setOs] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [empresa, setEmpresa] = useState<any>(null);
    const [formato, setFormato] = useState<"80mm" | "a4">("80mm");

    useEffect(() => {
        async function load() {
            try {
                const osData = await getOrdemServicoById(params.id);
                setOs(osData);

                // Buscar dados da empresa (config emitente)
                const supabase = createClient();
                const { data } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "nfe_emitente")
                    .single();
                setEmpresa((data as any)?.valor);

                // Se a tela for larga, sugere A4
                if (window.innerWidth > 800) {
                    setFormato("a4");
                }
            } catch (error) {
                console.error(error);
            }
        }
        load();
    }, [params.id]);

    if (!os) return <div className="p-8 text-center font-mono text-sm">Carregando documento...</div>;

    const isA4 = formato === "a4";
    const isEntrada = os.status === 'aberta' || os.status === 'em_analise' || os.status === 'aguardando_peca';
    const tituloDoc = isEntrada ? "Comprovante de Entrada" : "Certificado de Entrega / Saída";

    const containerClass = isA4
        ? "max-w-4xl mx-auto bg-white min-h-screen text-slate-900 font-sans text-sm leading-relaxed p-8 print:p-0 print:m-0 print:w-full print:shadow-none"
        : "max-w-[290px] mx-auto bg-white min-h-screen text-slate-900 font-sans text-[9px] leading-[1.1] pt-2 pb-20 print:w-full print:p-0";

    const pecas = Array.isArray(os.pecas_json) ? os.pecas_json : [];
    const servicos = Array.isArray(os.mao_obra_json) ? os.mao_obra_json : [];
    const checklist = os.checklist_entrada_json || os.checklist_json || {};

    const renderOSContent = (via?: string) => (
        <div className={isA4 ? "w-full max-w-4xl mx-auto bg-white mb-2" : "w-full"}>
            {via && <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pb-1 border-b border-slate-100">{via}</div>}
            {/* Header */}
            <div className={`text-center border-b border-black pb-1 mb-2 ${isA4 ? 'border-solid' : 'border-dashed'}`}>
                <h1 className="font-bold uppercase" style={{ fontSize: isA4 ? '1.8rem' : '1.1rem' }}>{empresa?.nome_fantasia || "SmartOS ERP"}</h1>
                {!isA4 && empresa?.telefone && <p className="font-bold text-[10px]">{empresa.telefone}</p>}
                {isA4 && (
                    <>
                        <p className="font-bold">{empresa?.razao_social}</p>
                        {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                        <p>{empresa?.logradouro ? `${empresa.logradouro}, ${empresa.numero} - ${empresa.bairro}` : ""}</p>
                        <p>{empresa?.cidade} - {empresa?.uf} | {empresa?.telefone}</p>
                    </>
                )}
            </div>

            {/* Title / Info Bloc */}
            <div className={`flex flex-col items-center ${isA4 ? 'mb-6' : 'mb-2'}`}>
                <h2 className={`font-bold uppercase border border-black px-2 py-0.5 rounded-sm ${isA4 ? 'text-xl mb-4 py-1 px-4 border-2' : 'text-[10px] mb-1'}`}>
                    {tituloDoc}
                </h2>
                <div className={`w-full flex justify-between items-end border-b-2 border-slate-100 ${isA4 ? 'pb-2' : 'pb-1'}`}>
                    <div>
                        <h3 className={`font-black ${isA4 ? 'text-3xl' : 'text-lg'}`}>OS #{String(os.numero).padStart(4, '0')}</h3>
                        <p className={`${isA4 ? 'text-sm' : 'text-[8px]'} font-bold text-slate-500 italic`}>Aberto em: {formatDate(os.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                        <div className="flex flex-col items-end">
                            <p className="font-black uppercase text-indigo-600 tracking-tighter" style={{ fontSize: isA4 ? '0.9rem' : '0.6rem' }}>{os.status.replace(/_/g, " ")}</p>
                            <span className={`text-slate-400 font-bold uppercase mt-0.5 ${isA4 ? 'text-[8px]' : 'text-[5px]'}`}>Acesse rapidamente</span>
                        </div>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=${isA4 ? '150x150' : '100x100'}&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/os/' + os.id : '')}`}
                            alt="QR Link da OS"
                            className={`rounded-sm ${isA4 ? 'w-14 h-14' : 'w-8 h-8'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Customer Section */}
            <div className={`${isA4 ? 'mb-6 p-2 rounded-lg bg-slate-50 border border-slate-200' : 'mb-3'}`}>
                <p className={`font-bold uppercase border-b border-black/10 ${isA4 ? 'mb-1 text-xs text-slate-400' : 'text-[8px] mb-0.5'}`}>Dados do Cliente</p>
                <div className={`${isA4 ? 'grid grid-cols-2 gap-4' : 'flex justify-between'}`}>
                    <div>
                        <p className={`font-black ${isA4 ? 'text-lg' : 'text-xs'}`}>{os.cliente?.nome}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">{os.cliente?.telefone || "N/I"}</p>
                    </div>
                </div>
            </div>

            {/* Device Section */}
            <div className={`${isA4 ? 'mb-6' : 'mb-3'}`}>
                <p className={`font-bold uppercase pb-0.5 border-b ${isA4 ? 'mb-2 text-sm border-slate-300' : 'text-[8px] mb-1 border-dashed border-black'}`}>Aparelho & Senha</p>

                <div className={`grid ${isA4 ? 'grid-cols-2 gap-x-8 gap-y-2' : 'grid-cols-1 gap-y-0.5'}`}>
                    <div className="flex justify-between items-center group">
                        <p className={`${isA4 ? 'text-base' : 'text-[10px] font-bold'}`}>{os.marca_equipamento || os.equipamento?.marca} {os.modelo_equipamento || os.equipamento?.modelo}</p>
                        {!isA4 && <p className="text-[8px] text-slate-500">{os.cor_equipamento || os.equipamento?.cor || ""}</p>}
                    </div>
                    <div className="flex justify-between text-[9px]">
                        <p><span className="font-bold">IMEI:</span> {os.imei_equipamento || os.equipamento?.imei || os.numero_serie || "N/A"}</p>
                        <p className="bg-slate-100 px-1 rounded-sm"><span className="font-bold">SENHA:</span> <span className="font-black text-indigo-800 uppercase">{os.senha_dispositivo || "N/I"}</span></p>
                    </div>
                </div>

                <div className={`mt-2 ${isA4 ? 'bg-slate-50 p-3 rounded-xl border border-slate-200' : 'bg-slate-50 p-1 border-l-2 border-indigo-200'}`}>
                    <p className={`font-bold uppercase text-slate-500 mb-0.5 ${isA4 ? 'text-xs' : 'text-[7px]'}`}>Defeito Relatado:</p>
                    <p className={`italic whitespace-pre-wrap ${isA4 ? 'text-base' : 'text-[9px] leading-tight text-slate-700'}`}>
                        {os.problema_relatado || "Nenhuma descrição."}
                    </p>
                </div>

                {/* Checklist - Compacted for 80mm */}
                {Object.keys(checklist).length > 0 && (
                    <div className="mt-2">
                        <p className={`font-bold uppercase text-slate-500 mb-1 ${isA4 ? 'text-[10px]' : 'text-[7px]'}`}>Checklist:</p>
                        <div className={`grid ${isA4 ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
                            {Object.entries(checklist).filter(([_, v]) => v).map(([key]) => (
                                <div key={key} className="flex items-center gap-1 border border-slate-100 p-0.5 rounded bg-slate-50/30">
                                    <span className="text-emerald-600 font-bold text-[7px]">✓</span>
                                    <span className={`capitalize text-slate-600 font-semibold truncate ${isA4 ? 'text-xs' : 'text-[7px]'}`}>{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Financial / Items Section */}
            {(pecas.length > 0 || servicos.length > 0) && (
                <div className={`${isA4 ? 'mb-6' : 'mb-3'}`}>
                    <p className={`font-bold uppercase pb-0.5 border-b ${isA4 ? 'mb-2 text-sm border-slate-300' : 'text-[8px] mb-1 border-dashed border-black'}`}>Itens & Orçamento</p>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b border-slate-900 ${isA4 ? 'text-xs mb-1' : 'text-[7px]'} uppercase font-black`}>
                                <th className="py-0.5">Descrição</th>
                                <th className="py-0.5 text-right w-16">Valor</th>
                            </tr>
                        </thead>
                        <tbody className={isA4 ? 'text-sm' : 'text-[8px]'}>
                            {pecas.map((p: any, i: number) => (
                                <tr key={p.id || i} className="border-b border-slate-50">
                                    <td className="py-0.5">{p.nome} {p.qtd > 1 && `(${p.qtd}x)`}</td>
                                    <td className="py-0.5 text-right font-bold">{formatCurrency((p.preco || p.valor) * (p.qtd || 1))}</td>
                                </tr>
                            ))}
                            {servicos.map((s: any, i: number) => (
                                <tr key={i} className="border-b border-slate-50">
                                    <td className="py-0.5">{s.descricao}</td>
                                    <td className="py-0.5 text-right font-bold">{formatCurrency(s.valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={`mt-2 flex flex-col items-end`}>
                        <div className={`flex justify-between items-center p-2 bg-slate-900 text-white rounded-lg w-full ${isA4 ? 'w-64 text-xl mt-4 py-3' : 'text-[11px]'}`}>
                            <div className="flex flex-col gap-0.5 items-start">
                                <span className="uppercase font-bold text-[8px] opacity-70">Subtotal:</span>
                                {os.orcamento_aprovado && (
                                    <span className="text-[8px] font-black tracking-widest bg-emerald-500/30 text-emerald-300 px-1 py-0.5 rounded uppercase">APROVADO ✓</span>
                                )}
                            </div>
                            <span className="font-black">{formatCurrency(os.valor_total_centavos)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Observations */}
            {os.observacoes_internas && (
                <div className={`${isA4 ? 'mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl' : 'mb-2 p-1 bg-indigo-50/50 rounded'}`}>
                    <p className={`font-bold uppercase text-indigo-400 ${isA4 ? 'text-[10px] mb-1' : 'text-[6px]'}`}>Obs:</p>
                    <p className={`whitespace-pre-wrap leading-tight font-medium text-indigo-900 ${isA4 ? 'text-sm' : 'text-[8px]'}`}>{os.observacoes_internas}</p>
                </div>
            )}

            {/* Terms and Signatures */}
            <div className={`mt-4 text-center pb-4`}>
                <div className={`text-slate-500 text-justify mb-4 flex flex-col gap-1 bg-slate-50 border border-slate-100 rounded-lg ${isA4 ? 'text-xs leading-relaxed p-4 px-6 mx-12 mb-8' : 'text-[7px] leading-[1.1] p-1.5'}`}>
                    <p><b>1. Garantia:</b> 90 dias limitada às peças/serviço realizados. Mau uso anula.</p>
                    <p><b>2. Prazo:</b> 30 dias para retirar após aviso. Após 90 dias, o item poderá se alienado p/ custeio, conforme CDC.</p>
                </div>

                <div className={`grid grid-cols-2 gap-4 w-full mx-auto ${isA4 ? 'mt-12 gap-12 max-w-2xl' : 'mt-6'}`}>
                    <div className="border-t border-black pt-1">
                        <p className="font-bold uppercase tracking-tighter" style={{ fontSize: isA4 ? '0.7rem' : '7px' }}>Cliente</p>
                    </div>
                    <div className="border-t border-black pt-1">
                        <p className="font-bold uppercase tracking-tighter" style={{ fontSize: isA4 ? '0.7rem' : '7px' }}>Técnico/Responsável</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`mt-4 pt-2 border-t border-slate-100 text-center text-slate-400 font-bold uppercase ${isA4 ? 'text-xs' : 'text-[7px]'}`}>
                <p>SmartOS - {new Date().toLocaleString('pt-BR')}</p>
            </div>
        </div>
    );

    return (
        <div className={containerClass}>
            {isA4 ? (
                <div className="w-full h-full min-h-[297mm]">
                    <div>
                        {renderOSContent("Via do Cliente")}
                        <div className="w-full flex items-center justify-center my-6 opacity-30 relative print:my-0 print:py-6">
                            <div className="absolute w-full h-[1px] border-b-[2px] border-dashed border-black"></div>
                            <span className="bg-white px-4 text-slate-500 relative z-10 font-bold tracking-widest text-xs flex items-center gap-2">
                                ✂️ CORTAR AQUI ✂️
                            </span>
                        </div>
                        {renderOSContent("Via da Assistência")}
                    </div>
                </div>
            ) : (
                renderOSContent()
            )}

            {/* Controls */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 print:hidden z-[100] w-full max-w-lg px-4">
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl p-3 flex gap-4 w-full justify-between items-center animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setFormato('80mm')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formato === '80mm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Termo 80mm
                        </button>
                        <button
                            onClick={() => setFormato('a4')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formato === 'a4' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Folha A4
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                        <span>Imprimir</span>
                        <div className="w-1 h-4 bg-white/20 rounded-full" />
                        <span className="opacity-70">PDF</span>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: ${isA4 ? 'A4' : 'auto'}; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        background: white !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print\\:hidden { display: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    .print\\:w-full { width: 100% !important; }
                    .print\\:max-w-none { max-width: none !important; }
                    .print\\:shadow-none { shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
