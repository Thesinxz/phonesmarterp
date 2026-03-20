/**
 * Utilitários de código de barras para o Phone Smart ERP
 * EAN-13, SKU interno e validação
 */

/**
 * Calcula o dígito verificador EAN-13
 * Fórmula: soma alternando peso 1 e 3, resto de 10
 */
export function calcEAN13CheckDigit(digits12: string): number {
  const d = digits12.split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

/**
 * Gera um EAN-13 válido com prefixo 789 (Brasil)
 * Formato: 789 + 9 dígitos aleatórios + dígito verificador
 */
export function generateEAN13(): string {
  const prefix = '789';
  const random = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  const base12 = prefix + random;
  const check = calcEAN13CheckDigit(base12);
  return base12 + check;
}

/**
 * Valida um EAN-13
 */
export function validateEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const base12 = code.slice(0, 12);
  const check = parseInt(code[12]);
  return calcEAN13CheckDigit(base12) === check;
}

/**
 * Valida um código de barras genérico (EAN-8, EAN-13, Code128, etc.)
 * Aceita qualquer sequência alfanumérica de 4-25 caracteres
 */
export function validateBarcode(code: string): boolean {
  return /^[A-Za-z0-9\-\.]{4,25}$/.test(code);
}

/**
 * Gera SKU interno no formato SMT-XXXXXX
 * Usado para produtos sem EAN oficial
 */
export function generateSKU(prefix = 'SMT'): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${random}`;
}

/**
 * Gera código para peça no formato PCA-TIPO-XXXXXX
 * Ex: PCA-TELA-482910
 */
export function generatePartSKU(partType?: string): string {
  const typePrefix = partType
    ? partType.slice(0, 4).toUpperCase()
    : 'PECA';
  const random = Math.floor(100000 + Math.random() * 900000);
  return `PCA-${typePrefix}-${random}`;
}

/**
 * Normaliza o IMEI para uso como barcode em celulares
 * EAN-13 não aceita 15 dígitos — usar como Code128 / QR apenas
 */
export function imeiToDisplayCode(imei: string): string {
  return imei.replace(/\D/g, '').slice(0, 15);
}

/**
 * Detecta o tipo de código a partir do valor
 */
export function detectCodeType(code: string): 'ean13' | 'sku' | 'imei' | 'unknown' {
  if (/^\d{13}$/.test(code) && validateEAN13(code)) return 'ean13';
  if (/^\d{15}$/.test(code)) return 'imei';
  if (/^(SMT|PCA)-/.test(code)) return 'sku';
  return 'unknown';
}
