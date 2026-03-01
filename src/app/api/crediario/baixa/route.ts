import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { baixaManual, type EfiBankConfig } from "@/services/efibank";
import crypto from "crypto";

/**
 * POST /api/crediario/baixa
 * 
 * Realiza a baixa manual de uma parcela do crediário.
 * Se for EfíBank, também notifica a API.
 */
export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();
        const { parcela_id, forma_pagamento, valor_pago_centavos } = body;

        if (!parcela_id || !forma_pagamento) {
            return NextResponse.json({ error: "parcela_id e forma_pagamento são obrigatórios" }, { status: 400 });
        }

        // Autenticar
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        // Buscar parcela
        const { data: parcela, error: parcelaErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .select("*, crediario:crediarios(id, empresa_id, tipo, efibank_carnet_id)")
            .eq("id", parcela_id)
            .single();

        if (parcelaErr || !parcela) {
            return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
        }

        if (parcela.status === "pago") {
            return NextResponse.json({ error: "Parcela já está paga" }, { status: 400 });
        }

        const valorTotalOriginal = parcela.valor_centavos;
        const valorRecebidoAteO_Momento = parcela.valor_pago_centavos || 0;

        // Se o usuario não enviou valor especifico, assume o restante
        const valorPagamentoNovo = valor_pago_centavos ? parseInt(valor_pago_centavos, 10) : (valorTotalOriginal - valorRecebidoAteO_Momento);

        const novoValorRecebidoTotal = valorRecebidoAteO_Momento + valorPagamentoNovo;
        const isQuitado = novoValorRecebidoTotal >= valorTotalOriginal;

        const pagamentosAntigos = Array.isArray(parcela.pagamentos_json) ? parcela.pagamentos_json : [];
        const novoPagamento = {
            id: crypto.randomUUID(),
            data: new Date().toISOString(),
            valor: valorPagamentoNovo,
            forma_pagamento,
            usuario_id: user.id
        };
        const novosPagamentos = [...pagamentosAntigos, novoPagamento];

        // Atualizar parcela original
        const { error: updateErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .update({
                status: isQuitado ? "pago" : "pendente", // usuario pediu pra ficar pendente caso seja parcial
                valor_pago_centavos: novoValorRecebidoTotal,
                data_pagamento: isQuitado ? new Date().toISOString() : parcela.data_pagamento, // data_pagamento final so quando quitar
                forma_pagamento: forma_pagamento, // utima forma
                pagamentos_json: novosPagamentos,
                updated_at: new Date().toISOString(),
            })
            .eq("id", parcela_id);

        if (updateErr) throw updateErr;

        // ============================================
        // INTEGRAÇÃO FINANCEIRA / CAIXA
        // ============================================

        // 1. Tentar achar um caixa aberto do usuário para registrar
        const hojeHora = new Date().toISOString();
        const { data: caixaAberto } = await (supabaseAdmin.from("caixas") as any)
            .select("id")
            .eq("empresa_id", parcela.empresa_id)
            .eq("usuario_abertura_id", user.id)
            .eq("status", "aberto")
            .single();

        if (caixaAberto) {
            await (supabaseAdmin.from("caixa_movimentacoes") as any)
                .insert({
                    empresa_id: parcela.empresa_id,
                    caixa_id: caixaAberto.id,
                    usuario_id: user.id,
                    tipo: "venda", // Classificando como venda manual ou recebimento.
                    forma_pagamento: forma_pagamento,
                    valor_centavos: valorPagamentoNovo,
                    observacao: `Recebimento Parcela ${parcela.numero_parcela} Crediário #${parcela.crediario?.numero || parcela.crediario_id}`,
                    origem_id: parcela_id
                });
        }

        // 2. Registrar no financeiro_titulos (entradas/saídas da DRE / Relatório Financeiro)
        // Isso é opcional mas ideal para bater DRE. Pode ser registrado como 'pago' direto.
        await (supabaseAdmin.from("financeiro_titulos") as any)
            .insert({
                empresa_id: parcela.empresa_id,
                tipo: "receber",
                status: "pago",
                descricao: `Receb. Parcela Crediário #${parcela.crediario?.numero || parcela.crediario_id}`,
                valor_total_centavos: valorPagamentoNovo,
                valor_pago_centavos: valorPagamentoNovo,
                data_vencimento: parcela.vencimento,
                data_pagamento: hojeHora,
                categoria: "Recebimento de Crediário",
                forma_pagamento_prevista: forma_pagamento,
                origem_tipo: "crediario",
                origem_id: parcela_id
            });

        // Se EfíBank, fazer baixa manual via API (APENAS se for total ou se EfíBank suportar. Normalmente EfíBank não suporta baixar parcialmente um carnê sem reprogramar, então vamos manter)
        if (isQuitado && parcela.crediario?.tipo === "efibank" && parcela.efibank_charge_id) {
            try {
                const { data: configData } = await (supabaseAdmin.from("configuracoes") as any)
                    .select("valor")
                    .eq("empresa_id", parcela.empresa_id)
                    .eq("chave", "efibank_credentials")
                    .single();

                if (configData?.valor) {
                    const creds = configData.valor;
                    const config: EfiBankConfig = {
                        clientId: creds.client_id,
                        clientSecret: creds.client_secret,
                        sandbox: creds.sandbox ?? true,
                    };
                    await baixaManual(config, parcela.efibank_charge_id);
                }
            } catch (efiErr: any) {
                console.error("EfíBank baixa manual error (parcela local já atualizada):", efiErr.message);
            }
        }

        return NextResponse.json({ success: true, parcela_id, pagamento: novoPagamento, isQuitado });

    } catch (error: any) {
        console.error("Erro na baixa de parcela:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
