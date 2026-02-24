import JSZip from 'jszip';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

interface XmlFile {
    filename: string;
    content: string; // XML string
}

interface AggregatedPackage {
    zipBuffer: Buffer;
    stats: {
        nfe_count: number;
        nfce_count: number;
        total: number;
    };
}

/**
 * Agrega todos os XMLs autorizados de uma empresa em um período e retorna um ZIP.
 */
export async function aggregateXmlsForMonth(
    empresaId: string,
    ano: number,
    mes: number
): Promise<AggregatedPackage> {
    const supabase = getSupabaseAdmin();

    // Período: primeiro até último dia do mês
    const startDate = new Date(ano, mes - 1, 1).toISOString();
    const endDate = new Date(ano, mes, 0, 23, 59, 59).toISOString();

    // Buscar vendas com XMLs autorizados no período
    const { data: vendas, error } = await supabase
        .from('vendas')
        .select('id, numero_nfe, tipo_nfe, xml_autorizado, created_at')
        .eq('empresa_id', empresaId)
        .in('status_fiscal', ['autorizada'])
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .not('xml_autorizado', 'is', null);

    if (error) throw error;

    const zip = new JSZip();
    const nfeFolder = zip.folder('NFe')!;
    const nfceFolder = zip.folder('NFCe')!;

    let nfe_count = 0;
    let nfce_count = 0;

    (vendas || []).forEach((venda: any) => {
        if (!venda.xml_autorizado) return;

        const filename = `${venda.numero_nfe || venda.id}.xml`;

        if (venda.tipo_nfe === 'nfce' || venda.tipo_nfe === '65') {
            nfceFolder.file(filename, venda.xml_autorizado);
            nfce_count++;
        } else {
            nfeFolder.file(filename, venda.xml_autorizado);
            nfe_count++;
        }
    });

    // Se não há arquivos, retornar zip vazio com README
    if (nfe_count === 0 && nfce_count === 0) {
        zip.file('LEIA-ME.txt', `Nenhuma nota fiscal autorizada encontrada para o período ${mes.toString().padStart(2, '0')}/${ano}.`);
    }

    const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
    });

    return {
        zipBuffer: zipBuffer as Buffer,
        stats: {
            nfe_count,
            nfce_count,
            total: nfe_count + nfce_count,
        },
    };
}

/**
 * Retorna o nome do mês em português.
 */
export function getNomeMes(mes: number): string {
    const nomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return nomes[mes - 1] || '';
}
