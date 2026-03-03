"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Clock, Smartphone, Wrench, Shield, CheckCircle2,
    AlertTriangle, FileText, Activity, ImageIcon, MapPin
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function RastreioPage({ params }: { params: { token: string } }) {
    const [os, setOs] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchRastreio() {
            try {
                const res = await fetch(`/api/rastreio/${params.token}`);
                if (!res.ok) throw new Error("Link inválido ou expirado.");
                const data = await res.json();
                setOs(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (params.token) {
            fetchRastreio();
        }
    }, [params.token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">Buscando sua OS...</p>
                </div>
            </div>
        );
    }

    if (error || !os) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-500/10">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2">Ops! OS não encontrada</h1>
                <p className="text-slate-500 max-w-sm mb-8">
                    {error || "Este link de rastreamento pode ter expirado ou estar incorreto. Por favor, solicite um novo com a nossa equipe."}
                </p>
            </div>
        );
    }

    const {
        status, numero, data_entrada, cliente_nome,
        equipamento, problema, diagnostico, financeiro,
        garantia, timeline, foto_entrada_url
    } = os;

    const formattedDate = format(new Date(data_entrada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    // Helper functions for UI
    const getStatusStyle = (s: string) => {
        const styles: Record<string, string> = {
            aberta: "bg-slate-100 text-slate-700 border-slate-200",
            em_analise: "bg-blue-100 text-blue-700 border-blue-200",
            aguardando_peca: "bg-amber-100 text-amber-700 border-amber-200",
            em_execucao: "bg-purple-100 text-purple-700 border-purple-200",
            finalizada: "bg-emerald-100 text-emerald-700 border-emerald-200",
            entregue: "bg-indigo-100 text-indigo-700 border-indigo-200",
            cancelada: "bg-red-100 text-red-700 border-red-200"
        };
        return styles[s] || styles.aberta;
    };

    const getStatusLabel = (s: string) => {
        const labels: Record<string, string> = {
            aberta: "Na Fila (Aberta)",
            em_analise: "Sendo Analisado",
            aguardando_peca: "Aguardando Peça",
            em_execucao: "Na Bancada / Consertando",
            finalizada: "Pronto para Retirada",
            entregue: "Entregue e Finalizada",
            cancelada: "Cancelada"
        };
        return labels[s] || "Desconhecido";
    };

    // Processar Status Step Index (1 to 5)
    let stepIndex = 1;
    if (status === "em_analise") stepIndex = 2;
    if (status === "aguardando_peca" || status === "em_execucao") stepIndex = 3;
    if (status === "finalizada") stepIndex = 4;
    if (status === "entregue") stepIndex = 5;
    if (status === "cancelada") stepIndex = -1;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* Header Cliente */}
            <div className="bg-indigo-600 pt-12 pb-24 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />

                <div className="max-w-xl mx-auto relative z-10 flex flex-col items-center text-center">
                    <span className="bg-white/20 text-white backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4 shadow-sm border border-white/10">
                        Consulta de Rastreio
                    </span>
                    <h1 className="text-3xl text-white font-black mb-2 tracking-tight">
                        Olá, {cliente_nome}!
                    </h1>
                    <p className="text-indigo-100 max-w-sm mb-4 leading-relaxed text-sm">
                        Aqui está o progresso detalhado e em tempo real da sua manutenção:
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="max-w-xl mx-auto px-4 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">

                    {/* OS Tag & Status Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordem de Serviço</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tighter">#{String(numero).padStart(4, "0")}</p>
                        </div>
                        <div className={cn("px-4 py-2 rounded-2xl border text-sm font-bold flex items-center gap-2", getStatusStyle(status))}>
                            {status === "finalizada" || status === "entregue" ? <CheckCircle2 size={16} /> : <Activity size={16} className="animate-pulse" />}
                            {getStatusLabel(status)}
                        </div>
                    </div>

                    {/* Timeline de Progresso Visual */}
                    {status !== "cancelada" && (
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-1">
                                <MapPin size={12} /> Progresso da Manutenção
                            </p>

                            <div className="relative flex justify-between">
                                {/* Barra Base */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full z-0" />

                                {/* Barra Progressiva Colorida */}
                                <div
                                    className="absolute top-1/2 left-0 h-1 bg-indigo-500 -translate-y-1/2 rounded-full z-0 transition-all duration-1000 ease-out"
                                    style={{ width: `${(stepIndex - 1) * 25}%` }}
                                />

                                {/* Pontos */}
                                {[
                                    { label: "Aberta", step: 1 },
                                    { label: "Análise", step: 2 },
                                    { label: "Bancada", step: 3 },
                                    { label: "Retirada", step: 4 },
                                    { label: "Entregue", step: 5 }
                                ].map((s, i) => {
                                    const isCompleted = stepIndex >= s.step;
                                    const isCurrent = stepIndex === s.step;

                                    return (
                                        <div key={i} className="relative z-10 flex flex-col items-center group">
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                                isCompleted ? "bg-indigo-500 border-indigo-500 text-white" : "bg-white border-slate-300 text-slate-300",
                                                isCurrent && "ring-4 ring-indigo-500/20 scale-125 bg-white border-indigo-500 text-indigo-500"
                                            )}>
                                                {isCompleted && !isCurrent ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-black">{s.step}</span>}
                                            </div>
                                            <span className={cn(
                                                "absolute top-8 text-[9px] font-bold whitespace-nowrap transition-colors",
                                                isCurrent ? "text-indigo-600" : isCompleted ? "text-slate-600" : "text-slate-400"
                                            )}>
                                                {s.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="h-6" /> {/* Spacer offset labels */}
                        </div>
                    )}

                    {/* Detalhes do Aparelho */}
                    <div className="p-6 grid gap-6">

                        {/* Device Card */}
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dispositivo</p>
                                <p className="font-bold text-slate-800 text-lg leading-tight">
                                    {equipamento.marca} {equipamento.modelo}
                                </p>
                                {equipamento.cor && <p className="text-xs text-slate-500 mt-1">Cor: {equipamento.cor}</p>}
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <Clock size={10} /> Deixado {formattedDate}
                                </p>
                            </div>
                        </div>

                        {/* Defeito e Diagnóstico */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                <Wrench size={14} className="text-indigo-500" /> Relatório Técnico
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Motivo / Problema Relatado</p>
                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                                        {problema || "Nenhum problema relatado de forma explícita."}
                                    </p>
                                </div>

                                {diagnostico && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Laudo / Diagnóstico do Técnico</p>
                                        <p className="text-sm text-slate-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 leading-relaxed">
                                            {diagnostico}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Foto de Entrada (Prova Visual) */}
                        {foto_entrada_url && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                    <ImageIcon size={14} className="text-indigo-500" /> Foto(s) Fixadas
                                </h3>
                                <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={foto_entrada_url} alt="Foto de recebimento" className="w-full h-auto object-cover" />
                                </div>
                            </div>
                        )}

                        {/* Financeiro / Valores */}
                        {financeiro && (financeiro.valor_total > 0 || financeiro.orcamento_aprovado) && (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-100 mt-2">
                                <h3 className="text-[10px] font-black tracking-widest uppercase text-emerald-800 mb-4 flex items-center gap-1.5 opacity-80">
                                    <FileText size={12} /> Resumo Financeiro
                                </h3>

                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-emerald-800">Orçamento</span>
                                    <span className={cn(
                                        "text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider",
                                        financeiro.orcamento_aprovado ? "bg-emerald-200/50 text-emerald-700" : "bg-amber-200/50 text-amber-700"
                                    )}>
                                        {financeiro.orcamento_aprovado ? "Aprovado" : "Pendente"}
                                    </span>
                                </div>

                                {financeiro.valor_total > 0 && (
                                    <div className="flex items-center justify-between pt-3 border-t border-emerald-200/50">
                                        <span className="text-sm font-medium text-emerald-700">Valor Total do Serviço</span>
                                        <span className="text-xl font-black text-emerald-900">
                                            R$ {(financeiro.valor_total / 100).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                )}

                                {(financeiro.adiantamento || 0) > 0 && (
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/30">
                                        <span className="text-xs font-bold text-emerald-600">Sinal / Adiantado</span>
                                        <span className="text-sm font-bold text-emerald-600">
                                            - R$ {(financeiro.adiantamento / 100).toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Timeline Log */}
                    {timeline && timeline.length > 0 && (
                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <Activity size={14} className="text-indigo-500" /> Histórico de Eventos
                            </h3>
                            <div className="relative pl-3 space-y-4 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-slate-200">
                                {timeline.map((t: any, idx: number) => (
                                    <div key={idx} className="relative text-sm pl-4">
                                        {/* Dot Indicator */}
                                        <span className="absolute left-[-11px] top-1.5 w-2 h-2 rounded-full border-2 border-slate-50 bg-indigo-400 z-10" />

                                        <p className="text-[10px] font-bold text-slate-400 mb-0.5">
                                            {format(new Date(t.criado_em), "dd/MM 'às' HH:mm")}
                                        </p>
                                        <p className="text-slate-700 font-medium leading-snug">
                                            {t.evento}
                                        </p>

                                        {/* Optional status metadata */}
                                        {t.dados_json?.novo_status && (
                                            <span className="inline-block mt-1 bg-slate-200 text-slate-600 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                                                Mudou para {getStatusLabel(t.dados_json.novo_status).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Garantia Notice (if applicable) */}
                    {garantia?.dias > 0 && (status === "entregue" || status === "finalizada") && (
                        <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 text-center">
                            <Shield className="mx-auto text-indigo-400 mb-1" size={20} />
                            <p className="text-xs font-bold text-indigo-800">Seu aparelho possui cobertura de garantia.</p>
                            <p className="text-[10px] text-indigo-600/80 mt-0.5">Válida por {garantia.dias} dias {garantia.ate ? `(até ${format(new Date(garantia.ate), "dd/MM/yyyy")})` : 'após a entrega'}.</p>
                        </div>
                    )}

                </div>

                {/* Footer Watermark */}
                <div className="mt-8 text-center opacity-60">
                    <p className="text-[10px] font-bold text-slate-400">Garantia de Qualidade</p>
                    <p className="text-xs font-black text-slate-300 mt-1 flex items-center justify-center gap-1">
                        <Activity size={12} /> Powered by SmartOS
                    </p>
                </div>
            </div>
        </div>
    );
}
