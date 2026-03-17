'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Truck, Search, Plus, Filter, Eye, Phone, Mail, MapPin, 
  MoreVertical, Trash2, Edit2, Loader2, DollarSign,
  Briefcase, ShoppingBag, Globe, MessageSquare
} from 'lucide-react'
import { getFornecedores, deleteFornecedor } from '@/app/actions/fornecedores'
import { useAuth } from '@/context/AuthContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

const CATEGORIAS = [
  { id: 'geral', label: 'Geral', color: 'bg-slate-100 text-slate-600' },
  { id: 'pecas', label: 'Peças', color: 'bg-blue-100 text-blue-600' },
  { id: 'aparelhos', label: 'Aparelhos', color: 'bg-purple-100 text-purple-600' },
  { id: 'acessorios', label: 'Acessórios', color: 'bg-pink-100 text-pink-600' },
  { id: 'servicos', label: 'Serviços', color: 'bg-emerald-100 text-emerald-600' },
]

export default function FornecedoresPage() {
  const { profile } = useAuth()
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')

  const loadData = useCallback(async () => {
    if (!profile?.empresa_id) return
    setLoading(true)
    try {
      const data = await getFornecedores(profile.empresa_id)
      setFornecedores(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }, [profile?.empresa_id])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente arquivar este fornecedor?')) return
    try {
      await deleteFornecedor(id)
      toast.success('Fornecedor arquivado com sucesso')
      loadData()
    } catch (e) {
      toast.error('Erro ao arquivar fornecedor')
    }
  }

  const filtered = fornecedores.filter(f => {
    const term = search.toLowerCase()
    const matchesSearch = !search || 
      f.razao_social.toLowerCase().includes(term) ||
      f.nome_fantasia?.toLowerCase().includes(term) ||
      f.cnpj?.includes(search)
    
    const matchesCategoria = !filterCategoria || f.categoria === filterCategoria
    return matchesSearch && matchesCategoria
  })

  return (
    <div className="space-y-6 page-enter pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-brand-500 text-white rounded-[20px] shadow-brand-glow">
              <Truck size={24} />
            </div>
            Gestão de Fornecedores
          </h1>
          <p className="text-slate-500 text-sm mt-2 ml-1 font-medium">Controle de parceiros, compras e custos operacionais</p>
        </div>
        <Link 
          href="/fornecedores/novo" 
          className="btn-primary h-14 px-8 flex items-center gap-3 shadow-brand-glow text-base"
        >
          <Plus size={20} /> Novo Fornecedor
        </Link>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total cadastrados", value: fornecedores.length, icon: Truck, color: "text-brand-600", bg: "bg-brand-50" },
          { label: "Mais Comprado", value: "Diverso", icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Ativos e em dia", value: fornecedores.filter(f => f.ativo).length, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Categorias", value: new Set(fornecedores.map(f => f.categoria)).size, icon: Filter, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(k => (
          <GlassCard key={k.label} className={cn("p-5 border-none", k.bg)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{k.label}</p>
                <p className={cn("text-2xl font-black mt-1", k.color)}>{k.value}</p>
              </div>
              <div className={cn("p-2 rounded-xl bg-white/50", k.color)}>
                <k.icon size={20} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Barra de Filtros */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, razão social ou CNPJ..."
            className="input-glass pl-11 h-12 text-sm font-bold"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className="select-glass text-xs font-bold h-12 w-48"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </GlassCard>

      {/* Grid de Fornecedores */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="relative inline-block">
             <div className="w-16 h-16 border-4 border-slate-100 border-t-brand-500 rounded-full animate-spin"></div>
             <Truck className="absolute inset-0 m-auto text-brand-500" size={24} />
          </div>
          <p className="mt-4 font-black uppercase text-[10px] text-slate-400 tracking-[0.2em]">Carregando Fornecedores...</p>
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-24 text-center border-dashed border-2 border-slate-100">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-inner">
              <Truck size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-800">Nenhum fornecedor encontrado</h3>
            <p className="text-slate-400 text-sm mt-2 font-medium">Tente ajustar seus filtros ou cadastre um novo parceiro de negócios.</p>
            <Link href="/fornecedores/novo" className="btn-primary inline-flex mt-8 px-8 h-12 items-center gap-2 shadow-brand-glow">
               <Plus size={18} /> Cadastrar Agora
            </Link>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(f => (
            <GlassCard key={f.id} className="group hover:scale-[1.02] transition-all duration-500 p-0 overflow-hidden border-slate-100/50 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/5">
              <div className="p-6 space-y-4">
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-brand-500 tracking-widest flex items-center gap-2">
                       {CATEGORIAS.find(c => c.id === f.categoria)?.label || 'Geral'}
                    </p>
                    <h3 className="text-lg font-black text-slate-800 mt-1 truncate group-hover:text-brand-600 transition-colors">
                      {f.nome_fantasia || f.razao_social}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate">
                      {f.razao_social}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Link href={`/fornecedores/${f.id}/editar`} className="p-2 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all">
                      <Edit2 size={16} />
                    </Link>
                    <button onClick={() => handleDelete(f.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Info Básica */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all">
                      <Phone size={14} />
                    </div>
                    {f.whatsapp || f.telefone || '—'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 truncate">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all">
                      <Mail size={14} />
                    </div>
                    {f.email || '—'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 truncate">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all">
                      <MapPin size={14} />
                    </div>
                    {f.cidade ? `${f.cidade} / ${f.estado}` : 'Local não informado'}
                    {f.pais && f.pais !== 'Brasil' && <span className="text-[9px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md ml-1">{f.pais}</span>}
                  </div>
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    CNPJ: {f.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || 'ISENTO'}
                  </div>
                </div>
                <Link 
                  href={`/fornecedores/${f.id}`}
                  className="px-4 py-2 bg-white hover:bg-brand-500 text-brand-600 hover:text-white border-2 border-brand-100 hover:border-brand-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                  Ver Perfil
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
