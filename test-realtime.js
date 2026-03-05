const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ctqgrjlilxokosyffrzn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cWdyamxpbHhva29zeWZmcnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyNzg2MiwiZXhwIjoyMDg3MDAzODYyfQ.VMTXExPSD-t-FUUjSc-1RrNxWWDBFJc2ZFU8W0Lp8-M');

const channel = supabase.channel('realtime-test');
channel.on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, payload => {
  console.log('Realtime event received:', payload);
}).subscribe(status => {
  console.log('Status is:', status);
});

setTimeout(() => {
  supabase.from('produtos').update({ estoque_qtd: 10 }).eq('id', 'nonexistent').then(res => console.log('Update res', res));
}, 2000);

setTimeout(() => {
  console.log('Exiting');
  process.exit();
}, 5000);
