'use client'

import { useEffect, useState } from 'react'
import { FornecedorForm } from '@/components/fornecedores/FornecedorForm'
import { getFornecedorById } from '@/app/actions/fornecedores'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

export default function EditarFornecedorPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [fornecedor, setFornecedor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        <p className="mt-4 font-black uppercase text-[10px] text-slate-400 tracking-widest">Carregando dados...</p>
      </div>
    )
  }

  if (!fornecedor) return null

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link 
          href="/fornecedores" 
          className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-brand-500 hover:border-brand-100 rounded-2xl transition-all shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-800">
             Editar Fornecedor
          </h1>
          <p className="text-slate-500 text-sm font-medium">Atualize os dados de {fornecedor.nome_fantasia || fornecedor.razao_social}</p>
        </div>
      </div>

      <FornecedorForm initialData={fornecedor} empresaId={profile?.empresa_id as string} />
    </div>
  )
}
