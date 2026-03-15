
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsers() {
  const empresa_id = 'e597fb93-2265-4bae-99de-889411ef5010'
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('id, email, nome, papel, auth_user_id')
    .eq('empresa_id', empresa_id)
  
  if (error) console.error(error)
  else console.log('Users for company:', users)
}

checkUsers()
