
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('--- Checking Empresas ---')
  const { data: companies, error: compError } = await supabase.from('empresas').select('*')
  if (compError) console.error('Error empresas:', compError)
  else console.log('Empresas:', companies)

  console.log('\n--- Checking Usuarios ---')
  const { data: users, error: userError } = await supabase.from('usuarios').select('*')
  if (userError) console.error('Error usuarios:', userError)
  else console.log('Usuarios found:', users?.length)

  console.log('\n--- Checking Units ---')
  const { data: units, error: unitError } = await supabase.from('units').select('*')
  if (unitError) console.error('Error units:', unitError)
  else console.log('Units:', units)
}

checkData()
