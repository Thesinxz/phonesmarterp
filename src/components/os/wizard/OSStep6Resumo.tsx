"use client";

import { User, Smartphone, Wrench, Package, Calendar, Shield, CreditCard, ChevronRight, Hash } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

interface OSStep6ResumoProps {
    data: any;
}

export function OSStep6Resumo({ data }: OSStep6ResumoProps) {
    const totalPecas = (data.pecas || []).reduce((acc: number, p: any) => acc + (p.preco * p.qtd), 0);
    const totalServicos = (data.servicos || []).reduce((acc: number, s: any) => acc + s.valor, 0);
    const totalGeral = totalPecas + totalServicos - (data.desconto || 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente & Equipamento */}
                <div className="space-y-6">
                    <GlassCard title="Cliente" icon={User} className="bg-white">
                        <p className="font-bold text-slate-800">{data.clienteNome || "Nenhum cliente selecionado"}</p>
                    </GlassCard>

                    <GlassCard title="Equipamento" icon={Smartphone} className="bg-white">
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-slate-800">
                                <span className="uppercase text-[10px] text-slate-400 block mb-0.5">{data.tipoEquipamento}</span>
                                {data.marca} {data.modelo}
                            </p>
                            <p className="text-xs text-slate-500">Cor: {data.cor || "N/A"} • IMEI: {data.imei || "N/A"}</p>
                            {data.senhaDispositivo && (
                                <p className="text-xs font-bold text-indigo-600 mt-1 flex items-center gap-1">
                                    <Hash size={12} className="text-slate-400" />
                                    {data.senhaTipo === "padrao" ? `Padrão: ${data.senhaDispositivo}` : `Senha: ${data.senhaDispositivo}`}
                                </p>
                            )}
                            {data.acessorios?.length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-2 italic">Acessórios: {data.acessorios.join(", ")}</p>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard title="Relato do Problema" icon={Wrench} className="bg-white">
                        {data.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                                {data.tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold uppercase">{tag}</span>
                                ))}
                            </div>
                        )}
                        <p className="text-sm text-slate-600 italic">"{data.problema}"</p>
                    </GlassCard>
                </div>

                {/* Financeiro & Prazos */}
                <div className="space-y-6">
                    <GlassCard title="Resumo Financeiro" icon={CreditCard} className="bg-white">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Peças</span>
                                <span className="font-bold text-slate-700">R$ {(totalPecas / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Serviços</span>
                                <span className="font-bold text-slate-700">R$ {(totalServicos / 100).toFixed(2)}</span>
                            </div>
                            {data.desconto > 0 && (
                                <div className="flex justify-between text-sm text-red-500">
                                    <span>Desconto</span>
                                    <span className="font-bold">- R$ {(data.desconto / 100).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-slate-800">Total</span>
                                <span className="text-xl font-black text-indigo-600">R$ {(totalGeral / 100).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Listagem de itens no resumo */}
                        <div className="mt-6 space-y-3 pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Itens Detalhados</p>
                            {(data.pecas || []).map((p: any) => (
                                <div key={p.id} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">{p.qtd}x {p.nome}</span>
                                    <span className="font-medium text-slate-500">R$ {(p.preco * p.qtd / 100).toFixed(2)}</span>
                                </div>
                            ))}
                            {(data.servicos || []).map((s: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">{s.descricao}</span>
                                    <span className="font-medium text-slate-500">R$ {(s.valor / 100).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard title="Prazo & Técnico" icon={Calendar} className="bg-white">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Previsão de Entrega</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {data.prazo ? new Date(data.prazo).toLocaleString() : "Não definido"}
                                </p>
                            </div>
                            {data.prioridade === "urgente" && (
                                <div className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold w-fit uppercase tracking-wider">
                                    🚀 Prioridade Urgente
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard title="Garantia" icon={Shield} className="bg-white">
                        <p className="font-bold text-slate-700 text-sm">{data.financas.garantia} dias</p>
                    </GlassCard>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                <p className="text-xs text-indigo-600 leading-relaxed">
                    Confirmo que as informações acima estão corretas e que o cliente está ciente dos termos de serviço da loja,
                    prazo de garantia e política de diagnóstico.
                </p>
            </div>
        </div>
    );
}
