/**
 * Utilitários de sanitização para prevenir XSS e injeção em inputs de texto.
 */

/**
 * Remove tags HTML e caracteres potencialmente perigosos de uma string.
 * Seguro para uso em campos de texto livre (nomes, buscas, descrições).
 */
export function sanitizeInput(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
        // Remove tags HTML
        .replace(/<[^>]*>/g, "")
        // Remove entidades HTML maliciosas
        .replace(/&(?:lt|gt|amp|quot|apos|#\d+|#x[\da-f]+);?/gi, "")
        // Remove caracteres de controle (exceto newline e tab)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        // Trim whitespace excessivo
        .trim();
}

/**
 * Sanitiza um objeto inteiro, processando todos os campos string recursivamente.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
        if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
            const value = sanitized[key];
            if (typeof value === "string") {
                (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
            } else if (value && typeof value === "object" && !Array.isArray(value)) {
                (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
            }
        }
    }

    return sanitized;
}

/**
 * Valida e sanitiza um telefone brasileiro (aceita +55, (XX), etc).
 */
export function sanitizePhone(phone: string): string {
    if (!phone) return "";
    return phone.replace(/[^\d+() -]/g, "").trim();
}

/**
 * Sanitiza um email (lowercase, trim, validação básica).
 */
export function sanitizeEmail(email: string): string {
    if (!email) return "";
    const cleaned = email.toLowerCase().trim();
    // Validação básica de formato
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return "";
    return cleaned;
}
