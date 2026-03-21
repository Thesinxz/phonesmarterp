export interface SickwParsedData {
  imei: string;
  imei2?: string | null;
  meid?: string | null;
  serialNumber?: string | null;
  modelDescription?: string | null;
  model?: string | null;
  purchaseDate?: string | null;
  warrantyStatus?: string | null;
  demoUnit?: string | null;
  replacedDevice?: string | null;
  refurbishedDevice?: string | null;
  purchaseCountry?: string | null;
  lockedCarrier?: string | null;
  simLockStatus?: string | null;
  orderNumber?: string | null;
  verificationDate?: string | null;
}

/**
 * Filtra se o dispositivo está "Clean" ou similar
 */
export function isDeviceClean(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('clean') || s.includes('limpo') || s.includes('off') || s.includes('desativado');
}

/**
 * Retorna label amigável para status de garantia
 */
export function warrantyLabel(status: string | null | undefined): string {
  if (!status) return 'N/A';
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes('ativa')) return 'Ativa';
  if (s.includes('expired') || s.includes('expirada')) return 'Expirada';
  return status;
}

/**
 * Parser para formato específico do Sickw (colado da web)
 */
export function parseSickwText(raw: string): SickwParsedData | null {
  if (!raw?.trim() || !raw.toLowerCase().includes('sickw')) return null;

  const extract = (label: string): string | null => {
    const re = new RegExp(`${label}[:\\s]+([^\\n\\r]+)`, 'i');
    const m = raw.match(re);
    return m ? m[1].trim() : null;
  };

  const imei = extract('IMEI') || extract('IMEI 1');
  if (!imei || !/^\d{15}$/.test(imei)) return null;

  return {
    imei,
    imei2: extract('IMEI 2'),
    serialNumber: extract('Serial Number') || extract('Serial'),
    modelDescription: extract('Model Description') || extract('Description'),
    model: extract('Model'),
    purchaseDate: extract('Purchase Date'),
    warrantyStatus: extract('Warranty Status') || extract('Warranty'),
    icloudStatus: extract('iCloud Status') as any, // Adicionado para compatibilidade se necessário
    lockedCarrier: extract('Locked Carrier') || extract('Carrier'),
    simLockStatus: extract('Sim Lock Status') || extract('Sim-Lock'),
  } as any;
}

/**
 * Parser genérico — tenta extrair IMEI e campos comuns
 * de qualquer formato de resultado de verificação
 */
export function parseGenericIMEIText(raw: string): SickwParsedData | null {
  if (!raw?.trim()) return null;

  // Tentar o parser do Sickw primeiro (mais completo)
  const sickwResult = parseSickwText(raw);
  if (sickwResult) return sickwResult;

  // IMEI obrigatório
  const imeiMatch = raw.match(/\bIMEI[:\s#]+(\d{15})/i) ||
                    raw.match(/\b(\d{15})\b/);
  if (!imeiMatch) return null;

  // Extração genérica — funciona com imei.info e outros formatos
  const extract = (labels: string[]): string | null => {
    for (const label of labels) {
      const re = new RegExp(`${label}[:\\s]+([^\\n\\r]+)`, 'i');
      const m = raw.match(re);
      if (m) {
        const v = m[1].trim().replace(/\*+/g, '').trim();
        if (v && v !== '-' && v.toLowerCase() !== 'n/a') return v;
      }
    }
    return null;
  };

  return {
    imei: imeiMatch[1],
    imei2: extract(['IMEI2', 'IMEI 2', 'Secondary IMEI']),
    meid: extract(['MEID']),
    serialNumber: extract(['Serial Number', 'Serial', 'S/N', 'SN']),
    modelDescription: extract(['Model Description', 'Device', 'Product', 'Description']),
    model: extract(['Model', 'Device Model', 'Apple Model']),
    purchaseDate: extract(['Purchase Date', 'Estimated Purchase', 'Activation Date', 'Sale Date']),
    warrantyStatus: extract(['Warranty', 'Warranty Status', 'Coverage', 'AppleCare']),
    demoUnit: extract(['Demo', 'Demo Unit']),
    replacedDevice: extract(['Replaced', 'Replaced Device']),
    refurbishedDevice: extract(['Refurbished', 'Refurb']),
    purchaseCountry: extract(['Country', 'Purchase Country', 'Region', 'Origin']),
    lockedCarrier: extract(['Carrier', 'Locked Carrier', 'Network', 'Operator']),
    simLockStatus: extract(['SIM Lock', 'Sim-Lock', 'Lock Status', 'Network Lock']),
    orderNumber: extract(['Order', 'Order ID', 'Order Number']),
    verificationDate: extract(['Date', 'Check Date']),
  };
}
