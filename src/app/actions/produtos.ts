'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Busca produtos no catálogo da empresa.
 */
export async function searchCatalogItems(
  empresaId: string,
  search: string,
  itemType?: string
) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('catalog_items')
    .select(`
      id, name, item_type, stock_qty, 
      cost_price, sale_price, sale_price_usd
    `)
    .eq('empresa_id', empresaId)
    .ilike('name', `%${search}%`)
    .order('name')
    .limit(8)

  if (itemType) query = query.eq('item_type', itemType)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Criar produto mínimo (para cadastro inline na compra).
 */
export async function createCatalogItemMinimo(params: {
  empresaId: string
  name: string
  itemType: string
  stock_qty: number
}) {
  const supabase = await createClient()
  
  console.log('[createCatalogItemMinimo] params:', params)
  
  const { data, error } = await (supabase as any)
    .from('catalog_items')
    .insert({
      empresa_id: params.empresaId,
      name: params.name,
      item_type: params.itemType,
      stock_qty: params.stock_qty,
      cost_price: 0,
      sale_price: 0,
      sale_price_usd: 0,
    })
    .select('id, name, item_type, stock_qty, cost_price, sale_price, sale_price_usd, ncm')
    .single()

  if (error) {
    console.error('[createCatalogItemMinimo] erro:', error)
    throw new Error(error.message)
  }
  
  revalidatePath('/estoque')
  return data
}
