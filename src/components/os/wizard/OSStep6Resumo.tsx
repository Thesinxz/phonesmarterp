"use client";

import { User, Smartphone, Wrench, Package, Calendar, Shield, CreditCard, ChevronRight, Hash } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

interface OSStep6ResumoProps {
    data: any;
    onChange: (data: any) => void;
}

export function OSStep6Resumo({ data, onChange }: OSStep6ResumoProps) {
    const totalPecas = (data.pecas || []).reduce((acc: number, p: any) => acc + (p.preco * p.qtd), 0);
    const totalServicos = (data.servicos || []).reduce((acc: number, s: any) => acc + s.valor, 0);
    const subtotal = totalPecas + totalServicos;
    
    let valorDesconto = 0;
    if (data.descontoTipo === "porcentagem") {
        valorDesconto = Math.round((subtotal * (data.desconto || 0)) / 100);
    } else {
        valorDesconto = data.desconto || 0;
    }

    const totalGeral = subtotal - valorDesconto - (data.valorAdiantado || 0);

    return (
        <div className="space-y-6">
            <div className="step-header">
                <div className="step-num">6</div>
                <h2>Resumo da OS</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna Esquerda: Dados Gerais */}
                <div>
                    <div className="section-label">DADOS GERAIS</div>
                    <div className="space-y-4">
                        <div className="sidebar-card flex-col gap-2 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                            <div className="flex items-center gap-2 mb-1">
                                <User size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">{data.clienteNome || "Nenhum cliente selecionado"}</p>
                        </div>

                        <div className="sidebar-card flex-col gap-2 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                            <div className="flex items-center gap-2 mb-1">
                                <Smartphone size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipamento</span>
                            </div>
                            <div>
                                <div className="flex gap-2 items-baseline">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{data.marca}</span>
                                    <span className="text-sm font-bold text-slate-800">{data.modelo}</span>
                                </div>
                                <div className="flex gap-3 text-xs text-slate-500 mt-2">
                                    <span>Cor: <strong>{data.cor || "N/A"}</strong></span>
                                    <span>IMEI: <strong>{data.imei || "N/A"}</strong></span>
                                </div>
                                {data.senhaDispositivo && (
                                    <div className="text-[11px] font-bold text-slate-600 mt-2 flex items-center gap-1 bg-slate-50 w-fit px-2 py-1 rounded-md border border-slate-100">
                                        <Hash size={12} className="text-slate-400" />
                                        {data.senhaTipo === "padrao" ? `Padrão: ${data.senhaDispositivo}` : `Senha: ${data.senhaDispositivo}`}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sidebar-card flex-col gap-2 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                            <div className="flex items-center gap-2 mb-1">
                                <Wrench size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Problema Relatado</span>
                            </div>
                            {data.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {data.tags.map((tag: string) => (
                                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{tag}</span>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-slate-600 italic leading-relaxed">"{data.problema || "Nenhum problema descrito"}"</p>
                        </div>
                    </div>
                </div>

                {/* Coluna Direita: Autorização e Termos */}
                <div>
                    <div className="section-label">AUTORIZAÇÃO E TERMOS</div>
                    
                    <div className="space-y-4">
                        <div className="sidebar-card flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        ✅ Orçamento Aprovado
                                    </span>
                                    <span className="text-xs text-slate-500 leading-relaxed max-w-[250px]">
                                        Marque esta opção se o cliente já autorizou a execução do serviço com os valores informados.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...data, orcamentoAprovado: !data.orcamentoAprovado })}
                                    className={cn(
                                        "relative w-12 h-6 rounded-full transition-colors flex-shrink-0 border-2 mt-1",
                                        data.orcamentoAprovado ? "bg-emerald-500 border-emerald-500" : "bg-slate-100 border-slate-200"
                                    )}
                                >
                                    <span className={cn(
                                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                                        data.orcamentoAprovado ? "translate-x-6" : "translate-x-0"
                                    )} />
                                </button>
                            </div>
                        </div>

                        <div className="sidebar-card flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 mt-0.5 cursor-pointer" 
                                    id="termos-checkbox"
                                    checked={data.confirmedTerms}
                                    onChange={e => onChange({ ...data, confirmedTerms: e.target.checked })}
                                />
                                <label htmlFor="termos-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer font-medium select-none">
                                    Confirmo que as informações acima estão corretas e que o cliente está ciente dos termos de serviço da loja,
                                    prazos e política de diagnóstico.
                                </label>
                            </div>
                        </div>

                        <div className="sidebar-card flex-col gap-3 bg-indigo-50/50 border-indigo-100">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-indigo-900">Sinal / Adiantamento</span>
                                    <span className="text-[10px] text-indigo-600/70 font-medium">Valor já pago pelo cliente</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-indigo-700">
                                        R$ {((data.valorAdiantado || 0) / 100).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
