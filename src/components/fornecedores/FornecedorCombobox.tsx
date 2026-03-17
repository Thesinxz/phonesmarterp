'use client'

import { useState, useEffect, useRef } from 'react'
import { Truck, Search, Plus, Loader2, X, Check } from 'lucide-react'
import { getFornecedores } from '@/app/actions/fornecedores'
import { cn } from '@/utils/cn'

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
}

interface FornecedorComboboxProps {
  value?: string;
  onSelect: (fornecedor: Fornecedor | null) => void;
  empresaId: string;
  className?: string;
  error?: boolean;
}

export function FornecedorCombobox({ value, onSelect, empresaId, className, error }: FornecedorComboboxProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Fornecedor[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Fornecedor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initial load if value (id) is provided
  useEffect(() => {
    if (value && !selected) {
      // Small delay to ensure DB is ready or just fetch it
      const fetchInitial = async () => {
        const data = await getFornecedores(empresaId)
        const found = data.find((f: any) => f.id === value)
        if (found) {
          setSelected(found)
          setSearch(found.nome_fantasia || found.razao_social)
        }
      }
      fetchInitial()
    }
  }, [value, empresaId, selected])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (term: string) => {
    setSearch(term)
    if (term.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const data = await getFornecedores(empresaId, term)
      setResults(data)
      setIsOpen(true)
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (f: Fornecedor) => {
    setSelected(f)
    setSearch(f.nome_fantasia || f.razao_social)
    onSelect(f)
    setIsOpen(false)
  }

  const clearSelection = () => {
    setSelected(null)
    setSearch('')
    onSelect(null)
    setIsOpen(false)
  }

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className={cn(
        "relative flex items-center transition-all duration-300",
        "bg-white/50 backdrop-blur-sm border-2 rounded-2xl group",
        error ? "border-red-200" : "border-slate-100 hover:border-brand-200",
        isOpen && "border-brand-300 shadow-lg shadow-brand-500/10"
      )}>
        <div className="pl-4 text-slate-400 group-hover:text-brand-500 transition-colors">
          <Truck size={18} />
        </div>
        
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => search.length >= 2 && setIsOpen(true)}
          placeholder="Buscar fornecedor por nome ou CNPJ..."
          className="w-full h-12 px-3 bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
        />

        {loading ? (
          <div className="pr-4">
            <Loader2 size={18} className="animate-spin text-brand-500" />
          </div>
        ) : selected ? (
          <button 
            type="button"
            onClick={clearSelection}
            className="pr-4 text-slate-300 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        ) : (
          <div className="pr-4 text-slate-300">
            <Search size={18} />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
            {results.length > 0 ? (
              results.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelect(f)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group text-left",
                    selected?.id === f.id ? "bg-brand-50" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                    selected?.id === f.id ? "bg-brand-500 text-white" : "bg-white text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500"
                  )}>
                    <Truck size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">{f.nome_fantasia || f.razao_social}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {f.cnpj || 'CNPJ NÃO INFORMADO'}
                    </p>
                  </div>
                  {selected?.id === f.id && (
                    <div className="text-brand-500 pr-2">
                      <Check size={18} />
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400">
                <Truck size={32} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm font-medium">Nenhum fornecedor encontrado</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.open('/fornecedores/novo', '_blank')}
            className="w-full p-4 bg-slate-50/50 hover:bg-brand-50 text-brand-600 transition-all flex items-center justify-center gap-2 border-t border-slate-100 group"
          >
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all">
              <Plus size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">
              Cadastrar "{search}" como novo fornecedor
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
