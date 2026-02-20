/**
 * Formata um valor em centavos para moeda BRL.
 * Exemplo: formatCurrency(15000) → "R$ 150,00"
 */
export function formatCurrency(centavos: number, options?: { symbol?: string }): string {
    const formatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(centavos / 100);

    if (options?.symbol === '') {
        return formatted.replace(/^R\$\s?/, '').trim();
    }

    return formatted;
}

/**
 * Converte um valor em reais para centavos.
 * Exemplo: toCentavos(150.5) → 15050
 */
export function toCentavos(reais: number): number {
    return Math.round(reais * 100);
}

/**
 * Converte centavos para reais.
 */
export function toReais(centavos: number): number {
    return centavos / 100;
}
