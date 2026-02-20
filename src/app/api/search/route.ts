import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        if (!q || q.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const supabase = await createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Recuperar empresa_id (via metadados ou profile)
        const empresaId = userData.user.user_metadata?.empresa_id;

        if (!empresaId) {
            return NextResponse.json({ error: "Empresa não definida" }, { status: 403 });
        }

        const searchTerm = `%${q}%`;

        // 1. Buscar Produtos (por nome, sku, imei ou codigoBarras)
        const { data: produtos } = await supabase
            .from('produtos')
            .select('id, nome, sku, imei, codigo_barras, categoria')
            .eq('empresa_id', empresaId)
            .or(`nome.ilike.${searchTerm},sku.ilike.${searchTerm},imei.ilike.${searchTerm},codigo_barras.ilike.${searchTerm}`)
            .limit(5);

        // 2. Buscar Clientes (por nome, cpf, telefone ou email)
        const { data: clientes } = await supabase
            .from('clientes')
            .select('id, nome, telefone, cpf, email')
            .eq('empresa_id', empresaId)
            .or(`nome.ilike.${searchTerm},cpf.ilike.${searchTerm},telefone.ilike.${searchTerm},email.ilike.${searchTerm}`)
            .limit(5);

        // 3. Buscar OS (por ID numérico ou equipamento)
        // Se a busca for um número, tenta buscar pelo ID exato da OS
        let osQuery = supabase
            .from('ordens_servico')
            .select('id, equipamento, marca, problema_relatado, cliente_id, clientes!inner(nome)')
            .eq('empresa_id', empresaId);

        const qNumber = parseInt(q);
        if (!isNaN(qNumber)) {
            osQuery = osQuery.eq('id', qNumber);
        } else {
            osQuery = osQuery.or(`equipamento.ilike.${searchTerm},marca.ilike.${searchTerm},problema_relatado.ilike.${searchTerm}`);
        }

        const { data: os } = await osQuery.limit(5);

        // Formatar resultados padronizados
        const results: any[] = [];

        if (produtos) {
            produtos.forEach(p => {
                results.push({
                    type: 'produto',
                    id: p.id,
                    title: p.nome,
                    subtitle: `Estoque • ${p.categoria || 'Sem categoria'} ${p.imei ? `• IMEI: ${p.imei}` : ''}`,
                    url: `/estoque/${p.id}`
                });
            });
        }

        if (clientes) {
            clientes.forEach(c => {
                results.push({
                    type: 'cliente',
                    id: c.id,
                    title: c.nome,
                    subtitle: `Cliente • ${c.telefone || c.email || c.cpf || ''}`,
                    url: `/clientes/${c.id}`
                });
            });
        }

        if (os) {
            os.forEach(o => {
                results.push({
                    type: 'os',
                    id: o.id.toString(),
                    title: `OS #${o.id} - ${o.equipamento} (${o.marca || 'Sem marca'})`,
                    // @ts-ignore
                    subtitle: `Ordens de Serviço • Cliente: ${o.clientes?.nome || 'Desconhecido'}`,
                    url: `/os?id=${o.id}` // Assumindo que pode abrir a OS ou filtrar, ou /os/[id] se existir
                });
            });
        }

        // Adicionar algumas "Ações do Sistema" estáticas baseadas na busca
        const actions = [
            { title: "Nova Venda / PDV", keywords: ['venda', 'pdv', 'caixa', 'nova venda', 'vender'], url: '/pdv' },
            { title: "Nova Ordem de Serviço", keywords: ['nova os', 'ordem', 'serviço', 'manutenção', 'conserto'], url: '/os' },
            { title: "Novo Cliente", keywords: ['novo cliente', 'cadastrar cliente'], url: '/clientes' },
            { title: "Novo Produto", keywords: ['novo produto', 'estoque', 'cadastrar aparelho'], url: '/estoque/novo' },
            { title: "Configurações Globais", keywords: ['configuracoes', 'ajustes', 'taxa', 'gateway', 'empresa'], url: '/configuracoes' },
            { title: "Calculadora de Importação", keywords: ['importacao', 'calculadora', 'imposto', 'eua'], url: '/ferramentas/importacao' },
        ];

        actions.forEach(act => {
            if (act.keywords.some(k => k.includes(q.toLowerCase()) || q.toLowerCase().includes(k))) {
                results.push({
                    type: 'acao',
                    id: `action-${act.url}`,
                    title: act.title,
                    subtitle: 'Ação do Sistema',
                    url: act.url
                });
            }
        });

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error("Erro na busca global:", error);
        return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
    }
}
