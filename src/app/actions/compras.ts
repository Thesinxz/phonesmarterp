'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Listar todas as compras de uma empresa com filtros de status e data.
 */
export async function getCompras(empresaId: string, filters?: {
  status?: string
  fornecedorId?: string
  dataInicio?: string
  dataFim?: string
}) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('compras')
    .select(`
      id, numero, fornecedor_nome, fornecedor_id, 
      data_compra, valor_total, status, origem, 
      nota_fiscal_numero, created_at
    `)
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.fornecedorId) query = query.eq('fornecedor_id', filters.fornecedorId)
  if (filters?.dataInicio) query = query.gte('data_compra', filters.dataInicio)
  if (filters?.dataFim) query = query.lte('data_compra', filters.dataFim)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

/**
 * Buscar detalhe completo de uma compra, incluindo itens e fornecedor.
 */
export async function getCompraById(compraId: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('compras')
    .select(`
      *,
      compra_itens (*),
      fornecedor:fornecedor_id (*)
    `)
    .eq('id', compraId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Criar uma nova compra completa:
 * 1. Ordem de Compra
 * 2. Itens da Compra
 * 3. Título Financeiro (Contas a Pagar)
 * 4. Atualizar Estoque (catalog_items)
 * 5. Registrar Histórico de Movimentação
 */
export async function criarCompra(params: {
  empresaId: string
  unidadeId: string // Importante: para qual estoque vai
  fornecedorId?: string
  fornecedorNome?: string
  dataCompra: string
  dataVencimento?: string
  notaFiscalNumero?: string
  observacoes?: string
  origem: 'manual' | 'xml_nfe' | 'ocr_pdf' | 'ocr_imagem'
  itens: Array<{
    nome: string
    quantidade: number
    custoUnitario: number
    precoVarejo: number
    precoAtacado: number
    itemType: 'peca' | 'celular' | 'acessorio' | 'outro'
    categoria?: string
  }>
}) {
  const supabase = await createClient()

  // 1. Calcular total
  const valorTotal = params.itens.reduce(
    (acc, item) => acc + item.custoUnitario * item.quantidade, 0
  )

  // 2. Criar registro da compra
  const { data: compra, error: compraError } = await (supabase as any)
    .from('compras')
    .insert({
      empresa_id: params.empresaId,
      fornecedor_id: params.fornecedorId || null,
      fornecedor_nome: params.fornecedorNome,
      data_compra: params.dataCompra,
      data_vencimento: params.dataVencimento || null,
      valor_total: valorTotal,
      nota_fiscal_numero: params.notaFiscalNumero || null,
      observacoes: params.observacoes || null,
      origem: params.origem,
      status: 'pendente',
    })
    .select()
    .single()

  if (compraError) throw new Error(compraError.message)

  // 3. Inserir itens
  const { error: itensError } = await (supabase as any)
    .from('compra_itens')
    .insert(
      params.itens.map(item => ({
        empresa_id: params.empresaId,
        compra_id: compra.id,
        nome: item.nome,
        quantidade: item.quantidade,
        custo_unitario: item.custoUnitario,
        preco_venda_varejo: item.precoVarejo,
        preco_venda_atacado: item.precoAtacado,
        item_type: item.itemType,
        categoria: item.categoria || null
      }))
    )

  if (itensError) throw new Error(itensError.message)

  // 4. Lançar no financeiro (Contas a Pagar)
  if (params.dataVencimento) {
    await (supabase as any).from('financeiro_titulos').insert({
      empresa_id: params.empresaId,
      tipo: 'pagar',
      descricao: `Compra OC-${String(compra.numero).padStart(3,'0')} · ${params.fornecedorNome || 'Fornecedor avulso'}`,
      valor_total_centavos: valorTotal,
      valor_pago_centavos: 0,
      data_vencimento: params.dataVencimento,
      status: 'pendente',
      fornecedor_id: params.fornecedorId || null,
      origem_tipo: 'compra',
      origem_id: compra.id,
      categoria: 'Mercadorias para revenda'
    })
  }

  // 5. Atualizar estoque e registrar movimentação
  for (const item of params.itens) {
    // 5.1 Buscar item atual no catálogo da empresa
    const { data: catalogItem } = await (supabase as any)
      .from('catalog_items')
      .select('id, stock_qty')
      .eq('empresa_id', params.empresaId)
      .ilike('name', item.nome)
      .eq('item_type', item.itemType)
      .maybeSingle()

    let itemId = ''

    if (catalogItem) {
      itemId = catalogItem.id
      // Atualizar existente
      await (supabase as any)
        .from('catalog_items')
        .update({
          stock_qty: (catalogItem.stock_qty || 0) + item.quantidade,
          cost_price: item.custoUnitario,
          sale_price: item.precoVarejo,
          sale_price_usd: item.precoAtacado,
          updated_at: new Date().toISOString()
        })
        .eq('id', catalogItem.id)
    } else {
      // Criar novo no catálogo
      const { data: newItem } = await (supabase as any)
        .from('catalog_items')
        .insert({
          empresa_id: params.empresaId,
          name: item.nome,
          item_type: item.itemType,
          stock_qty: item.quantidade,
          cost_price: item.custoUnitario,
          sale_price: item.precoVarejo,
          sale_price_usd: item.precoAtacado,
          categoria: item.categoria || null
        })
        .select('id')
        .single()
      
      itemId = newItem.id
    }

    // 5.2 Registrar movimentação de estoque na unidade específica
    await (supabase as any).from('stock_movements').insert({
      tenant_id: params.empresaId,
      unit_id: params.unidadeId,
      catalog_item_id: itemId,
      movement_type: 'entrada',
      qty: item.quantidade,
      notes: `Compra OC-${String(compra.numero).padStart(3,'0')}`,
      reference_id: compra.id
    })

    // 5.3 Atualizar estoque da unidade (unit_stock)
    const { data: uStock } = await (supabase as any)
      .from('unit_stock')
      .select('qty')
      .eq('unit_id', params.unidadeId)
      .eq('catalog_item_id', itemId)
      .maybeSingle()
    
    if (uStock) {
      await (supabase as any)
        .from('unit_stock')
        .update({ qty: uStock.qty + item.quantidade })
        .eq('unit_id', params.unidadeId)
        .eq('catalog_item_id', itemId)
    } else {
      await (supabase as any)
        .from('unit_stock')
        .insert({
          tenant_id: params.empresaId,
          unit_id: params.unidadeId,
          catalog_item_id: itemId,
          qty: item.quantidade
        })
    }
  }

  revalidatePath('/compras')
  return { success: true, compraId: compra.id, numero: compra.numero }
}

/**
 * Atualizar status (concluir/cancelar).
 */
export async function updateCompraStatus(
  compraId: string,
  status: 'pendente' | 'pago' | 'cancelado'
) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('compras')
    .update({ status })
    .eq('id', compraId)

  if (error) throw new Error(error.message)
  revalidatePath('/compras')
  return { success: true }
}
