import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * POST /api/fiscal/mde/consultar
 *
 * Consulta mock da SEFAZ e persiste notas em xml_importacoes.
 * Usa SELECT + INSERT/UPDATE manual para não depender de UNIQUE constraint.
 */
export async function POST(req: NextRequest) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
                    catch { /* Server Component */ }
                },
            },
        }
    );

    try {
        const body = await req.json();
        const empresa_id: string = body?.empresa_id;

        if (!empresa_id) {
            return NextResponse.json({ error: "empresa_id obrigatório" }, { status: 400 });
        }

        // ── Mock SEFAZ — em produção substituir pela chamada ao WebService DF-e
        const notasMock = [
            {
                chave_acesso: "35240212345678000190550010000012341123456701",
                fornecedor_cnpj: "12345678000190",
                fornecedor_nome: "DISTRIBUIDORA DE PEÇAS LTDA",
                data_emissao: "2024-02-12",
                valor_total_centavos: 154050,
                status_processamento: "pendente",
                itens_json: [
                    { nome: "Tela iPhone 13 Original", ncm: "90139010", cfop: "1102", unidade: "UN", quantidade: 2, valorUnitario: 450.25, valorTotal: 900.50 },
                    { nome: "Bateria Samsung A52", ncm: "85076000", cfop: "1102", unidade: "UN", quantidade: 5, valorUnitario: 128.00, valorTotal: 640.00 },
                ],
                numero_nf: "000001234",
                serie: "1",
            },
            {
                chave_acesso: "35240198765432000112550010000543211987654321",
                fornecedor_cnpj: "98765432000112",
                fornecedor_nome: "ATACADÃO DA INFORMÁTICA S/A",
                data_emissao: "2024-02-10",
                valor_total_centavos: 420000,
                status_processamento: "pendente",
                itens_json: [
                    { nome: "Cabo USB-C 2m", ncm: "85444990", cfop: "1102", unidade: "UN", quantidade: 20, valorUnitario: 21.00, valorTotal: 420.00 },
                ],
                numero_nf: "000005432",
                serie: "1",
            },
            {
                chave_acesso: "35241133445566000177550010000098761234509876",
                fornecedor_cnpj: "33445566000177",
                fornecedor_nome: "LOJA DE SUPRIMENTOS EXPRESS",
                data_emissao: "2024-02-14",
                valor_total_centavos: 35075,
                status_processamento: "pendente",
                itens_json: [
                    { nome: "Película Vidro iPhone 14", ncm: "70071900", cfop: "1102", unidade: "UN", quantidade: 10, valorUnitario: 3.50, valorTotal: 35.00 },
                ],
                numero_nf: "000000987",
                serie: "1",
            },
        ];

        const results = [];
        const errors = [];

        for (const nota of notasMock) {
            try {
                // 1. Verificar se já existe pela chave_acesso + empresa_id
                const { data: existing } = await supabase
                    .from("xml_importacoes")
                    .select("id, status_manifestacao, compra_registrada")
                    .eq("empresa_id", empresa_id)
                    .eq("chave_acesso", nota.chave_acesso)
                    .maybeSingle();

                if (existing) {
                    // Já existe — não sobrescreve campos de manifestação/compra
                    results.push(existing);
                    continue;
                }

                // 2. Montar payload apenas com colunas base (sempre existem)
                const basePayload: Record<string, any> = {
                    empresa_id,
                    chave_acesso: nota.chave_acesso,
                    fornecedor_cnpj: nota.fornecedor_cnpj,
                    fornecedor_nome: nota.fornecedor_nome,
                    data_emissao: nota.data_emissao,
                    valor_total_centavos: nota.valor_total_centavos,
                    status_processamento: nota.status_processamento,
                };

                // 3. Adicionar colunas estendidas (só existem após migration)
                //    Se não existirem, o Supabase retorna erro — ignoramos silenciosamente
                const extendedPayload = {
                    ...basePayload,
                    itens_json: nota.itens_json,
                    numero_nf: nota.numero_nf,
                    serie: nota.serie,
                    status_manifestacao: "pendente",
                    compra_registrada: false,
                };

                const { data: inserted, error: insertErr } = await supabase
                    .from("xml_importacoes")
                    .insert([extendedPayload])
                    .select()
                    .single();

                if (insertErr) {
                    // Fallback: tenta sem colunas estendidas (migration não rodou ainda)
                    const { data: fallback, error: fallbackErr } = await supabase
                        .from("xml_importacoes")
                        .insert([basePayload])
                        .select()
                        .single();

                    if (fallbackErr) throw fallbackErr;
                    results.push(fallback);
                } else {
                    results.push(inserted);
                }

            } catch (e: any) {
                console.error(`[mde/consultar] Erro ao salvar ${nota.chave_acesso}:`, e);
                errors.push({ chave: nota.chave_acesso, error: e.message });
            }
        }

        // Retornar lista completa de notas da empresa
        const { data: todasNotas, error: listErr } = await supabase
            .from("xml_importacoes")
            .select("*")
            .eq("empresa_id", empresa_id)
            .order("created_at", { ascending: false });

        if (listErr) {
            console.error("[mde/consultar] Erro ao listar notas:", listErr);
        }

        return NextResponse.json({
            success: true,
            salvadas: results.length,
            erros: errors,
            notas: todasNotas || [],
        });

    } catch (e: any) {
        console.error("[mde/consultar] Erro geral:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
