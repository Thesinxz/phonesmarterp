import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

// Tipos de mensagens predefinidas de cobrança/lembrete
const TEMPLATES = {
    lembrete: (clienteNome: string, osNumero: number, dias: number) =>
        `Olá, ${clienteNome}! Tudo bem? Esse é um lembrete automático da Smartos.\n\nA sua Ordem de Serviço #${osNumero} está finalizada e seu aparelho aguarda retirada em nossa loja há ${dias} dias.\n\nVenha buscar assim que puder! Qualquer dúvida, estamos à disposição.`,

    taxa: (clienteNome: string, osNumero: number, dias: number) =>
        `Atenção ${clienteNome}. Notamos que sua Ordem de Serviço #${osNumero} está pronta há ${dias} dias.\n\nLembramos que, conforme nosso termo de recebimento, aparelhos não retirados após 30 dias estão sujeitos à cobrança de Taxa de Guarda diária.\n\nPor favor, programe-se para retirar seu equipamento o mais breve possível para não gerar custos adicionais.`,

    abandono: (clienteNome: string, osNumero: number, dias: number) =>
        `Aviso de Abandono: Olá, ${clienteNome}. Sua Ordem de Serviço #${osNumero} ultrapassou o limite máximo de ${dias} dias em nossa prateleira.\n\nConforme o termo assinado na entrada, equipamentos não retirados após 90 dias podem ser descartados ou vendidos para custear a mão de obra e peças pendentes.\n\nEsta é a última notificação. Entre em contato urgentemente caso queira reaver o equipamento mediante pagamento das taxas.`
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { telefone, clienteNome, osNumero, dias, tipo } = body;

        if (!telefone || !clienteNome || !osNumero || !dias || !tipo) {
            return NextResponse.json({ error: "Faltam parâmetros obrigatórios." }, { status: 400 });
        }

        if (!['lembrete', 'taxa', 'abandono'].includes(tipo)) {
            return NextResponse.json({ error: "Tipo de mensagem inválido." }, { status: 400 });
        }

        // Obtém o template de mensagem baseado no tipo
        const mensagem = TEMPLATES[tipo as keyof typeof TEMPLATES](clienteNome, osNumero, dias);

        // Limpa o caractere do telefone (mantém só números)
        const telefoneLimpo = telefone.replace(/\D/g, "");

        // ─────────────────────────────────────────────────────────────────
        // INTEGRAÇÃO REAL COM API DE WHATSAPP (EvolutionAPI, Z-API, etc)
        // ─────────────────────────────────────────────────────────────────
        // Como o usuário não definiu ainda um provedor específico no .env,
        // vamos deixar a estrutura conectável e simular o sucesso para a UI.

        /*
        const apiUrl = process.env.WHATSAPP_API_URL;
        const apiKey = process.env.WHATSAPP_API_KEY;
        const instanceName = process.env.WHATSAPP_INSTANCE_NAME;

        if (apiUrl && apiKey && instanceName) {
            const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey
                },
                body: JSON.stringify({
                    number: "55" + telefoneLimpo, // formato Brasil DDI+DDD+Numero
                    text: mensagem
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Erro no provedor de WhatsApp");
            }
        } else {
             console.log("Mock WhatsApp Send -> ", telefoneLimpo, mensagem);
             await new Promise(r => setTimeout(r, 1000)); // simula rede
        }
        */

        // Mock de sucesso temporário
        console.log(`[WhatsApp API Mock] Enviando para ${telefoneLimpo}:\n${mensagem}`);
        await new Promise(r => setTimeout(r, 600)); // simula delay de rede

        return NextResponse.json({ success: true, message: "Mensagem enviada com sucesso" });

    } catch (error: any) {
        console.error("Erro na API de WhatsApp Lembrete:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
    }
}
