'use client'

import { FornecedorForm } from '@/components/fornecedores/FornecedorForm'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Truck } from 'lucide-react'
import Link from 'next/link'

export default function NovoFornecedorPage() {
  const { profile } = useAuth()

  if (!profile?.empresa_id) return null

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
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
             Novo Fornecedor
          </h1>
          <p className="text-slate-500 text-sm font-medium">Cadastre um novo parceiro no sistema</p>
        </div>
      </div>

      <FornecedorForm empresaId={profile.empresa_id} />
    </div>
  )
}
