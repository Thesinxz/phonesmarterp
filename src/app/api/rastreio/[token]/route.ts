import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Use service role to bypass RLS (public endpoint for clients tracking OS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// GET: Buscar dados PÚBLICOS da OS pelo token
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const token = params.token;

    const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
            id, numero, status, problema_relatado, diagnostico, 
            valor_total_centavos, valor_adiantado_centavos, orcamento_aprovado,
            checklist_entrada_json, checklist_saida_json,
            garantia_dias, garantia_ate,
            foto_entrada_url,
            created_at,
            cliente:clientes(nome),
            equipamento:equipamentos(marca, modelo, cor),
            timeline:os_timeline(evento, criado_em, dados_json)
        `)
        .or(`token_teste.eq.${token},id.eq.${token}`)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "OS não encontrada ou link inválido" }, { status: 404 });
    }

    // Filtrar dados da timeline para remover informações sensíveis
    const timelineFiltrada = data.timeline
        ? data.timeline.filter((t: any) => !t.evento.includes('Excluiu') && !t.evento.includes('Financeiro'))
            .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
        : [];

    // Tratar joins que podem vir como array (dependendo do esquema do Supabase)
    const cliente = Array.isArray(data.cliente) ? data.cliente[0] : data.cliente;
    const equipamento = Array.isArray(data.equipamento) ? data.equipamento[0] : data.equipamento;

    return NextResponse.json({
        numero: data.numero,
        status: data.status,
        data_entrada: data.created_at,
        cliente_nome: cliente?.nome?.split(' ')[0] || 'Cliente', // Apenas primeiro nome para privacidade
        equipamento: {
            marca: equipamento?.marca,
            modelo: equipamento?.modelo,
            cor: equipamento?.cor
        },
        problema: data.problema_relatado,
        diagnostico: data.diagnostico,
        financeiro: {
            valor_total: data.valor_total_centavos,
            adiantamento: data.valor_adiantado_centavos,
            orcamento_aprovado: data.orcamento_aprovado
        },
        garantia: {
            dias: data.garantia_dias,
            ate: data.garantia_ate
        },
        checklist_entrada: data.checklist_entrada_json,
        foto_entrada_url: data.foto_entrada_url,
        timeline: timelineFiltrada
    });
}
