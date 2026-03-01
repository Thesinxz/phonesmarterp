
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

    // Lógica 1: Margem % (Markup Inverso sobre Preço de Venda)
    // Preço = Custo / (1 - Margem% - Imposto% - Gateway%)
    if (marginType === "porcentagem") {
        const divisor = 1 - taxaMargem - taxaImposto - taxaGw;
        // Proteção contra divisor zero ou negativo (margem impossível)
        return divisor > 0.001 ? cost / divisor : cost * 10; // Retorna valor alto para alertar erro
    }

    // Lógica 2: Margem Fixa R$ (Lucro Líquido no Bolso)
    // Preço = (Custo + MargemFixa) / (1 - Imposto% - Gateway%)
    else {
        const divisor = 1 - taxaImposto - taxaGw;
        return divisor > 0.001 ? (cost + margemReais) / divisor : (cost + margemReais) * 10;
    }
}
