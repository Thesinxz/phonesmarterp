/**
 * Normaliza o nome do modelo: minúsculas, sem caracteres especiais, espaços por hífens.
 */
export function normalizeDeviceModel(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}
