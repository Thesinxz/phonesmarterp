'use client'

import { useEffect, useState } from 'react'
import { getFornecedorById } from '@/app/actions/fornecedores'
import { useAuth } from '@/context/AuthContext'
import { 
  ArrowLeft, Edit2, Phone, Mail, MapPin, 
  MessageSquare, Globe, Calendar, CreditCard,
  ShoppingBag, DollarSign, TrendingUp, History,
  Info, CheckCircle2, Package, Loader2, Eye
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

export default function DetalheFornecedorPage() {
  const { id } = useParams()
  const [fornecedor, setFornecedor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dados' | 'compras'>('dados')

  useEffect(() => {
    async function load() {
      try {
        const data = await getFornecedorById(id as string)
        setFornecedor(data)
      } catch (e) {
        toast.error('Fornecedor não encontrado')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="animate-spin text-brand-500 mx-auto" size={40} />
      </div>
    )
  }

  if (!fornecedor) return null

  const totalComprado = fornecedor.compras?.reduce((acc: number, c: any) => acc + (c.valor_total || 0), 0) || 0
  const ultimaCompra = fornecedor.compras?.[0]?.data_compra

  return (
    <div className="space-y-6 page-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/fornecedores" 
            className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-brand-500 hover:border-brand-100 rounded-2xl transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              {fornecedor.nome_fantasia || fornecedor.razao_social}
            </h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
               {fornecedor.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || 'ISENTO'}
               {fornecedor.cidade && <span> · {fornecedor.cidade} / {fornecedor.estado}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {fornecedor.whatsapp && (
            <a 
              href={`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g,'')}`}
              target="_blank"
              className="h-12 px-6 flex items-center gap-2 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
            >
              <MessageSquare size={18} /> WhatsApp
            </a>
          )}
          <Link 
            href={`/fornecedores/${id}/editar`}
            className="btn-secondary h-12 px-6 flex items-center gap-2"
          >
            <Edit2 size={18} /> Editar
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 border-none bg-brand-50">
          <p className="text-[10px] font-black uppercase text-brand-400 tracking-widest">Total Comprado</p>
          <p className="text-2xl font-black text-brand-600 mt-1">{formatCurrency(totalComprado)}</p>
        </GlassCard>
        <GlassCard className="p-5 border-none bg-blue-50">
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Qtd. de Compras</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{fornecedor.compras?.length || 0}</p>
        </GlassCard>
        <GlassCard className="p-5 border-none bg-purple-50">
          <p className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Prazo Médio</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{fornecedor.prazo_medio_pagamento}d</p>
        </GlassCard>
        <GlassCard className="p-5 border-none bg-emerald-50">
          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Última Compra</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{ultimaCompra ? formatDate(ultimaCompra) : '—'}</p>
        </GlassCard>
      </div>

      {/* Dashboard Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Info detalhada */}
        <div className="lg:col-span-1 space-y-6">
           <GlassCard className="p-6 space-y-6 border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Informações de Contato</h3>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={18}/></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Telefone</p>
                        <p className="text-sm font-bold text-slate-700">{fornecedor.telefone || '—'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={18}/></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase">E-mail</p>
                        <p className="text-sm font-bold text-slate-700 truncate">{fornecedor.email || '—'}</p>
                      </div>
                   </div>
                   {fornecedor.site && (
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Globe size={18}/></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Site</p>
                          <p className="text-sm font-bold text-brand-500 underline">{fornecedor.site}</p>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Localização</h3>
                <div className="flex gap-3">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0"><MapPin size={18}/></div>
                   <div>
                     <p className="text-sm font-bold text-slate-700 leading-tight">
                       {fornecedor.logradouro}, {fornecedor.numero}<br/>
                       {fornecedor.bairro} · {fornecedor.cidade}/{fornecedor.estado}<br/>
                       <span className="text-brand-600 uppercase text-[10px] tracking-widest">{fornecedor.pais}</span>
                     </p>
                     <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">CEP {fornecedor.cep}</p>
                   </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pagamento</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Chave PIX</p>
                    <p className="text-sm font-black text-slate-700 mt-1">{fornecedor.pix_chave || 'Não informada'}</p>
                  </div>
                  <div className="space-y-2 px-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Banco</span>
                      <span className="text-slate-700">{fornecedor.banco_nome || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Agência</span>
                      <span className="text-slate-700">{fornecedor.banco_agencia || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">Conta</span>
                      <span className="text-slate-700">{fornecedor.banco_conta || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
           </GlassCard>
        </div>

        {/* Lado Direito: Abas e Histórico */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex gap-1 p-1 bg-slate-100/50 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('dados')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'dados' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Detalhes & Notas
              </button>
              <button 
                onClick={() => setActiveTab('compras')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'compras' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Compras ({fornecedor.compras?.length || 0})
              </button>
           </div>

           {activeTab === 'dados' ? (
             <GlassCard className="p-8 border-slate-100">
                <div className="space-y-6">
                   <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Info size={14}/> Observações Internas
                     </h4>
                     <p className="text-sm text-slate-600 leading-relaxed font-medium">
                       {fornecedor.observacoes || 'Nenhuma observação registrada para este fornecedor.'}
                     </p>
                   </div>

                   <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex gap-8">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                               <CheckCircle2 size={16}/> ATIVO
                            </div>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">No Sistema desde</p>
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                               <Calendar size={16}/> {formatDate(fornecedor.created_at)}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </GlassCard>
           ) : (
             <GlassCard className="p-0 border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Protocolo</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">NF-e</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {fornecedor.compras?.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                   <History size={32} className="mx-auto mb-3 opacity-10" />
                                   <p className="font-bold text-sm">Nenhuma compra realizada ainda</p>
                                </td>
                              </tr>
                            ) : (
                              fornecedor.compras.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                     <span className="font-black text-brand-600">OC-{String(c.numero).padStart(3, '0')}</span>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-600">
                                     {formatDate(c.data_compra)}
                                  </td>
                                  <td className="px-6 py-4 text-[11px] font-black text-slate-400">
                                     {c.nota_fiscal_numero || '—'}
                                  </td>
                                  <td className="px-6 py-4 text-right font-black text-slate-800">
                                     {formatCurrency(c.valor_total)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     <span className={cn(
                                       "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                                       c.status === 'pago' ? "bg-emerald-500 text-white" : "bg-amber-400 text-white"
                                     )}>
                                        {c.status}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     <Link 
                                       href={`/compras/${c.id}`}
                                       className="p-2 text-slate-300 hover:text-brand-500 transition-colors inline-block"
                                     >
                                        <Eye size={16} />
                                     </Link>
                                  </td>
                                </tr>
                              ))
                            )}
                        </tbody>
                    </table>
                </div>
             </GlassCard>
           )}
        </div>
      </div>
    </div>
  )
}
