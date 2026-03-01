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
    const containerClass = isA4
        ? "max-w-4xl mx-auto bg-white min-h-screen text-slate-900 font-sans text-sm leading-relaxed p-8 pb-32 print:p-0 print:m-0 print:w-full print:shadow-none"
        : "max-w-[300px] mx-auto bg-white min-h-screen text-slate-900 font-mono text-[10px] leading-tight pt-4 pb-32 print:w-full print:max-w-[300px] print:p-0";

    const pecas = Array.isArray(os.pecas_json) ? os.pecas_json : [];
    const servicos = Array.isArray(os.mao_obra_json) ? os.mao_obra_json : [];
    const checklist = os.checklist_entrada_json || os.checklist_json || {};

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className={`text-center border-b border-black pb-2 mb-4 ${isA4 ? 'border-solid' : 'border-dashed'}`}>
                <h1 className="font-bold uppercase mb-1" style={{ fontSize: isA4 ? '1.8rem' : '1rem' }}>{empresa?.nome_fantasia || "SmartOS ERP"}</h1>
                <p className="font-bold">{empresa?.razao_social}</p>
                {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                <p>{empresa?.logradouro ? `${empresa.logradouro}, ${empresa.numero} - ${empresa.bairro}` : ""}</p>
                <p>{empresa?.cidade} - {empresa?.uf} | {empresa?.telefone}</p>
            </div>

            {/* Title / Info Bloc */}
            <div className={`flex flex-col items-center mb-6`}>
                <h2 className={`font-bold uppercase border-2 border-black px-4 py-1 rounded-sm ${isA4 ? 'text-xl mb-4' : 'text-xs mb-2'}`}>
                    Comprovante de Entrada de OS
                </h2>
                <div className={`w-full flex justify-between items-end border-b-2 border-slate-100 pb-2`}>
                    <div>
                        <h3 className={`font-black ${isA4 ? 'text-3xl' : 'text-xl'}`}>OS #{String(os.numero).padStart(4, '0')}</h3>
                        <p className={`${isA4 ? 'text-sm' : 'text-[9px]'} font-bold text-slate-500`}>Abertura: {formatDate(os.created_at)}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black uppercase text-indigo-600 tracking-tighter" style={{ fontSize: isA4 ? '0.9rem' : '0.6rem' }}>{os.status.replace(/_/g, " ")}</p>
                        {os.prioridade && <p className={`font-bold uppercase text-red-500 ${isA4 ? 'text-xs' : 'text-[8px]'}`}>Prioridade: {os.prioridade}</p>}
                    </div>
                </div>
            </div>

            {/* Customer Section */}
            <div className={`mb-6 p-2 rounded-lg ${isA4 ? 'bg-slate-50 border border-slate-200' : ''}`}>
                <p className={`font-bold mb-1 uppercase border-b border-black/10 ${isA4 ? 'text-xs text-slate-400' : 'text-[9px]'}`}>Informações do Cliente</p>
                <div className={`${isA4 ? 'grid grid-cols-2 gap-4' : 'space-y-0.5'}`}>
                    <div>
                        <p className={`font-black ${isA4 ? 'text-lg' : 'text-xs'}`}>{os.cliente?.nome}</p>
                        <p>CPF/CNPJ: {os.cliente?.cpf_cnpj || "N/I"}</p>
                    </div>
                    <div className={`${isA4 ? 'text-right' : ''}`}>
                        <p><span className="font-bold">Telefone:</span> {os.cliente?.telefone || "N/I"}</p>
                        <p><span className="font-bold">E-mail:</span> {os.cliente?.email || "N/I"}</p>
                    </div>
                </div>
            </div>

            {/* Device Section */}
            <div className={`mb-6`}>
                <p className={`font-bold mb-2 uppercase pb-1 border-b ${isA4 ? 'text-sm border-slate-300' : 'text-[9px] border-dashed border-black'}`}>Equipamento & Diagnóstico</p>

                <div className={`grid ${isA4 ? 'grid-cols-2 gap-x-8 gap-y-2' : 'grid-cols-1 gap-y-1'}`}>
                    <div className="space-y-1">
                        <p className={`${isA4 ? 'text-base' : ''}`}><span className="font-bold">Aparelho:</span> {os.marca_equipamento || os.equipamento?.marca} {os.modelo_equipamento || os.equipamento?.modelo}</p>
                        <p><span>Cor:</span> {os.cor_equipamento || os.equipamento?.cor || "-"}</p>
                        <p><span>IMEI / Serial:</span> {os.imei_equipamento || os.equipamento?.imei || os.numero_serie || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="bg-amber-50 p-1 rounded-md border border-amber-100">
                            <span className="font-bold">SENHA:</span> <span className="font-black text-indigo-700">{os.senha_dispositivo || "NÃO INFORMADA"}</span>
                            {os.senha_tipo === 'padrao' && <span className="ml-2 text-[8px] uppercase text-amber-600 font-bold">(Desenho Padrão)</span>}
                        </p>
                        {os.acessorios_recebidos && Array.isArray(os.acessorios_recebidos) && os.acessorios_recebidos.length > 0 && (
                            <p className="text-[10px]"><span className="font-bold">Acessórios:</span> {os.acessorios_recebidos.join(", ")}</p>
                        )}
                    </div>
                </div>

                <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="font-bold text-xs uppercase text-slate-500 mb-1">Defeito Informado pelo Cliente:</p>
                    <p className={`italic whitespace-pre-wrap ${isA4 ? 'text-base' : 'text-xs'}`}>
                        {os.problema_relatado || "Nenhuma descrição detalhada."}
                    </p>
                    {os.problemas_tags && Array.isArray(os.problemas_tags) && os.problemas_tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {os.problemas_tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-600">#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Checklist */}
                {Object.keys(checklist).length > 0 && (
                    <div className="mt-4">
                        <p className="font-bold text-[10px] uppercase text-slate-500 mb-2">Checklist de Entrada:</p>
                        <div className={`grid ${isA4 ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
                            {Object.entries(checklist).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-1.5 border border-slate-100 p-1 rounded-md bg-slate-50/50">
                                    <span className={value ? "text-emerald-600 font-bold" : "text-slate-300 line-through"}>
                                        {value ? "✓" : "✗"}
                                    </span>
                                    <span className={`capitalize ${value ? 'text-slate-700 font-medium' : 'text-slate-400'} ${isA4 ? 'text-xs' : 'text-[8px]'}`}>{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Financial / Items Section */}
            {(pecas.length > 0 || servicos.length > 0) && (
                <div className={`mb-6`}>
                    <p className={`font-bold mb-2 uppercase pb-1 border-b ${isA4 ? 'text-sm border-slate-300' : 'text-[9px] border-dashed border-black'}`}>Estimativa de Orçamento</p>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b-2 border-slate-900 ${isA4 ? 'text-xs' : 'text-[8px]'} uppercase font-black`}>
                                <th className="py-1">Descrição / Item</th>
                                <th className="py-1 text-center w-12">Qtd</th>
                                <th className="py-1 text-right w-24">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className={isA4 ? 'text-sm' : 'text-[9px]'}>
                            {pecas.map((p: any, i: number) => (
                                <tr key={p.id || i} className="border-b border-slate-100">
                                    <td className="py-1">{p.nome} <span className="text-[9px] text-slate-400">(Peça)</span></td>
                                    <td className="py-1 text-center">{p.qtd || 1}</td>
                                    <td className="py-1 text-right font-bold">{formatCurrency((p.preco || p.valor) * (p.qtd || 1))}</td>
                                </tr>
                            ))}
                            {servicos.map((s: any, i: number) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1">{s.descricao} <span className="text-[9px] text-slate-400">(Serviço)</span></td>
                                    <td className="py-1 text-center">1</td>
                                    <td className="py-1 text-right font-bold">{formatCurrency(s.valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 flex flex-col items-end gap-1">
                        {os.desconto_centavos > 0 && (
                            <div className="flex justify-between w-48 text-amber-700 font-bold">
                                <span className="uppercase text-[10px]">Desconto:</span>
                                <span>- {formatCurrency(os.desconto_centavos)}</span>
                            </div>
                        )}
                        <div className={`flex justify-between w-64 p-3 bg-slate-900 text-white rounded-xl shadow-lg mt-2 ${isA4 ? 'text-xl' : 'text-sm'}`}>
                            <span className="uppercase font-bold text-[10px] self-center">Total Estimado:</span>
                            <span className="font-black">{formatCurrency(os.valor_total_centavos)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Observations */}
            {os.observacoes_internas && (
                <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="font-bold text-[10px] uppercase text-indigo-400 mb-1">Observações:</p>
                    <p className={`whitespace-pre-wrap leading-tight font-medium text-indigo-900 ${isA4 ? 'text-sm' : 'text-[9px]'}`}>{os.observacoes_internas}</p>
                </div>
            )}

            {/* Terms and Signatures */}
            <div className={`mt-12 text-center`}>
                <div className={`text-slate-500 text-justify mb-8 flex flex-col gap-2 bg-slate-50 p-4 border border-slate-200 rounded-xl ${isA4 ? 'text-xs leading-relaxed px-6 mx-12' : 'text-[8px] leading-[1.3] p-2'}`}>
                    <p><b>1. Garantia:</b> A garantia de 90 dias cobre exclusivamente as peças trocadas e o serviço realizado, conforme CDC. Falhas em outros componentes não relatadas previamente ou causadas por mau uso (quedas, líquidos) anulam a garantia.</p>
                    <p><b>2. Taxa de Guarda e Abandono (IMPORTANTE):</b> O cliente tem o prazo de 30 dias contados do aviso de conclusão do serviço para retirar o equipamento. <b>Após 30 dias, será cobrada uma Taxa de Guarda diária</b> pelo armazenamento. Decorridos <b>90 dias</b> sem retirada, o equipamento poderá ser descartado, doado ou alienado para custeamento das despesas e serviços executados, sem direito a indenização, conforme praxe comercial e Código de Defesa do Consumidor.</p>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-12 w-full max-w-2xl mx-auto">
                    <div className="border-t border-black pt-2">
                        <p className="font-bold uppercase tracking-widest" style={{ fontSize: isA4 ? '0.7rem' : '0.5rem' }}>Assinatura do Cliente</p>
                    </div>
                    <div className="border-t border-black pt-2">
                        <p className="font-bold uppercase tracking-widest" style={{ fontSize: isA4 ? '0.7rem' : '0.5rem' }}>Visto da Recepção</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`mt-16 pt-4 border-t border-slate-100 text-center text-slate-300 font-bold uppercase tracking-[0.2em] ${isA4 ? 'text-xs' : 'text-[8px]'}`}>
                <p>Emitido via SmartOS em {new Date().toLocaleString('pt-BR')}</p>
                <p className="text-slate-200 mt-1">Sempre um passo à frente no seu negócio</p>
            </div>

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
