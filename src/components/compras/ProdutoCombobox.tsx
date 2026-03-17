'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Plus, Loader2, Package, Check, AlertCircle } from 'lucide-react'
import { searchCatalogItems, createCatalogItemMinimo } from '@/app/actions/produtos'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

interface ProdutoComboboxProps {
  value: string
  empresaId: string
  onSelect: (produto: any, nome: string) => void
  itemType?: string
}

export function ProdutoCombobox({ value, empresaId, onSelect, itemType }: ProdutoComboboxProps) {
  const [search, setSearch] = useState(value)
  const [results, setResults] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sincronizar search com o valor externo se mudar (ex: ao limpar itens)
  useEffect(() => {
    setSearch(value)
  }, [value])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = async (term: string) => {
    setSearch(term)
    onSelect(null, term) // Atualiza o nome mesmo sem selecionar do catálogo

    if (term.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await searchCatalogItems(empresaId, term, itemType)
      setResults(data)
      setIsOpen(true)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (produto: any) => {
    setSearch(produto.name)
    setResults([])
    setIsOpen(false)
    onSelect(produto, produto.name)
  }

  const handleCreateNew = async () => {
    if (!search.trim()) return
    
    setIsLoading(true)
    try {
      const novo = await createCatalogItemMinimo({
        empresaId,
        name: search,
        itemType: itemType || 'peca',
        stock_qty: 0,
      })
      setSearch(novo.name)
      setResults([])
      setIsOpen(false)
      onSelect(novo, novo.name)
    } catch (error) {
      console.error('Erro ao criar produto:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center group">
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => search.length >= 2 && setIsOpen(true)}
          placeholder="Buscar ou digitar nome do produto..."
          className="w-full bg-transparent border-b border-transparent focus:border-brand-500 font-bold text-slate-800 outline-none h-10 transition-all placeholder:text-slate-300 pr-8"
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-brand-500" />
          ) : (
            <Search size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {results.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {results.map(produto => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => handleSelect(produto)}
                    className="w-full p-4 text-left hover:bg-slate-50/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-slate-800 text-sm truncate">{produto.name}</span>
                         <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">
                           {produto.item_type}
                         </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className={cn(
                          "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                          produto.stock_qty <= 0 ? "text-red-500" : "text-emerald-500"
                        )}>
                          <Package size={10} />
                          Estoque: {produto.stock_qty}
                        </div>
                        {produto.cost_price > 0 && (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            Últ. Custo: {formatCurrency(produto.cost_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs font-black text-brand-600">
                        {produto.sale_price > 0 ? formatCurrency(produto.sale_price) : '—'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-3">
                  <Search size={24} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Nenhum produto encontrado
                </p>
              </div>
            )}
          </div>

          {/* Criar Novo */}
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-full p-4 bg-slate-50/50 hover:bg-brand-50 hover:text-brand-600 border-t border-slate-100 transition-all flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500 group"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-brand-200 group-hover:text-brand-500 transition-all shadow-sm">
              <Plus size={16} />
            </div>
            <span>Criar "<span className="text-slate-800 group-hover:text-brand-600 lowercase">{search}</span>" no catálogo</span>
          </button>
        </div>
      )}
    </div>
  )
}
