import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { baixaManual, type EfiBankConfig } from "@/services/efibank";

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
        const valorPago = valor_pago_centavos ? parseInt(valor_pago_centavos, 10) : valorTotalOriginal;
        const isPartial = valorPago < valorTotalOriginal && valorPago > 0;

        // Atualizar status e valor pago da parcela original
        const { error: updateErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .update({
                status: "pago",
                valor_centavos: valorPago, // O registro atual fica com o valor exato que foi pago
                data_pagamento: new Date().toISOString(),
                forma_pagamento,
                updated_at: new Date().toISOString(),
            })
            .eq("id", parcela_id);

        if (updateErr) throw updateErr;

        // Se for parcial, criar uma nova parcela com o saldo restante
        if (isPartial) {
            const saldoRestante = valorTotalOriginal - valorPago;
            const resNovaParcela = await (supabaseAdmin.from("crediario_parcelas") as any)
                .insert({
                    crediario_id: parcela.crediario_id,
                    empresa_id: parcela.empresa_id,
                    numero_parcela: parcela.numero_parcela, // Mantém o mesmo número para saber que é a mesma cota
                    valor_centavos: saldoRestante,
                    vencimento: parcela.vencimento, // Mantém o vencimento
                    status: "pendente"
                })
                .select()
                .single();

            if (resNovaParcela.error) {
                console.error("Erro ao gerar saldo restante:", resNovaParcela.error);
                // Não throw para não cancelar a baixa já feita, mas loga severamente.
            }
        }

        // Se EfíBank, fazer baixa manual via API
        if (parcela.crediario?.tipo === "efibank" && parcela.efibank_charge_id) {
            try {
                const { data: configData } = await (supabaseAdmin.from("configuracoes") as any)
                    .select("valor")
                    .eq("empresa_id", parcela.crediario.empresa_id)
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

        return NextResponse.json({ success: true, parcela_id });

    } catch (error: any) {
        console.error("Erro na baixa de parcela:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
