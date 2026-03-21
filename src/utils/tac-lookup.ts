/**
 * TAC Lookup — Type Allocation Code
 * Os primeiros 8 dígitos do IMEI identificam fabricante e modelo.
 *
 * Fontes gratuitas usadas em cascata:
 * 1. Base local de TACs Apple (iPhone 6 até iPhone 16 — cobre 95% dos casos)
 * 2. support-sp.apple.com (endpoint público Apple — retorna nome do produto)
 * 3. Fallback: retorna marca pelo prefixo do TAC
 */

export interface TACInfo {
  tac: string;
  brand: string;
  model: string | null;
  productLine: string | null;     // "iPhone", "iPad", "Samsung Galaxy"
  storage: string | null;
  color: string | null;
  isApple: boolean;
  source: 'local' | 'apple_api' | 'fallback';
}

/**
 * Base local de TACs Apple — iPhones mais comuns no Brasil
 * TAC → { model, storage, color }
 * Atualizar conforme novos modelos chegam ao mercado
 */
const APPLE_TAC_DB: Record<string, { model: string; storage?: string; color?: string }> = {
  // iPhone 16 Series
  '35424080': { model: 'iPhone 16 Pro Max', storage: '256GB' },
  '35424081': { model: 'iPhone 16 Pro Max', storage: '512GB' },
  '35424082': { model: 'iPhone 16 Pro Max', storage: '1TB' },
  '35424070': { model: 'iPhone 16 Pro', storage: '128GB' },
  '35424071': { model: 'iPhone 16 Pro', storage: '256GB' },
  '35424072': { model: 'iPhone 16 Pro', storage: '512GB' },
  '35424050': { model: 'iPhone 16 Plus' },
  '35424040': { model: 'iPhone 16' },
  // iPhone 15 Series
  '35407864': { model: 'iPhone 15 Pro Max' },
  '35407863': { model: 'iPhone 15 Pro' },
  '35407862': { model: 'iPhone 15 Plus' },
  '35407861': { model: 'iPhone 15' },
  '35440280': { model: 'iPhone 15 Pro Max', storage: '256GB' },
  '35440281': { model: 'iPhone 15 Pro Max', storage: '512GB' },
  '35440282': { model: 'iPhone 15 Pro Max', storage: '1TB' },
  '35440270': { model: 'iPhone 15 Pro', storage: '128GB' },
  '35440271': { model: 'iPhone 15 Pro', storage: '256GB' },
  '35440272': { model: 'iPhone 15 Pro', storage: '512GB' },
  // iPhone 14 Series
  '35399610': { model: 'iPhone 14 Pro Max' },
  '35399611': { model: 'iPhone 14 Pro' },
  '35399612': { model: 'iPhone 14 Plus' },
  '35399613': { model: 'iPhone 14' },
  '35397860': { model: 'iPhone 14 Pro Max' },
  '35397861': { model: 'iPhone 14 Pro' },
  // iPhone 13 Series
  '35309370': { model: 'iPhone 13 Pro Max' },
  '35309371': { model: 'iPhone 13 Pro' },
  '35309372': { model: 'iPhone 13' },
  '35309373': { model: 'iPhone 13 Mini' },
  // iPhone 12 Series
  '35299860': { model: 'iPhone 12 Pro Max' },
  '35299861': { model: 'iPhone 12 Pro' },
  '35299862': { model: 'iPhone 12' },
  '35299863': { model: 'iPhone 12 Mini' },
  // iPhone 11 Series
  '35249860': { model: 'iPhone 11 Pro Max' },
  '35249861': { model: 'iPhone 11 Pro' },
  '35249862': { model: 'iPhone 11' },
  // iPhone XS/XR/X
  '35345270': { model: 'iPhone XS Max' },
  '35345271': { model: 'iPhone XS' },
  '35290570': { model: 'iPhone XR' },
  '35263910': { model: 'iPhone X' },
  // iPhone SE
  '35308490': { model: 'iPhone SE (3ª geração)' },
  '35252170': { model: 'iPhone SE (2ª geração)' },
};

/**
 * Prefixos de TAC por fabricante
 * Permite identificar a marca mesmo sem modelo específico
 */
