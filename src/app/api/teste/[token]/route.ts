import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use service role to bypass RLS (public endpoint)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Buscar dados da OS pelo token (público)
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const token = params.token;

    const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
            id, numero, status, problema_relatado,
            checklist_entrada_json, checklist_saida_json,
            teste_saida_concluido, garantia_dias,
            equipamento:equipamentos(marca, modelo, imei, cor)
        `)
        .eq("token_teste", token)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Token inválido ou OS não encontrada" }, { status: 404 });
    }

    // Só permite acesso se a OS estiver finalizada ou em execução
    if (!["finalizada", "em_execucao"].includes(data.status)) {
        return NextResponse.json({ error: "Esta OS não está disponível para testes" }, { status: 403 });
    }

    if (data.teste_saida_concluido) {
        return NextResponse.json({ error: "Teste de saída já foi concluído para esta OS" }, { status: 410 });
    }

    return NextResponse.json({
        numero: data.numero,
        equipamento: data.equipamento,
        checklist_entrada: data.checklist_entrada_json,
        garantia_dias: data.garantia_dias
    });
}

// POST: Salvar resultado dos testes (público)
export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    const token = params.token;
    const body = await request.json();
    const { resultados } = body;

    if (!resultados || typeof resultados !== "object") {
        return NextResponse.json({ error: "Resultados inválidos" }, { status: 400 });
    }

    // Verificar token válido
    const { data: os, error: findErr } = await supabase
        .from("ordens_servico")
        .select("id, status, teste_saida_concluido, empresa_id")
        .eq("token_teste", token)
        .single();

    if (findErr || !os) {
        return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    if (os.teste_saida_concluido) {
        return NextResponse.json({ error: "Teste já concluído" }, { status: 410 });
    }

    // Salvar resultados
    const { error: updateErr } = await supabase
        .from("ordens_servico")
        .update({
            checklist_saida_json: resultados,
            teste_saida_concluido: true,
            teste_saida_concluido_em: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("id", os.id);

    if (updateErr) {
        return NextResponse.json({ error: "Erro ao salvar resultados" }, { status: 500 });
    }

    // Registrar na timeline
    await supabase.from("os_timeline").insert({
        os_id: os.id,
        empresa_id: os.empresa_id,
        usuario_id: os.id, // placeholder (teste público)
        evento: "Checklist de saída realizado no aparelho via QR Code",
        dados_json: { resultados }
    });

    return NextResponse.json({ success: true, message: "Teste concluído com sucesso!" });
}
