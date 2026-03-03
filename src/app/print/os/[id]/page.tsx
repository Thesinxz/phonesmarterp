"use client";

import { useEffect, useState } from "react";
import { getOrdemServicoById } from "@/services/os";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { Printer, Shield } from "lucide-react";
import { cn } from "@/utils/cn";

export default function PrintOSPage({ params }: { params: { id: string } }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [os, setOs] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [empresa, setEmpresa] = useState<any>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [formato, setFormato] = useState<"80mm" | "a4">("80mm");
    const [termos, setTermos] = useState<string>(`1. Garantia Legal: Conforme CDC, garantia de 90 dias nas peças substituídas e serviços executados.
2. Prazo de Retirada: O equipamento deve ser retirado em até 30 dias após aviso de conclusão.
3. Abandono: Itens não retirados após 90 dias serão alienados para custeio.
4. Dados: A loja não se responsabiliza por perda de dados. Recomendamos backup prévio.`);

    useEffect(() => {
        async function load() {
            try {
                const osData = await getOrdemServicoById(params.id);
                setOs(osData);

                const supabase = createClient();

                // 1. Buscar dados do emitente (CNPJ, Endereço etc)
                const { data: configData } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "nfe_emitente")
                    .eq("empresa_id", osData.empresa_id)
                    .single();

                if (configData) {
                    setEmpresa((configData as any).valor);
                }

                // 2. Buscar Logo da Empresa
                const { data: empData } = await supabase
                    .from("empresas")
                    .select("logo_url")
                    .eq("id", osData.empresa_id)
                    .single();

                const empresaRow = empData as any;
                if (empresaRow?.logo_url) {
                    setLogoUrl(empresaRow.logo_url);
                }

                // 3. Buscar Termos da OS
                const { data: termsData } = await supabase
                    .from("configuracoes")
                    .select("valor")
                    .eq("chave", "termos_os")
                    .eq("empresa_id", osData.empresa_id)
                    .single();

                const termsRow = termsData as any;
                if (termsRow?.valor) {
                    setTermos(termsRow.valor as string);
                }

                if (window.innerWidth > 800) {
                    setFormato("a4");
                }
            } catch (error) {
                console.error(error);
            }
        }
        load();
    }, [params.id]);

    if (!os) return <div className="p-8 text-center font-mono text-sm text-slate-400">Carregando os dados da OS...</div>;

    const isA4 = formato === "a4";
    const status = os.status;
    const isEntrada = status === 'aberta' || status === 'em_analise' || status === 'aguardando_peca';
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

            {/* Header com Logo */}
            <div className={`flex items-center gap-6 border-b-2 border-slate-900 pb-4 mb-4 ${isA4 ? "" : "flex-col text-center"}`}>
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className={isA4 ? "h-20 w-auto object-contain" : "h-14 w-auto mb-2"}
                    />
                )}
                <div className="flex-1">
                    <h1 className="font-black uppercase text-2xl tracking-tighter" style={{ fontSize: isA4 ? '1.8rem' : '1.2rem' }}>
                        {empresa?.nome_fantasia || "SmartOS ERP"}
                    </h1>
                    <div className={cn("grid gap-x-4 gap-y-0.5 mt-1 text-slate-600 font-medium", isA4 ? "grid-cols-2 text-xs" : "text-[8px]")}>
                        {empresa?.razao_social && <p className="col-span-2 font-bold text-slate-900">{empresa.razao_social}</p>}
                        {empresa?.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
                        {empresa?.telefone && <p>TEL: {empresa.telefone}</p>}
                        <p className="col-span-2">{empresa?.logradouro ? `${empresa.logradouro}, ${empresa.numero} - ${empresa.bairro}` : ""}</p>
                        <p className="col-span-2">{empresa?.cidade} - {empresa?.uf}</p>
                    </div>
                </div>
            </div>

            {/* Title / Badge Section */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest inline-block w-fit">
                        {tituloDoc}
                    </span>
                    <h2 className={isA4 ? "text-4xl font-black tracking-tighter text-slate-900" : "text-xl font-black"}>
                        OS #{String(os.numero).padStart(4, '0')}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 italic text-nowrap">
                        Abertura: {formatDate(os.created_at)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-nowrap",
                            status === 'entregue' ? "bg-indigo-100 text-indigo-700" :
                                status === 'finalizada' ? "bg-emerald-100 text-emerald-700" :
                                    "bg-amber-100 text-amber-700"
                        )}>
                            {status.replace(/_/g, " ")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Acompanhe pelo celular</p>
                            <p className="text-[7px] text-slate-300 break-all max-w-[80px]">smartos.app/r/{os.token_teste}</p>
                        </div>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/rastreio/' + (os.token_teste || os.id) : '')}`}
                            alt="QR OS"
                            className="w-12 h-12 rounded-lg border border-slate-100 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Grid Principal */}
            <div className={isA4 ? "grid grid-cols-2 gap-6 mb-8" : "space-y-4"}>

                {/* Cliente & Equipamento */}
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Cliente</p>
                        <h3 className="text-lg font-black text-slate-800 leading-tight">{os.cliente?.nome}</h3>
                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">TEL:</span> {os.cliente?.telefone || "Sem telefone"}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                                <span className="text-[9px] text-slate-400">CPF/CNPJ:</span> {os.cliente?.cpf_cnpj || "N/I"}
                            </p>
                            <p className="text-[10px] font-medium text-slate-400 flex items-start gap-1 leading-tight mt-1">
                                <span>End:</span>
                                <span>
                                    {os.cliente?.endereco_json?.logradouro ?
                                        `${os.cliente.endereco_json.logradouro}, ${os.cliente.endereco_json.numero} - ${os.cliente.endereco_json.bairro}` :
                                        "Endereço não informado"}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Equipamento / Aparelho</p>
                        <h3 className="text-base font-black text-slate-800">
                            {os.marca_equipamento || os.equipamento?.marca} {os.modelo_equipamento || os.equipamento?.modelo}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 overflow-hidden">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">IMEI / SÉRIE</p>
                                <p className="text-xs font-bold text-slate-700 truncate">{os.imei_equipamento || os.equipamento?.imei || "N/A"}</p>
                            </div>
                            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 overflow-hidden">
                                <p className="text-[8px] font-black text-indigo-400 uppercase mb-0.5">SENHA / PIN</p>
                                <p className="text-xs font-black text-indigo-700 truncate">{os.senha_dispositivo || "N/I"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Relato e Checklist */}
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-100/50">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 leading-none">Defeito Relatado</p>
                        <p className="text-sm font-medium text-slate-700 italic leading-relaxed">
                            "{os.problema_relatado || "Sem descrição detalhada."}"
                        </p>
                    </div>

                    {Object.keys(checklist).length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Checklist de Entrada</p>
                            <div className="grid grid-cols-3 gap-1">
                                {Object.entries(checklist).filter(([_, v]) => v).map(([key]) => (
                                    <div key={key} className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-emerald-50 border border-emerald-100 overflow-hidden">
                                        <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                                        <span className="capitalize text-emerald-800 font-bold text-[9px] truncate">{key}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Financial Summary */}
            <div className="mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Resumo Financeiro e Itens</p>

                <table className="w-full text-left mb-6">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
                            <th className="py-2">Descrição do Serviço / Peça</th>
                            <th className="py-2 text-right">Qtd</th>
                            <th className="py-2 text-right px-4">Valor Un.</th>
                            <th className="py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {pecas.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-slate-50">
                                <td className="py-3 font-semibold text-slate-700">{p.nome}</td>
                                <td className="py-3 text-right text-slate-500">{p.qtd || 1}</td>
                                <td className="py-3 text-right px-4 text-slate-500">{formatCurrency(p.preco || p.valor)}</td>
                                <td className="py-3 text-right font-bold">{formatCurrency((p.preco || p.valor) * (p.qtd || 1))}</td>
                            </tr>
                        ))}
                        {servicos.map((s: any, i: number) => (
                            <tr key={i} className="border-b border-slate-50 text-slate-700">
                                <td className="py-3 font-semibold">{s.descricao}</td>
                                <td className="py-3 text-right text-slate-500">1</td>
                                <td className="py-3 text-right px-4 text-slate-500">{formatCurrency(s.valor)}</td>
                                <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(s.valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between items-center text-slate-500 text-xs px-2">
                            <span>Subtotal Bruto:</span>
                            <span className="font-bold">{formatCurrency(os.valor_total_centavos)}</span>
                        </div>

                        {os.valor_adiantado_centavos > 0 && (
                            <div className="flex justify-between items-center text-emerald-600 text-xs px-2 bg-emerald-50 py-1 rounded-lg border border-emerald-100">
                                <span className="font-bold">Adiantamento / Sinal:</span>
                                <span className="font-black">- {formatCurrency(os.valor_adiantado_centavos)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total a Pagar</p>
                                <h4 className="text-sm font-bold opacity-80 leading-none mt-1">
                                    {os.valor_adiantado_centavos > 0 ? "Saldo Restante" : "Valor do Orçamento"}
                                </h4>
                            </div>
                            <div className="text-right">
                                {os.orcamento_aprovado && <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase mb-1 inline-block">Aprovado</span>}
                                <p className="text-2xl font-black tracking-tighter leading-none">
                                    {formatCurrency(os.valor_total_centavos - (os.valor_adiantado_centavos || 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Termos Legais */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 mt-12">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Shield size={12} className="text-indigo-400" /> Termos e Condições
                </p>
                <div className="text-[10px] text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">
                    {termos}
                </div>
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                <div className="text-center">
                    <div className="border-b-2 border-slate-900 h-12 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">{os.cliente?.nome}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Assinatura do Cliente</p>
                </div>
                <div className="text-center">
                    <div className="border-b-2 border-slate-900 h-12 mb-2 flex items-center justify-center">
                    </div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">{empresa?.nome_fantasia || "Responsável Técnico"}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Assinatura / Carimbo</p>
                </div>
            </div>

            <div className="mt-8 text-center text-slate-400">
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">SmartOS - Impresso em {new Date().toLocaleString('pt-BR')}</p>
            </div>
        </div>
    );

    return (
        <div className={containerClass}>
            {isA4 ? (
                <div className="w-full relative">
                    <div className="print:block">
                        {renderOSContent("Via do Cliente")}
                        <div className="w-full flex items-center justify-center my-8 opacity-20 relative print:my-0 print:py-8">
                            <div className="absolute w-full h-0 border-b-2 border-dashed border-slate-900"></div>
                            <span className="bg-white px-6 text-slate-900 relative z-10 font-black tracking-[0.3em] text-[10px] flex items-center gap-3">
                                <span className="text-lg">✂️</span> RECORTE AQUI
                            </span>
                        </div>
                        {renderOSContent("Via da Assistência")}
                    </div>
                </div>
            ) : (
                renderOSContent()
            )}

            {/* Botões Flutuantes (Não Saem na Impressão) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 print:hidden z-[100] bg-white/80 backdrop-blur-2xl p-2 rounded-3xl shadow-2xl border border-white/20 scale-110">
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => setFormato('80mm')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            formato === '80mm' ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Bobina 80mm
                    </button>
                    <button
                        onClick={() => setFormato('a4')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            formato === 'a4' ? "bg-white text-indigo-600 shadow-xl" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Folha A4
                    </button>
                </div>

                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                >
                    <Printer size={18} />
                    <span>Imprimir Agora</span>
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 1.5cm; 
                        size: ${isA4 ? 'A4' : 'auto'}; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                        background: white !important; 
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
