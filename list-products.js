const https = require('https');

const url = "https://ctqgrjlilxokosyffrzn.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cWdyamxpbHhva29zeWZmcnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyNzg2MiwiZXhwIjoyMDg3MDAzODYyfQ.VMTXExPSD-t-FUUjSc-1RrNxWWDBFJc2ZFU8W0Lp8-M";
const empresaId = "f3861ab5-d553-4bd7-984e-0462a91f954e";

const hostname = url.replace('https://', '');
const options = {
    hostname: hostname,
    path: `/rest/v1/produtos?select=id,nome,exibir_vitrine,estoque_qtd&empresa_id=eq.${empresaId}`,
    method: 'GET',
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const data = JSON.parse(body);
        console.log('Total produtos:', data.length);
        console.log('Produtos que devem aparecer (exibir_vitrine=true, estoque>0):');
        const visibles = data.filter(p => p.exibir_vitrine && p.estoque_qtd > 0);
        console.log(visibles);

        if (visibles.length === 0) {
            console.log('Amostra de produtos ignorados:');
            console.log(data.slice(0, 5));
        }
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
