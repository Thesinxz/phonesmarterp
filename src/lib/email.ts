import { Resend } from 'resend';

interface EmailAttachment {
    filename: string;
    content: Buffer;
}

/**
 * Envia um email com anexos via Resend.
 * Usado principalmente para envio automático de XMLs ao contador.
 */
export async function sendAccountantEmail(
    to: string,
    empresaNome: string,
    mesReferencia: string,
    attachments: EmailAttachment[]
) {
    const subject = `[SmartOS] Documentos Fiscais - ${empresaNome} - Ref. ${mesReferencia}`;

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1e293b; font-size: 20px; margin: 0;">📊 Documentos Fiscais</h1>
                    <p style="color: #64748b; font-size: 14px; margin-top: 8px;">${empresaNome}</p>
                </div>
                
                <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.6;">
                        Olá! Segue em anexo o pacote de documentos fiscais referente ao mês de <strong>${mesReferencia}</strong>.
                    </p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b; font-size: 13px;">Empresa</td>
                        <td style="padding: 12px 0; color: #1e293b; font-size: 13px; font-weight: 600; text-align: right;">${empresaNome}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px 0; color: #64748b; font-size: 13px;">Referência</td>
                        <td style="padding: 12px 0; color: #1e293b; font-size: 13px; font-weight: 600; text-align: right;">${mesReferencia}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; color: #64748b; font-size: 13px;">Arquivos</td>
                        <td style="padding: 12px 0; color: #1e293b; font-size: 13px; font-weight: 600; text-align: right;">${attachments.length} anexo(s)</td>
                    </tr>
                </table>

                <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                    Enviado automaticamente pelo SmartOS • ${new Date().toLocaleDateString('pt-BR')}
                </p>
            </div>
        </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY não está configurada no servidor.');
    }

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'SmartOS <onboarding@resend.dev>',
        to,
        subject,
        html,
        attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
        })),
    });

    return result;
}