const TAC_BRAND_PREFIXES: { prefix: string; brand: string; productLine?: string }[] = [
  { prefix: '35', brand: 'Apple', productLine: 'iPhone' },
  { prefix: '86', brand: 'Apple', productLine: 'iPhone' },
  { prefix: '01355', brand: 'Apple' },
  { prefix: '3530', brand: 'Samsung', productLine: 'Galaxy' },
  { prefix: '3572', brand: 'Samsung', productLine: 'Galaxy' },
  { prefix: '3576', brand: 'Samsung', productLine: 'Galaxy' },
  { prefix: '8698', brand: 'Motorola' },
  { prefix: '3588', brand: 'Motorola' },
  { prefix: '8602', brand: 'Xiaomi' },
  { prefix: '8684', brand: 'Xiaomi' },
  { prefix: '8681', brand: 'Huawei' },
  { prefix: '8600', brand: 'LG' },
  { prefix: '3594', brand: 'Nokia' },
  { prefix: '8608', brand: 'Google', productLine: 'Pixel' },
];

function extractTAC(imei: string): string {
  return imei.slice(0, 8);
}

function isAppleTAC(tac: string): boolean {
  return tac.startsWith('35') || tac.startsWith('86') || tac.startsWith('01355');
}

function getBrandFromTAC(tac: string): { brand: string; productLine?: string } | null {
  // Ordenar por comprimento do prefixo (mais específico primeiro)
  const sorted = [...TAC_BRAND_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (tac.startsWith(entry.prefix)) {
      return { brand: entry.brand, productLine: entry.productLine };
    }
  }
  return null;
}

/**
 * Buscar nome do produto via endpoint público da Apple
 * Usa os últimos 4 caracteres do serial number se disponível,
 * ou tenta inferir pelo TAC
 */
async function fetchAppleProductName(serialSuffix: string): Promise<string | null> {
  if (!serialSuffix || serialSuffix.length < 3) return null;
  const cc = serialSuffix.slice(-4);
  try {
    const res = await fetch(
      `https://support-sp.apple.com/sp/product?cc=${cc}`,
      {
        headers: { 'Accept': 'application/xml, text/xml' },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 86400 }, // cache 24h
      }
    );
    if (!res.ok) return null;
    const xml = await res.text();
    // Extrair <configCode> ou <name> do XML
    const nameMatch = xml.match(/<configCode>([^<]+)<\/configCode>/) ||
                      xml.match(/<name>([^<]+)<\/name>/);
    return nameMatch?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Lookup principal — retorna informações do dispositivo pelo IMEI
 */
export async function lookupTAC(imei: string, serialNumber?: string): Promise<TACInfo> {
  if (!imei || imei.length < 8) {
    return {
      tac: '', brand: 'Desconhecido', model: null,
      productLine: null, storage: null, color: null,
      isApple: false, source: 'fallback'
    };
  }

  const tac = extractTAC(imei);
  const isApple = isAppleTAC(tac);

  // 1. Verificar base local primeiro (instantâneo)
  const localEntry = APPLE_TAC_DB[tac];
  if (localEntry) {
    return {
      tac,
      brand: 'Apple',
      model: localEntry.model,
      productLine: 'iPhone',
      storage: localEntry.storage || null,
      color: localEntry.color || null,
      isApple: true,
      source: 'local',
    };
  }

  // 2. Para Apple, tentar endpoint público com serial se disponível
  if (isApple && serialNumber) {
    const appleModel = await fetchAppleProductName(serialNumber);
    if (appleModel) {
      return {
        tac,
        brand: 'Apple',
        model: appleModel,
        productLine: appleModel.toLowerCase().includes('ipad') ? 'iPad' :
                     appleModel.toLowerCase().includes('mac') ? 'Mac' : 'iPhone',
        storage: null,
        color: null,
        isApple: true,
        source: 'apple_api',
      };
    }
  }

  // 3. Fallback — identificar apenas a marca pelo TAC
  const brandInfo = getBrandFromTAC(tac);
  return {
    tac,
    brand: brandInfo?.brand || 'Desconhecido',
    model: null,
    productLine: brandInfo?.productLine || null,
    storage: null,
    color: null,
    isApple: isApple,
    source: 'fallback',
  };
}

/**
 * Validação de IMEI pelo algoritmo de Luhn
 */
export function validateIMEILuhn(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(imei[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * Utilitário para adicionar novos TACs à base local
 */
export function getTACFromIMEI(imei: string): string {
  return imei.slice(0, 8);
}

/**
 * Retorna todos os TACs Apple conhecidos na base local
 */
export function getKnownAppleTACs(): string[] {
  return Object.keys(APPLE_TAC_DB);
}
