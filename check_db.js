const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking tables...");

    // Check if usuarios exists
    const { data: u, error: ue } = await supabase.from('usuarios').select('count', { count: 'exact', head: true });
    console.log("Table 'usuarios':", ue ? `Error: ${ue.message}` : "Exists");

    // Check if usuario_vinculos_empresa exists
    const { data: v, error: ve } = await supabase.from('usuario_vinculos_empresa').select('count', { count: 'exact', head: true });
    console.log("Table 'usuario_vinculos_empresa':", ve ? `Error: ${ve.message}` : "Exists");

    // Check if convites exists
    const { data: c, error: ce } = await supabase.from('convites').select('count', { count: 'exact', head: true });
    console.log("Table 'convites':", ce ? `Error: ${ce.message}` : "Exists");

    // Check if equipe_convites exists
    const { data: ec, error: ece } = await supabase.from('equipe_convites').select('count', { count: 'exact', head: true });
    console.log("Table 'equipe_convites':", ece ? `Error: ${ece.message}` : "Exists");
}

check();
