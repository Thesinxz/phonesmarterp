
/**
 * Utilitário de Precificação Centralizado (Profit Max Engine)
 * Lógica de Markup Reverso para garantir margem líquida.
 */

export interface PricingParams {
    cost: number;           // Custo final do produto (BRL)
    margin: number;         // Valor da margem (ex: 25 para 25% ou 500 para R$ 500)
    marginType: 'porcentagem' | 'fixo';
    impostoPct: number;     // Porcentagem de imposto (ex: 4 para 4%)
    gatewayPct: number;     // Porcentagem do gateway (ex: 3.5 para 3.5%)
}

export function calculateReverseMarkup(cost: number, margin: number, marginType: 'porcentagem' | 'fixo', impostoPct: number, gatewayPct: number): number {
    const taxaMargem = marginType === "porcentagem" ? margin / 100 : 0;
    const margemReais = marginType === "fixo" ? margin : 0;
    const taxaImposto = impostoPct / 100;
    const taxaGw = gatewayPct / 100;

    const divisorImpostos = 1 - taxaImposto - taxaGw;

    // Proteção contra divisor zero (caso improvável de taxas somarem 100%)
    if (divisorImpostos <= 0.001) return cost * 2;

    // Lógica 1: Markup sobre o Custo (% sobre o que você pagou)
    // Preço = [Custo * (1 + %Markup)] / (1 - %Impostos)
    // Isso garante exatamente o lucro desejado sobre o custo, cobrindo os impostos sobre a venda.
    if (marginType === "porcentagem") {
        return (cost * (1 + taxaMargem)) / divisorImpostos;
    }

    // Lógica 2: Margem Fixa R$ (Lucro Líquido no Bolso)
    // Preço = (Custo + MargemFixa) / (1 - %Impostos)
    else {
        return (cost + margemReais) / divisorImpostos;
    }
}
