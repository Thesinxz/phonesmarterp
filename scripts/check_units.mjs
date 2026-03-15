
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUnits() {
  console.log('--- Checking Units Table ---')
  const { data, error } = await supabase
    .from('units')
    .select('id, name, has_repair_lab, has_parts_stock, has_sales')
  
  if (error) {
    console.error('Error fetching units:', error)
    return
  }
  
  console.log('Units found:', data.length)
  data.forEach(u => {
    console.log(`Unit: ${u.name} (ID: ${u.id})`)
    console.log(`  Lab: ${u.has_repair_lab}, Stock: ${u.has_parts_stock}, Sales: ${u.has_sales}`)
  })
}

checkUnits()
