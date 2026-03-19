import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const migrationPath = path.join(process.cwd(), 'supabase/migrations/095_fix_stock_and_usuarios_rls.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

async function runMigration() {
  console.log('Running comprehensive cascade delete migration...')
  
  // Split the SQL into statements and run them via rpc if possible or just run the whole thing
  // Note: Most Supabase projects don't have a public 'exec_sql' RPC by default for security.
  // If it's missing, we might need a different approach.
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    console.error('Migration failed (exec_sql RPC likely missing):', error.message)
    console.log('Attempting manual cleanup of test companies via client...')
    
    // Fallback: at least clean up the companies if the schema change fails
    const { data: deleted, error: delError } = await supabase
      .from('empresas')
      .delete()
      .in('nome', ['Guia Lopes', 'Filial Guia Lopes', 'Minha Empresa'])
      .select()

    if (delError) console.error('Cleanup failed:', delError.message)
    else console.log('Cleanup successful:', deleted)
  } else {
    console.log('Migration executed successfully:', data)
  }
}

runMigration()
