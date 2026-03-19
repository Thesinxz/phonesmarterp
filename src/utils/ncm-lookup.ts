/**
 * Utilitário simples para sugestão de NCM baseado em palavras-chave.
 * Melhora a experiência de cadastro e edição de produtos/peças.
 */

const NCM_MAP: Record<string, string> = {
  'celular': '85171231',
  'smartphone': '85171231',
  'iphone': '85171231',
  'tela': '85177010',
  'display': '85177010',
  'lcd': '85177010',
  'bateria': '85076000',
  'conector': '85444200',
  'cabo': '85444200',
  'carregador': '85044010',
  'tampa': '39269090',
  'camera': '85258019',
  'alto falante': '85182100',
  'auricular': '85183000',
  'fone': '85183000',
  'acessorio': '39269090',
  'pelicula': '39199090',
  'capinha': '39269090',
  'capa': '39269090',
};

export function suggestNCM(name: string): string | null {
  const lowerName = name.toLowerCase();
  
  // Busca por palavra-chave exata ou contida
  for (const [key, ncm] of Object.entries(NCM_MAP)) {
    if (lowerName.includes(key)) {
      return ncm;
    }
  }
  
  return null;
}

export function getAllCommonNCMs() {
    return NCM_MAP;
}
