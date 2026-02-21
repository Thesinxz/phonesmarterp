export interface NFeData {
    chave_acesso: string;
    fornecedor_cnpj: string;
    fornecedor_nome: string;
    valor_total_centavos: number;
    data_emissao: string;
    itens: {
        descricao: string;
        quantidade: number;
        valor_unitario_centavos: number;
        valor_total_centavos: number;
    }[];
}

export async function parseNfeXml(xmlString: string): Promise<NFeData> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Verifica se houve erro de parse
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        throw new Error("Erro ao ler o arquivo XML: " + parseError[0].textContent);
    }

    // Acessa o nó principal infNFe
    const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
    if (!infNFe) {
        throw new Error("Arquivo XML inválido, não parece ser uma NFe (tag infNFe não encontrada).");
    }

    const chave_acesso = infNFe.getAttribute("Id")?.replace("NFe", "") || "";

    // Pega dados do Emitente (Fornecedor)
    const emit = xmlDoc.getElementsByTagName("emit")[0];
    const fornecedor_cnpj = emit?.getElementsByTagName("CNPJ")[0]?.textContent || "";
    const fornecedor_nome = emit?.getElementsByTagName("xNome")[0]?.textContent || "";

    // Pega dados da Ide (Data Emissão)
    const ide = xmlDoc.getElementsByTagName("ide")[0];
    const data_emissao = ide?.getElementsByTagName("dhEmi")[0]?.textContent?.split('T')[0] || new Date().toISOString().split('T')[0];

    // Pega Totais
    const ICMSTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
    const vNF = ICMSTot?.getElementsByTagName("vNF")[0]?.textContent || "0";
    const valor_total_centavos = Math.round(parseFloat(vNF) * 100);

    // Pega Itens (opcional para visualização prévia, no futuro bom p/ estoque)
    const detNodes = xmlDoc.getElementsByTagName("det");
    const itens = [];
    for (let i = 0; i < detNodes.length; i++) {
        const prod = detNodes[i].getElementsByTagName("prod")[0];
        if (prod) {
            const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
            const qCom = prod.getElementsByTagName("qCom")[0]?.textContent || "0";
            const vUnCom = prod.getElementsByTagName("vUnCom")[0]?.textContent || "0";
            const vProd = prod.getElementsByTagName("vProd")[0]?.textContent || "0";

            itens.push({
                descricao: xProd,
                quantidade: parseFloat(qCom),
                valor_unitario_centavos: Math.round(parseFloat(vUnCom) * 100),
                valor_total_centavos: Math.round(parseFloat(vProd) * 100)
            });
        }
    }

    return {
        chave_acesso,
        fornecedor_cnpj,
        fornecedor_nome,
        valor_total_centavos,
        data_emissao,
        itens
    };
}
