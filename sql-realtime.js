const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ctqgrjlilxokosyffrzn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cWdyamxpbHhva29zeWZmcnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyNzg2MiwiZXhwIjoyMDg3MDAzODYyfQ.VMTXExPSD-t-FUUjSc-1RrNxWWDBFJc2ZFU8W0Lp8-M');

async function main() {
  const { data, error } = await supabase.rpc('get_realtime_tables'); // Or some raw query if possible, but PostgREST can't directly query pg_publication_tables.
  console.log(data, error);
}
main();
