
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedUnits() {
  const empresa_id = 'e597fb93-2265-4bae-99de-889411ef5010' // LOJINHA DO CELULAR
  
  console.log('--- Seeding Units ---')
  
  const { data: existing } = await supabase.from('units').select('id').eq('empresa_id', empresa_id)
  if (existing && existing.length > 0) {
    console.log('Units already exist, skipping seed.')
    return
  }

  const { data, error } = await supabase.from('units').insert([
    {
      empresa_id,
      name: 'Loja 1 - Matriz',
      has_repair_lab: true,
      has_parts_stock: true,
      has_sales: true,
      is_active: true
    },
    {
      empresa_id,
      name: 'Loja 2 - Quiosque',
      has_repair_lab: false,
      has_parts_stock: false,
      has_sales: true,
      is_active: true
    }
  ]).select()

  if (error) {
    console.error('Error seeding units:', error)
  } else {
    console.log('Units seeded successfully:', data)
  }
}

seedUnits()
