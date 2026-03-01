import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { criarCarne, type EfiBankConfig, type CriarCarneParams } from "@/services/efibank";

/**
 * POST /api/crediario/criar
 * 
 * Cria um contrato de crediário com parcelas.
 * Se tipo === 'efibank' → gera carnê via API EfíBank.
 * Se tipo === 'interno' → gera parcelas locais.
 */
export async function POST(request: NextRequest) {
    const supabaseAdmin = getSupabaseAdmin();

    try {
        const body = await request.json();
        const {
            empresa_id,
            cliente_id,
            venda_id,
            valor_total_centavos,
            entrada_centavos = 0,
            num_parcelas,
            tipo = "interno",
            juros_percentual = 0,
            multa_percentual = 2,
            observacoes
        } = body;

        if (!empresa_id || !cliente_id || !valor_total_centavos || !num_parcelas) {
            return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
        }

        // 1. Autenticar o usuário
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

        // 2. Calcular parcelas
        const valorFinanciar = valor_total_centavos - entrada_centavos;
        const i = juros_percentual / 100;
        let valorParcela: number;

        if (i > 0) {
            const fator = Math.pow(1 + i, num_parcelas);
            valorParcela = Math.round(valorFinanciar * (i * fator) / (fator - 1));
        } else {
            valorParcela = Math.round(valorFinanciar / num_parcelas);
        }

        const hoje = new Date();
        const parcelas: Array<{
            numero_parcela: number;
            valor_centavos: number;
            vencimento: string;
        }> = [];

        for (let p = 1; p <= num_parcelas; p++) {
            const venc = new Date(hoje);
            venc.setMonth(venc.getMonth() + p);
            if (venc.getDate() !== hoje.getDate()) {
                venc.setDate(0);
            }

            const valor = p === num_parcelas
                ? valorFinanciar - (valorParcela * (num_parcelas - 1))
                : valorParcela;

            parcelas.push({
                numero_parcela: p,
                valor_centavos: Math.max(valor, 0),
                vencimento: venc.toISOString().split("T")[0],
            });
        }

        // 3. Criar o registro do crediário
        const { data: crediario, error: crediarioErr } = await (supabaseAdmin.from("crediarios") as any)
            .insert({
                empresa_id,
                cliente_id,
                venda_id: venda_id || null,
                valor_total_centavos,
                entrada_centavos,
                num_parcelas,
                tipo,
                juros_percentual,
                multa_percentual,
                observacoes,
                status: "ativo",
            })
            .select()
            .single();

        if (crediarioErr) throw crediarioErr;

        // 4. Se EfíBank, criar carnê via API
        let efibankData: any = null;

        if (tipo === "efibank") {
            try {
                // Buscar credenciais da EfíBank
                const { data: configData } = await (supabaseAdmin.from("configuracoes") as any)
                    .select("valor")
                    .eq("empresa_id", empresa_id)
                    .eq("chave", "efibank_credentials")
                    .single();

                if (configData?.valor) {
                    const creds = configData.valor;
                    const config: EfiBankConfig = {
                        clientId: creds.client_id,
                        clientSecret: creds.client_secret,
                        sandbox: creds.sandbox ?? true,
                    };

                    // Buscar dados do cliente
                    const { data: cliente } = await (supabaseAdmin.from("clientes") as any)
                        .select("*")
                        .eq("id", cliente_id)
                        .single();

                    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/efibank/webhook`;

                    const carneParams: CriarCarneParams = {
                        items: [{
                            name: `Crediário #${crediario.numero}`,
                            value: valorParcela,
                            amount: 1,
                        }],
                        customer: {
                            name: cliente?.nome || "Cliente",
                            cpf: cliente?.cpf_cnpj?.replace(/\D/g, ""),
                            email: cliente?.email,
                            phone_number: cliente?.telefone?.replace(/\D/g, ""),
                        },
                        expire_at: parcelas[0].vencimento,
                        repeats: num_parcelas,
                        split_items: false,
                        configurations: {
                            fine: Math.round(multa_percentual * 100),
                            interest: Math.round(juros_percentual * 33.33),
                        },
                        message: `Crediário #${crediario.numero} - ${observacoes || ""}`.trim(),
                        metadata: {
                            custom_id: `crediario_${crediario.id}`,
                            notification_url: webhookUrl,
                        },
                    };

                    efibankData = await criarCarne(config, carneParams);

                    // Atualizar crediário com ID do carnê
                    await (supabaseAdmin.from("crediarios") as any)
                        .update({ efibank_carnet_id: efibankData.data.carnet_id })
                        .eq("id", crediario.id);
                }
            } catch (efiErr: any) {
                console.error("EfíBank error (continuando com parcelas locais):", efiErr.message);
            }
        }

        // 5. Inserir parcelas no banco
        const parcelasInsert = parcelas.map((p, idx) => {
            const efibankCharge = efibankData?.data?.charges?.[idx];
            return {
                crediario_id: crediario.id,
                empresa_id,
                numero_parcela: p.numero_parcela,
                valor_centavos: p.valor_centavos,
                vencimento: p.vencimento,
                status: "pendente",
                efibank_charge_id: efibankCharge?.charge_id || null,
                efibank_barcode: efibankCharge?.barcode || null,
                efibank_link: efibankCharge?.url || efibankCharge?.parcel_link || null,
                efibank_pix_qrcode: efibankCharge?.pix?.qrcode || null,
            };
        });

        const { error: parcelasErr } = await (supabaseAdmin.from("crediario_parcelas") as any)
            .insert(parcelasInsert);

        if (parcelasErr) throw parcelasErr;

        return NextResponse.json({
            success: true,
            crediario_id: crediario.id,
            crediario_numero: crediario.numero,
            parcelas: parcelas.length,
            efibank: efibankData ? { carnet_id: efibankData.data.carnet_id } : null,
        });

    } catch (error: any) {
        console.error("Erro ao criar crediário:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
