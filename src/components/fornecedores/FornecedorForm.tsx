'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Truck, Building2, MapPin, CreditCard, 
  Search, Info, Save, X, Globe, Phone, Mail,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { buscarCNPJ, buscarCEP, createFornecedor, updateFornecedor } from '@/app/actions/fornecedores'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

interface FornecedorFormProps {
  initialData?: any;
  empresaId: string;
}

const CATEGORIAS = [
  { id: 'geral', label: 'Geral' },
  { id: 'pecas', label: 'Peças' },
  { id: 'aparelhos', label: 'Aparelhos' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'servicos', label: 'Serviços' },
]

export function FornecedorForm({ initialData, empresaId }: FornecedorFormProps) {
  const router = useRouter()
  const isEditing = !!initialData
  const [loading, setLoading] = useState(false)
  const [searchingCnpj, setSearchingCnpj] = useState(false)
  const [searchingCep, setSearchingCep] = useState(false)

  const [formData, setFormData] = useState({
    razao_social: initialData?.razao_social || '',
    nome_fantasia: initialData?.nome_fantasia || '',
    cnpj: initialData?.cnpj || '',
    ie: initialData?.ie || '',
    categoria: initialData?.categoria || 'geral',
    prazo_medio_pagamento: initialData?.prazo_medio_pagamento || 30,
    telefone: initialData?.telefone || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || '',
    site: initialData?.site || '',
    pais: initialData?.pais || 'Brasil',
    cep: initialData?.cep || '',
    logradouro: initialData?.logradouro || '',
    numero: initialData?.numero || '',
    complemento: initialData?.complemento || '',
    bairro: initialData?.bairro || '',
    cidade: initialData?.cidade || '',
    estado: initialData?.estado || '',
    banco_nome: initialData?.banco_nome || '',
    banco_agencia: initialData?.banco_agencia || '',
    banco_conta: initialData?.banco_conta || '',
    banco_tipo: initialData?.banco_tipo || 'corrente',
    pix_chave: initialData?.pix_chave || '',
    observacoes: initialData?.observacoes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCnpjLookup = async () => {
    if (formData.pais !== 'Brasil') {
      toast.info('Consulta de CNPJ disponível apenas para empresas brasileiras')
      return
    }
    if (!formData.cnpj || formData.cnpj.replace(/\D/g, '').length !== 14) {
      toast.error('Informe um CNPJ válido para buscar')
      return
    }

    setSearchingCnpj(true)
    try {
      const data = await buscarCNPJ(formData.cnpj)
      setFormData(prev => ({
        ...prev,
        razao_social: data.razao_social || prev.razao_social,
        nome_fantasia: data.nome_fantasia || prev.nome_fantasia,
        email: data.email || prev.email,
        telefone: data.telefone || prev.telefone,
        cep: data.cep?.replace(/\D/g, '') || prev.cep,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        estado: data.estado || prev.estado,
        pais: 'Brasil'
      }))
      toast.success('Dados do CNPJ importados!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar CNPJ')
    } finally {
      setSearchingCnpj(false)
    }
  }

  const handleCepLookup = async () => {
    if (formData.pais !== 'Brasil') return
    const cleanCep = formData.cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setSearchingCep(true)
    try {
      const data = await buscarCEP(cleanCep)
      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
      }))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar CEP')
    } finally {
      setSearchingCep(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.razao_social) {
      toast.error('Razão Social é obrigatória')
      return
    }

    setLoading(true)
    try {
      if (isEditing) {
        await updateFornecedor(initialData.id, formData)
        toast.success('Fornecedor atualizado com sucesso')
      } else {
        await createFornecedor({ ...formData, empresa_id: empresaId })
        toast.success('Fornecedor cadastrado com sucesso')
      }
      router.push('/fornecedores')
      router.refresh()
    } catch (err: any) {
      toast.error('Erro ao salvar fornecedor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Identificação */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 ml-1 mb-6">
          <div className="p-2 bg-brand-50 text-brand-500 rounded-xl"><Building2 size={20}/></div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Identificação</h2>
        </div>

        <GlassCard className="p-6 space-y-6 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* CNPJ Group */}
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CNPJ / Tax ID</label>
                <div className="flex gap-2">
                  <input
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0001-00"
                    className="input-glass border-slate-100 flex-1 h-12"
                  />
                  {formData.pais === 'Brasil' && (
                    <button
                      type="button"
                      onClick={handleCnpjLookup}
                      disabled={searchingCnpj}
                      className="btn-secondary h-12 px-4 shadow-sm"
                    >
                      {searchingCnpj ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  )}
                </div>
             </div>

             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Inscrição Estadual</label>
                <input
                  name="ie"
                  value={formData.ie}
                  onChange={handleChange}
                  placeholder="Isento"
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Razão Social *</label>
                <input
                  name="razao_social"
                  value={formData.razao_social}
                  onChange={handleChange}
                  required
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Fantasia</label>
                <input
                  name="nome_fantasia"
                  value={formData.nome_fantasia}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="select-glass border-slate-100 h-12 font-bold"
                >
                  {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Prazo Médio Pagto (Dias)</label>
                <input
                  type="number"
                  name="prazo_medio_pagamento"
                  value={formData.prazo_medio_pagamento}
                  onChange={handleChange}
                  min={0}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>
        </GlassCard>
      </section>

      {/* Contato & Endereço */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 ml-1 mb-6 pt-4">
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><MapPin size={20}/></div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Contato & Endereço</h2>
        </div>

        <GlassCard className="p-6 space-y-6 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
                <input
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-emerald-600">WhatsApp</label>
                <input
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="input-glass border-emerald-100 focus:border-emerald-300 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-brand-600">País</label>
                <select
                  name="pais"
                  value={formData.pais}
                  onChange={handleChange}
                  className="select-glass border-brand-100 flex-1 h-12 font-bold"
                >
                  <option value="Brasil">Brasil</option>
                  <option value="Paraguai">Paraguai</option>
                  <option value="China">China</option>
                  <option value="EUA">EUA</option>
                  <option value="Outro">Outro</option>
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CEP / Zip Code</label>
                <input
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  onBlur={handleCepLookup}
                  placeholder={formData.pais === 'Brasil' ? "00000-000" : "Zip Code"}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Logradouro</label>
                <input
                  name="logradouro"
                  value={formData.logradouro}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número</label>
                <input
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bairro</label>
                <input
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cidade</label>
                <input
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Estado (UF)</label>
                <input
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  maxLength={2}
                  className="input-glass border-slate-100 h-12 uppercase"
                />
             </div>
          </div>
        </GlassCard>
      </section>

      {/* Financeiro */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 ml-1 mb-6 pt-4">
          <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><CreditCard size={20}/></div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Dados para Pagamento</h2>
        </div>

        <GlassCard className="p-6 space-y-6 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Chave PIX</label>
                <input
                  name="pix_chave"
                  value={formData.pix_chave}
                  onChange={handleChange}
                  placeholder="E-mail, CPF, CNPJ ou Celular"
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Banco</label>
                <input
                  name="banco_nome"
                  value={formData.banco_nome}
                  onChange={handleChange}
                  placeholder="Ex: Nubank, Itaú..."
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Conta</label>
                <select
                  name="banco_tipo"
                  value={formData.banco_tipo || 'corrente'}
                  onChange={handleChange}
                  className="select-glass border-slate-100 h-12 font-bold"
                >
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Conta Poupança</option>
                  <option value="pix">Apenas PIX</option>
                </select>
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Agência</label>
                <input
                  name="banco_agencia"
                  value={formData.banco_agencia}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conta</label>
                <input
                  name="banco_conta"
                  value={formData.banco_conta}
                  onChange={handleChange}
                  className="input-glass border-slate-100 h-12"
                />
             </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações Gerais</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              rows={4}
              className="input-glass border-slate-100 p-4 h-auto min-h-[120px] font-medium"
              placeholder="Ex: Contato comercial secundário, melhores horários para entrega, etc."
            />
          </div>
        </GlassCard>
      </section>

      {/* Ações */}
      <div className="flex justify-end items-center gap-4 fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50 md:relative md:bg-transparent md:border-none md:p-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-14 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary h-14 px-10 shadow-brand-glow flex items-center gap-3"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {isEditing ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
        </button>
      </div>
    </form>
  )
}
