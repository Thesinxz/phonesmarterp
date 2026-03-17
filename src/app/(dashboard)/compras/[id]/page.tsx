"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
    ShoppingCart, ArrowLeft, Printer, 
    Tag, CheckCircle2, DollarSign, 
    TrendingUp, Calculator, Package, 
    Calendar, User, FileText, BadgeCheck,
    Loader2, AlertCircle, Trash2
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { cn } from "@/utils/cn";
import { useParams, useRouter } from "next/navigation";
import { getCompraById, updateCompraStatus } from "@/app/actions/compras";
import { StatusBadge, OrigemBadge } from "@/components/compras/StatusBadges";

export default function CompraDetalhePage() {
    const { id } = useParams();
    const router = useRouter();
    const { profile } = useAuth();
    const [compra, setCompra] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getCompraById(id as string);
            setCompra(data);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleUpdateStatus = async (status: 'pago' | 'cancelado') => {
        if (!compra?.id) return;
        setLoading(true);
        try {
            await updateCompraStatus(compra.id, status);
            toast.success("Status da compra atualizado!");
            loadData();
        } catch (e: any) {
            toast.error(e.message);
            setLoading(false);
        }
    };

    const totalVendaProjetada = compra?.compra_itens?.reduce(
      (acc: number, it: any) => acc + ((it.preco_venda_varejo || 0) * (it.quantidade || 1)),
      0
    ) || 0;
    const lucroProjetado = totalVendaProjetada - (compra?.valor_total || 0);
    const markupMedio = (compra?.valor_total || 0) > 0
      ? (totalVendaProjetada / (compra?.valor_total || 1)).toFixed(1)
      : '0';
    const lucroPercentual = (compra?.valor_total || 0) > 0
      ? ((lucroProjetado / (compra?.valor_total || 1)) * 100).toFixed(0)
      : '0';

    if (loading && !compra) {
        return (
            <div className="h-96 flex items-center justify-center flex-col gap-4 text-slate-400">
                <Loader2 className="animate-spin text-brand-500" size={32} />
                <p className="font-bold text-[10px] uppercase tracking-widest">Carregando detalhes da OC...</p>
            </div>
        );
    }

    if (!compra) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-slate-400">
                <AlertCircle size={48} />
                <p className="font-bold">Compra não encontrada</p>
                <button onClick={() => router.back()} className="text-brand-500 font-bold text-xs uppercase underline">Voltar</button>
            </div>
        );
    }

    const ocNumber = `OC-${String(compra.numero || 0).padStart(3, '0')}`;

    return (
        <div className="space-y-6 page-enter pb-24 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 transition-all shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{ocNumber}</h1>
                            <StatusBadge status={compra.status} />
                        </div>
                        <div className="flex flex-col mt-1">
                            <p className="text-slate-500 text-sm font-medium">Fornecedor: {compra.fornecedor_nome || "Diverso"}</p>
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                                <span>Nota de {formatDate(compra.data_compra)}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                <span>Registrado em {formatDate(compra.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button className="btn-secondary h-11 px-6 flex items-center gap-2 group">
                        <Printer size={18} className="text-slate-400 group-hover:text-slate-600 transition-all"/> Imprimir
                    </button>
                    {compra.status === 'pendente' && (
                        <button 
                            onClick={() => handleUpdateStatus('pago')}
                            className="bg-emerald-500 text-white h-11 px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-emerald-glow hover:bg-emerald-600 transition-all"
                        >
                            ✓ Marcar como Pago
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassCard className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <DollarSign size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Valor Total</span>
                    </div>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(compra.valor_total)}</p>
                </GlassCard>
                <GlassCard className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Package size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Itens na OC</span>
                    </div>
                    <p className="text-xl font-black text-slate-900">{compra.compra_itens?.length || 0}</p>
                </GlassCard>
                <GlassCard className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Vencimento</span>
                    </div>
                    <p className={cn(
                        "text-xl font-black",
                        compra.data_vencimento ? "text-slate-900" : "text-slate-300"
                    )}>{compra.data_vencimento ? formatDate(compra.data_vencimento) : "N/A"}</p>
                </GlassCard>
                <GlassCard className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <DollarSign size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Pagamento</span>
                    </div>
                    <p className="text-sm font-black text-slate-900 capitalize">
                        {compra.forma_pagamento?.replace('_', ' ') || 'N/A'}
                        {compra.parcelas > 1 && (
                            <span className="text-xs font-bold text-slate-400 ml-1">· {compra.parcelas}x</span>
                        )}
                    </p>
                </GlassCard>
                <GlassCard className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Tag size={14}/>
                        <span className="text-[10px] font-black uppercase tracking-widest">Origem</span>
                    </div>
                    <div><OrigemBadge origem={compra.origem} /></div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-2 p-0 overflow-hidden shadow-sm">
                    <div className="p-6 bg-slate-50/50 flex items-center gap-3 border-b border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-500 shadow-sm"><Package size={20}/></div>
                        <h3 className="font-black text-slate-800 tracking-tight text-lg">Produtos da Compra</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4 text-center">Tipo</th>
                                    <th className="px-6 py-4 text-center">NCM</th>
                                    <th className="px-6 py-4 text-center">Qtd</th>
                                    <th className="px-6 py-4 text-right">Custo Unit.</th>
                                    <th className="px-6 py-4 text-right">Venda Varejo</th>
                                    <th className="px-6 py-4 text-right pr-10">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {compra.compra_itens?.map((it: any) => (
                                    <tr key={it.id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-600">
                                        <td className="px-6 py-4 font-bold text-slate-800">{it.nome}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[9px] uppercase font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{it.item_type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                            {it.ncm || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">{it.quantidade}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(it.custo_unitario)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(it.preco_venda_varejo)}</td>
                                        <td className="px-6 py-4 text-right pr-10 font-black text-slate-900">{formatCurrency(it.custo_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                <div className="space-y-6">
                    <GlassCard className="p-6 space-y-6 bg-brand-50/20 border-brand-100 shadow-brand-glow/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Calculator size={20}/></div>
                            <h3 className="font-black text-slate-800 tracking-tight">Estratégia Aplicada</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Invstimento Total</p>
                                <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(compra.valor_total)}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Lucro Projetado</p>
                                <p className="text-lg font-black text-emerald-600 mt-1">
                                    {formatCurrency(lucroProjetado)}
                                    <span className="text-xs ml-1 font-bold">+{lucroPercentual}%</span>
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Markup Médio</p>
                                <p className="text-lg font-black text-[#1E40AF] mt-1">{markupMedio}x</p>
                            </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => router.push(`/estoque/etiquetas?compra_id=${compra.id}`)}
                            className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-[11px] uppercase font-black tracking-widest"
                        >
                            <Tag size={16}/> Gerar Etiquetas (PDF)
                        </button>
                    </GlassCard>

                    <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-inner"><FileText size={20}/></div>
                            <h3 className="font-black text-slate-800 tracking-tight">Observações</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                            {compra.observacoes || "Nenhuma observação registrada para esta ordem de compra."}
                        </p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
