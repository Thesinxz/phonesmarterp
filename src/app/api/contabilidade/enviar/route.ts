import { NextResponse } from 'next/server';
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { aggregateXmlsForMonth, getNomeMes } from '@/lib/xml-aggregator';
import { sendAccountantEmail } from '@/lib/email';

/**
 * POST /api/contabilidade/enviar
 * 
 * Endpoint chamado pelo Cron (Vercel ou pg_cron) para enviar
 * automaticamente os XMLs do mês anterior para o contador de cada empresa.
 * 
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */
export async function POST(req: Request) {
    try {
        // 1. Autenticação via CRON_SECRET
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const hoje = new Date();
        const diaHoje = hoje.getDate();

        // 2. Determinar o mês de referência (sempre o mês ANTERIOR)
        const mesRef = hoje.getMonth() === 0 ? 12 : hoje.getMonth(); // getMonth() é 0-indexed
        const anoRef = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
        const nomeMes = getNomeMes(mesRef);
        const mesReferencia = `${nomeMes}/${anoRef}`;

        logger.log(`[Contabilidade] ▶ Iniciando envio automático - Dia ${diaHoje} - Ref: ${mesReferencia}`);

        // 3. Buscar todas as empresas com contador habilitado e dia de envio = hoje
        const { data: configs, error: configError } = await supabase
            .from('configuracoes')
            .select('empresa_id, valor')
            .eq('chave', 'contador');

        if (configError) throw configError;

        const empresasParaEnviar = (configs || []).filter((c: any) => {
            const cfg = c.valor;
            return cfg?.enabled && cfg?.email && cfg?.dia_envio === diaHoje;
        });

        if (empresasParaEnviar.length === 0) {
            logger.log('[Contabilidade] ℹ Nenhuma empresa para enviar hoje.');
            return NextResponse.json({
                success: true,
                message: 'Nenhuma empresa configurada para envio hoje.',
                enviados: 0
            });
        }

        logger.log(`[Contabilidade] 📋 ${empresasParaEnviar.length} empresa(s) para processar.`);

        const resultados: any[] = [];

        // 4. Para cada empresa, agregar XMLs e enviar
        for (const config of empresasParaEnviar) {
            const empresaId = config.empresa_id;
            const contadorCfg = config.valor as any;

            try {
                // Buscar nome da empresa
                const { data: empresa } = await supabase
                    .from('empresas')
                    .select('nome')
                    .eq('id', empresaId)
                    .single();

                const empresaNome = empresa?.nome || 'Empresa';

                logger.log(`[Contabilidade] 🏢 Processando: ${empresaNome}`);

                // Agregar XMLs
                const { zipBuffer, stats } = await aggregateXmlsForMonth(
                    empresaId,
                    anoRef,
                    mesRef
                );

                const attachments: { filename: string; content: Buffer }[] = [];

                // Adicionar ZIP apenas se há XMLs (ou se qualquer opção está ativa)
                if (contadorCfg.enviar_xml_nfe || contadorCfg.enviar_xml_nfce) {
                    attachments.push({
                        filename: `XMLs_${empresaNome.replace(/\s+/g, '_')}_${nomeMes}_${anoRef}.zip`,
                        content: zipBuffer,
                    });
                }

                // Enviar email
                const result = await sendAccountantEmail(
                    contadorCfg.email,
                    empresaNome,
                    mesReferencia,
                    attachments
                );

                logger.log(`[Contabilidade] ✅ Enviado para ${contadorCfg.email} - ${stats.total} XMLs`);

                resultados.push({
                    empresa: empresaNome,
                    email: contadorCfg.email,
                    status: 'success',
                    xmls: stats,
                    resend_id: result?.data?.id,
                });

            } catch (err: any) {
                console.error(`[Contabilidade] ❌ Erro ao processar empresa ${empresaId}:`, err);
                resultados.push({
                    empresa_id: empresaId,
                    status: 'error',
                    error: err.message,
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processamento concluído. ${resultados.filter(r => r.status === 'success').length}/${resultados.length} enviados.`,
            referencia: mesReferencia,
            resultados,
        });

    } catch (error: any) {
        console.error('[Contabilidade] 💥 Erro fatal:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro interno no processamento de contabilidade.',
        }, { status: 500 });
    }
}

/**
 * GET /api/contabilidade/enviar
 * Vercel Cron calls GET by default, so we redirect to POST.
 */
export async function GET(req: Request) {
    return POST(req);
}
