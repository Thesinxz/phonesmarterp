const https = require('https');

const url = "https://ctqgrjlilxokosyffrzn.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cWdyamxpbHhva29zeWZmcnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQyNzg2MiwiZXhwIjoyMDg3MDAzODYyfQ.VMTXExPSD-t-FUUjSc-1RrNxWWDBFJc2ZFU8W0Lp8-M";

const hostname = url.replace('https://', '');
const options = {
    hostname: hostname,
    path: '/rest/v1/empresas?select=id,nome,subdominio',
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
        console.log('Body:', body);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
