/**
 * Product Pricing Engine
 * 
 * Função centralizada que calcula TODOS os preços de um produto
 * baseado na categoria, config financeira e gateway de pagamento.
 */

import type { FinanceiroConfig, PaymentGateway, CategoriaMargin } from "@/types/configuracoes";

export interface ProductPrices {
    precoBase: number;           // centavos — preço de venda sem taxa de gateway
    precoPix: number;            // centavos — preço no Pix (= preço base)
    precoDebito: number;         // centavos — com taxa débito
    parcelas: ParcelaCalc[];
    margem: {
        valorCentavos: number;   // quanto lucra em centavos
        percentual: number;      // margem efetiva %
    };
    impostoCentavos: number;     // valor do imposto
    nfObrigatoria: boolean;
    garantiaDias: number;
    categoriaNome: string | null;
}

export interface ParcelaCalc {
    qtd: number;
    valorParcela: number;    // centavos
    valorTotal: number;      // centavos
    taxa: number;            // %
}

/**
 * Calcula todos os preços de venda de um produto.
 * 
 * @param custoCentavos - Custo do produto em centavos
 * @param precoVendaCentavos - Preço de venda já definido (se houver). Se 0, calcula automaticamente.
 * @param categoriaNome - Nome da categoria (ex: "Smartphone")
 * @param config - Configuração financeira (categorias, impostos)
 * @param gateway - Gateway de pagamento selecionado (taxas Pix, débito, crédito)
 * @param maxParcelas - Máximo de parcelas a calcular (default: 12)
 */
export function calculateProductPrices(
    custoCentavos: number,
    precoVendaCentavos: number,
    categoriaNome: string | null,
    config: FinanceiroConfig,
    gateway: PaymentGateway,
    maxParcelas: number = 12
): ProductPrices {
    // Buscar categoria
    const categoria = categoriaNome
        ? config.categorias.find(c => c.nome === categoriaNome) ?? null
        : null;

    // Se a categoria tiver um gateway padrão específico, usamos ele preferencialmente
    const effectiveGateway = (categoria?.default_gateway_id && config.gateways)
        ? (config.gateways.find(g => g.id === categoria.default_gateway_id) || gateway)
        : gateway;

    const margem = categoria?.margem_padrao ?? 0;
    const tipoMargem = categoria?.tipo_margem ?? "porcentagem";
    const nfObrigatoria = categoria?.nf_obrigatoria ?? config.nf_obrigatoria ?? true;
    const garantiaDias = categoria?.garantia_padrao_dias ?? 90;
    const impostoPct = nfObrigatoria ? config.taxa_nota_fiscal_pct : 0;

    // Calcular preço base (sem taxa do gateway)
    let precoBase: number;

    if (precoVendaCentavos > 0) {
        // Preço já definido manualmente
        precoBase = precoVendaCentavos;
    } else if (custoCentavos > 0 && margem > 0) {
        // Calcular automaticamente com markup reverso
        if (tipoMargem === "porcentagem") {
            const divisor = 1 - (margem / 100) - (impostoPct / 100);
            precoBase = divisor > 0.001 ? Math.round(custoCentavos / divisor) : custoCentavos * 2;
        } else {
            // Margem fixa em reais (converter para centavos)
            const margemCentavos = margem * 100;
            const divisor = 1 - (impostoPct / 100);
            precoBase = divisor > 0.001
                ? Math.round((custoCentavos + margemCentavos) / divisor)
                : custoCentavos + margemCentavos;
        }
    } else {
        precoBase = custoCentavos; // Fallback: sem margem, vende pelo custo
    }

    // Preço Pix = preço base (sem acréscimo de gateway)
    const precoPix = precoBase;

    // Preço Débito = com acréscimo da taxa de débito
    const taxaDebito = effectiveGateway.taxa_debito_pct ?? 0;
    const precoDebito = taxaDebito > 0
        ? Math.round(precoBase / (1 - taxaDebito / 100))
        : precoBase;

    // Parcelas: acréscimo da taxa de crédito para cada parcela
    const taxasCredito = effectiveGateway.taxas_credito ?? [];
    const numParcelas = Math.min(maxParcelas, taxasCredito.length);
    const parcelas: ParcelaCalc[] = [];

    for (let i = 0; i < numParcelas; i++) {
        const taxa = taxasCredito[i]?.taxa ?? 0;
        const valorTotal = taxa > 0
            ? Math.round(precoBase / (1 - taxa / 100))
            : precoBase;
        const valorParcela = Math.round(valorTotal / (i + 1));

        parcelas.push({
            qtd: i + 1,
            valorParcela,
            valorTotal,
            taxa,
        });
    }

    // Calcular margem efetiva
    const impostoCentavos = Math.round(precoBase * (impostoPct / 100));
    const margemCentavos = precoBase - custoCentavos - impostoCentavos;
    const margemPercentual = precoBase > 0
        ? Math.round((margemCentavos / precoBase) * 10000) / 100  // 2 casas decimais
        : 0;

    return {
        precoBase,
        precoPix,
        precoDebito,
        parcelas,
        margem: {
            valorCentavos: margemCentavos,
            percentual: margemPercentual,
        },
        impostoCentavos,
        nfObrigatoria,
        garantiaDias,
        categoriaNome,
    };
}

/**
 * Calcula o preço de venda sugerido baseado no custo e categoria (Legado).
 */
export function calculateSuggestedPrice(
    custoCentavos: number,
    categoria: CategoriaMargin | null,
    impostoPct: number
): number {
    if (!categoria || custoCentavos <= 0) return custoCentavos;

    const margem = categoria.margem_padrao;
    const tipoMargem = categoria.tipo_margem;
    const taxaImposto = categoria.nf_obrigatoria ? impostoPct : 0;

    if (tipoMargem === "porcentagem") {
        const divisor = 1 - (margem / 100) - (taxaImposto / 100);
        return divisor > 0.001 ? Math.round(custoCentavos / divisor) : custoCentavos * 2;
    } else {
        const margemCentavos = margem * 100;
        const divisor = 1 - (taxaImposto / 100);
        return divisor > 0.001
            ? Math.round((custoCentavos + margemCentavos) / divisor)
            : custoCentavos + margemCentavos;
    }
}

/**
 * Calcula o preço de venda sugerido baseado no custo e segmento (Novo Sistema).
 */
export function calculateSuggestedPriceBySegment(
    custoCentavos: number,
    segment: { default_margin: number } | null,
    impostoPct: number
): number {
    if (!segment || custoCentavos <= 0) return custoCentavos;
    
    // Margem já vem em centavos
    const margemCentavos = segment.default_margin;
    
    // Preço = (Custo + Margem) / (1 - Imposto%)
    const divisor = 1 - (impostoPct / 100);
    return divisor > 0.001
        ? Math.ceil((custoCentavos + margemCentavos) / divisor)
        : custoCentavos + margemCentavos;
}
