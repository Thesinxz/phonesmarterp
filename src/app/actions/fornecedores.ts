'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

type FornecedorInsert = Database['public']['Tables']['fornecedores']['Insert'];
type FornecedorUpdate = Database['public']['Tables']['fornecedores']['Update'];

export async function getFornecedores(empresaId: string, search?: string) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('fornecedores')
    .select(`
      id, razao_social, nome_fantasia, cnpj, categoria,
      telefone, whatsapp, email, cidade, estado, pais,
      prazo_medio_pagamento
    `)
    .eq('empresa_id', empresaId)
    .order('razao_social')

  if (search) {
    query = query.or(
      `razao_social.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getFornecedorById(id: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('fornecedores')
    .select(`
      *,
      compras (
        id, numero, data_compra, valor_total, status
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createFornecedor(params: FornecedorInsert) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('fornecedores')
    .insert({
      ...params,
      nome: params.razao_social // Sync for backward compatibility
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/fornecedores')
  return data
}

export async function updateFornecedor(id: string, params: FornecedorUpdate) {
  const supabase = await createClient()
  const updateData: any = { ...params, updated_at: new Date().toISOString() }
  if (params.razao_social) {
    updateData.nome = params.razao_social // Sync for backward compatibility
  }

  const { error } = await (supabase as any)
    .from('fornecedores')
    .update(updateData)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/fornecedores')
  revalidatePath(`/fornecedores/${id}`)
  revalidatePath(`/fornecedores/${id}/editar`)
}

export async function deleteFornecedor(id: string) {
  const supabase = await createClient()
  // Soft delete — não remover do banco
  const { error } = await (supabase as any)
    .from('fornecedores')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/fornecedores')
}

// Buscar CNPJ na Receita Federal
export async function buscarCNPJ(cnpj: string) {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) throw new Error('CNPJ inválido')

  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`)
    if (!res.ok) throw new Error('CNPJ não encontrado ou limite de requisições excedido')
    const data = await res.json()

    return {
      razao_social: data.razao_social,
      nome_fantasia: data.estabelecimento?.nome_fantasia || data.razao_social,
      email: data.estabelecimento?.email,
      telefone: data.estabelecimento?.ddd1 && data.estabelecimento?.telefone1
        ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}`
        : null,
      cep: data.estabelecimento?.cep,
      logradouro: data.estabelecimento?.logradouro,
      numero: data.estabelecimento?.numero,
      complemento: data.estabelecimento?.complemento,
      bairro: data.estabelecimento?.bairro,
      cidade: data.estabelecimento?.cidade?.nome,
      estado: data.estabelecimento?.estado?.sigla,
    }
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao buscar CNPJ')
  }
}

// Buscar CEP via ViaCEP
export async function buscarCEP(cep: string) {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) throw new Error('CEP inválido')

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data = await res.json()
    if (data.erro) throw new Error('CEP não encontrado')

    return {
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    }
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao buscar CEP')
  }
}
