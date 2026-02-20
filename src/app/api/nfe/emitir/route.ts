import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { vendaId } = body;

        console.log(`[FISCAL] Iniciando emissão de NFC-e para venda ${vendaId}`);

        // Simulação de processamento SEFAZ
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock de resposta de sucesso
        return NextResponse.json({
            success: true,
            status: 'autorizada',
            nfe_chave: '35230910538000000155650010000012341234567890',
            protocolo: '135230000123456',
            mensagem: 'NFC-e autorizada com sucesso pelo SEFAZ'
        });

    } catch (error) {
        console.error('[FISCAL] Erro na emissão:', error);
        return NextResponse.json({
            success: false,
            error: 'Erro interno na comunicação com o WebService da SEFAZ.'
        }, { status: 500 });
    }
}
