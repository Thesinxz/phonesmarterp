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
      data_compra, data_vencimento, valor_total, status, origem, 
      nota_fiscal_numero, created_at,
      compra_itens(count)
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
  formaPagamento?: string
  parcelas?: number
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
    itemTypeId?: string // Alias for catalogItemId if needed, but I'll use catalogItemId
    catalogItemId?: string
    categoria?: string
    ncm?: string
  }>
}) {
  const supabase = await createClient()

  // 1. Calcular total
  const valorTotal = params.itens.reduce(
    (acc, item) => acc + item.custoUnitario * item.quantidade, 0
  )

  // 1.1 Tentar vincular fornecedor pelo nome se ID estiver vazio
  let finalFornecedorId = params.fornecedorId
  if (!finalFornecedorId && params.fornecedorNome) {
    const { data: existing } = await (supabase as any)
      .from('fornecedores')
      .select('id')
      .eq('empresa_id', params.empresaId)
      .ilike('razao_social', params.fornecedorNome)
      .maybeSingle()
    
    if (existing) {
      finalFornecedorId = existing.id
    }
  }

  // 2. Criar registro da compra
  const { data: compra, error: compraError } = await (supabase as any)
    .from('compras')
    .insert({
      empresa_id: params.empresaId,
      fornecedor_id: finalFornecedorId || null,
      fornecedor_nome: params.fornecedorNome,
      data_compra: params.dataCompra,
      data_vencimento: params.dataVencimento || null,
      valor_total: valorTotal,
      nota_fiscal_numero: params.notaFiscalNumero || null,
      observacoes: params.observacoes || null,
      origem: params.origem,
      status: 'pendente',
      forma_pagamento: params.formaPagamento || null,
      parcelas: params.parcelas || 1,
    })
    .select()
    .single()

  if (compraError) throw new Error(compraError.message)

  // 3. Atualizar estoque, registrar movimentação e preparar itens para salvar
  for (const item of params.itens) {
    // 3.1 Buscar ou Criar item no catálogo
    let catalogItem = null
    let itemId = item.catalogItemId || ''

    if (itemId) {
      const { data } = await (supabase as any)
        .from('catalog_items')
        .select('id, stock_qty')
        .eq('id', itemId)
        .maybeSingle()
      catalogItem = data
    } else {
      const { data } = await (supabase as any)
        .from('catalog_items')
        .select('id, stock_qty')
        .eq('empresa_id', params.empresaId)
        .ilike('name', item.nome)
        .eq('item_type', item.itemType)
        .maybeSingle()
      catalogItem = data
    }

    if (catalogItem) {
      itemId = catalogItem.id
      await (supabase as any)
        .from('catalog_items')
        .update({
          stock_qty: (catalogItem.stock_qty || 0) + item.quantidade,
          cost_price: item.custoUnitario,
          sale_price: item.precoVarejo,
          sale_price_usd: item.precoAtacado,
          ncm: item.ncm || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', catalogItem.id)
    } else {
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
          categoria: item.categoria || null,
          ncm: item.ncm || null
        })
        .select('id')
        .single()
      
      itemId = newItem.id
    }

    // 3.2 Salvar item vinculado à compra
    await (supabase as any)
      .from('compra_itens')
      .insert({
        empresa_id: params.empresaId,
        compra_id: compra.id,
        catalog_item_id: itemId, // NEW FIELD
        nome: item.nome,
        quantidade: item.quantidade,
        custo_unitario: item.custoUnitario,
        preco_venda_varejo: item.precoVarejo,
        preco_venda_atacado: item.precoAtacado,
        item_type: item.itemType,
        categoria: item.categoria || null,
        ncm: item.ncm || null
      })

    // 3.3 Registrar movimentação de estoque
    await (supabase as any).from('stock_movements').insert({
      tenant_id: params.empresaId,
      unit_id: params.unidadeId,
      catalog_item_id: itemId,
      movement_type: 'entrada',
      qty: item.quantidade,
      notes: `Compra OC-${String(compra.numero).padStart(3,'0')}`,
      reference_id: compra.id
    })

    // 3.4 Atualizar estoque da unidade (unit_stock)
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

  // 4. Lançar no financeiro (Contas a Pagar) com suporte a parcelamento
  if (params.dataVencimento && (params.parcelas || 1) >= 1) {
    const totalParcelas = params.parcelas || 1
    const valorParcela = Math.floor(valorTotal / totalParcelas)
    const resto = valorTotal % totalParcelas
    const baseDate = new Date(params.dataVencimento)

    const titulos = Array.from({ length: totalParcelas }, (_, i) => {
      const vencimento = new Date(baseDate)
      vencimento.setMonth(vencimento.getMonth() + i)

      // Se mudar o mês e o dia original não existir no novo mês (ex: 31 de Jan -> Fev),
      // o JS ajusta automaticamente para o começo do próximo mês. 
      // Para ERPs, geralmente queremos o último dia do mês ou manter o dia se possível.
      // O comportamento padrão do JS `setMonth` é razoável aqui.

      return {
        empresa_id: params.empresaId,
        tipo: 'pagar',
        descricao: totalParcelas > 1
          ? `Compra OC-${String(compra.numero).padStart(3,'0')} · ${params.fornecedorNome || 'Fornecedor avulso'} (${i + 1}/${totalParcelas})`
          : `Compra OC-${String(compra.numero).padStart(3,'0')} · ${params.fornecedorNome || 'Fornecedor avulso'}`,
        valor_total_centavos: i === totalParcelas - 1 ? valorParcela + resto : valorParcela,
        valor_pago_centavos: 0,
        data_vencimento: vencimento.toISOString().split('T')[0],
        status: 'pendente',
        fornecedor_id: params.fornecedorId || null,
        origem_tipo: 'compra',
        origem_id: compra.id,
        forma_pagamento: params.formaPagamento || null,
        categoria: 'Mercadorias para revenda'
      }
    })

    await (supabase as any).from('financeiro_titulos').insert(titulos)
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
