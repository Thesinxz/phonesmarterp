import re

with open('src/app/(dashboard)/pedidos/novo/page.tsx', 'r') as f:
    content = f.read()

# Fix 1: Update the useEffect to watch for searchClient
effect_search = r'''    useEffect\(\(\) => \{
        if \(step === 2\) \{
            const timer = setTimeout\(\(\) => \{
                loadProducts\(searchTerm\);
            \}, 300\);
            return \(\) => clearTimeout\(timer\);
        \}
    \}, \[searchTerm, step\]\);'''

effect_replace = '''    useEffect(() => {
        if (step === 2) {
            const timer = setTimeout(() => {
                loadProducts(searchTerm);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchTerm, step]);

    useEffect(() => {
        if (step === 1 && searchClient.length >= 2) {
            const timer = setTimeout(() => {
                buscarClientes(searchClient);
            }, 300);
            return () => clearTimeout(timer);
        } else if (searchClient.length < 2) {
            setClients([]);
        }
    }, [searchClient, step]);'''

content = re.sub(effect_search, effect_replace, content)

# Fix 2: Remove the direct call in onChange
onchange_search = r'''                                onChange=\{e => \{
                                    setSearchClient\(e\.target\.value\);
                                    buscarClientes\(e\.target\.value\);
                                    if \(selectedClient\) setSelectedClient\(null\);
                                \}\}'''

onchange_replace = '''                                onChange={e => {
                                    setSearchClient(e.target.value);
                                    if (selectedClient) setSelectedClient(null);
                                }}'''

content = re.sub(onchange_search, onchange_replace, content)

with open('src/app/(dashboard)/pedidos/novo/page.tsx', 'w') as f:
    f.write(content)
