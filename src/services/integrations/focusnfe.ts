import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

const supabase = createClient();

// URL da FocusNFe (Homologação ou Produção)
const FOCUS_API_URL = "https://homologacao.focusnfe.com.br/v2"; // Default para dev

interface FocusConfig {
    token: string;
    ambiente: "producao" | "homologacao";
}

export async function getFocusConfig(): Promise<FocusConfig | null> {
    const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "focus_nfe")
        .single() as { data: any };

    if (!data) return null;
    return data.valor as FocusConfig;
}

export async function emitirNFCe(vendaId: string) {
    // 1. Buscar configuração
    const config = await getFocusConfig();
    if (!config) throw new Error("FocusNFe não configurada.");

    // 2. Buscar dados da venda e itens
    const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .select(`
            *,
            cliente:clientes(*),
            itens:venda_itens(
                *,
                produto:produtos(*)
            )
        `)
        .eq("id", vendaId)
        .single() as { data: any; error: any };

    if (vendaError || !venda) throw new Error("Venda não encontrada.");

    // 3. Montar payload do JSON da FocusNFe
    // Nota: Isso é um exemplo simplificado. O payload real é complexo.
    const payload = {
        natureza_operacao: "Venda ao Consumidor",
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        finalidade_emissao: 1, // Normal
        consumidor_final: 1, // Sim
        presenca_comprador: 1, // Presencial
        itens: venda.itens.map((item: any, index: number) => ({
            numero_item: index + 1,
            codigo_produto: item.produto.codigo_barras || item.produto.id.substring(0, 10),
            descricao: item.produto.nome,
            codigo_ncm: "85171231", // Exemplo: Celular (Isso deve vir do cadastro do produto)
            cfop: "5102", // Venda de mercadoria adquirida de terceiros
            unidade_comercial: "UN",
            quantidade_comercial: item.quantidade,
            valor_unitario_comercial: item.preco_unitario_centavos / 100,
            valor_bruto: item.total_centavos / 100,
            origem: 0, // Nacional
            icms_situacao_tributaria: "102", // Simples Nacional (Exemplo)
        })),
        formas_pagamento: [
            {
                forma_pagamento: venda.forma_pagamento === "dinheiro" ? "01" :
                    venda.forma_pagamento === "cartao" ? "03" : "99",
                valor_pagamento: venda.total_centavos / 100
            }
        ]
    };

    // 4. Enviar para FocusNFe (Mock por enquanto)
    const url = config.ambiente === "producao"
        ? "https://api.focusnfe.com.br/v2/nfce"
        : "https://homologacao.focusnfe.com.br/v2/nfce";

    // Aqui faríamos o fetch real
    // const response = await fetch(url + "?ref=" + vendaId, {
    //     method: "POST",
    //     headers: { Authorization: "Basic " + btoa(config.token + ":") },
    //     body: JSON.stringify(payload)
    // });

    logger.log("Enviando NFCe para Focus:", url, payload);

    return { status: "enviado_homologacao", ref: vendaId };
}
