"use server";

import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppTemplate } from "@/services/whatsapp";

export async function notifyOSStatusChange(osId: string, newStatus: string) {
    const supabase = await createClient();

    // 1. Buscar dados da OS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: os } = await (supabase as any)
        .from("ordens_servico")
        .select(`
            id,
            numero,
            status,
            cliente:clientes(nome, telefone),
            equipamento:equipamentos(modelo)
        `)
        .eq("id", osId)
        .single();

    if (!os || !os.cliente || !os.cliente.telefone) {
        return { success: false, error: "Cliente sem telefone" };
    }

    // 2. Buscar configuração para saber nome do template
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configData } = await (supabase as any)
        .from("configuracoes")
        .select("valor")
        .eq("chave", "whatsapp")
        .single();

    const config = configData?.valor;
    if (!config?.status_template) {
        return { success: false, error: "Template de status não configurado." };
    }

    // 3. Traduzir status
    const statusMap: Record<string, string> = {
        aberta: "Aberta",
        em_analise: "Em Análise",
        aguardando_peca: "Aguardando Peça",
        em_execucao: "Em Manutenção",
        finalizada: "Pronto para Retirada",
        entregue: "Entregue",
        cancelada: "Cancelada"
    };

    const statusText = statusMap[newStatus] || newStatus;

    // 4. Preparar Payload do Template
    // Assumindo estrutura padrão:
    // {{1}} = Nome Cliente
    // {{2}} = Número OS
    // {{3}} = Equipamento
    // {{4}} = Novo Status
    const components = [
        {
            type: "body",
            parameters: [
                { type: "text", text: os.cliente.nome.split(" ")[0] },
                { type: "text", text: String(os.numero || os.id.substring(0, 4)) },
                { type: "text", text: os.equipamento?.modelo || "Equipamento" },
                { type: "text", text: statusText },
            ]
        }
    ];

    // 5. Enviar
    return await sendWhatsAppTemplate(os.cliente.telefone, config.status_template, components);
}

export async function notifyVenda(vendaId: string) {
    const supabase = await createClient();

    // 1. Buscar dados da venda
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: venda } = await (supabase as any)
        .from("vendas")
        .select(`
            id,
            total_centavos,
            cliente:clientes(nome, telefone),
            itens:venda_itens(quantidade, produto_id, produto:produtos(nome))
        `)
        .eq("id", vendaId)
        .single();

    if (!venda || !venda.cliente || !venda.cliente.telefone) {
        return { success: false, error: "Cliente sem telefone" };
    }

    // 2. Buscar configuração
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configData } = await (supabase as any)
        .from("configuracoes")
        .select("valor")
        .eq("chave", "whatsapp")
        .single();

    const config = configData?.valor;
    if (!config?.venda_template) {
        return { success: false, error: "Template de venda não configurado." };
    }

    // 3. Preparar Payload
    // {{1}} = Nome Cliente
    // {{2}} = Total formatado
    // {{3}} = Resumo itens
    const resumo = (venda as any).itens.map((i: any) => `${i.quantidade}x ${i.produto?.nome}`).join(", ");

    const components = [
        {
            type: "body",
            parameters: [
                { type: "text", text: venda.cliente.nome.split(" ")[0] },
                { type: "text", text: (venda.total_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
                { type: "text", text: resumo.substring(0, 100) + (resumo.length > 100 ? "..." : "") },
            ]
        }
    ];

    return await sendWhatsAppTemplate(venda.cliente.telefone, config.venda_template, components);
}

export async function notifyPedidoStatus(pedidoId: string, newStatus: string) {
    const supabase = await createClient();

    // 1. Buscar dados do pedido
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pedido } = await (supabase as any)
        .from("vendas")
        .select(`
            id,
            total_centavos,
            status_pedido,
            cliente:clientes(nome, telefone)
        `)
        .eq("id", pedidoId)
        .single();

    if (!pedido || !pedido.cliente || !pedido.cliente.telefone) {
        return { success: false, error: "Pedido ou cliente não encontrado" };
    }

    // 2. Traduzir status para humano
    const statusMap: Record<string, string> = {
        aguardando_aprovacao: "Aguardando Aprovação",
        aprovado: "Aprovado e pronto para separação",
        separando: "Em fase de separação",
        enviado: "Enviado / Saiu para entrega",
        entregue: "Entregue com sucesso",
        cancelado: "Cancelado"
    };

    const statusText = statusMap[newStatus] || newStatus;

    // 3. Buscar configuração
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configData } = await (supabase as any)
        .from("configuracoes")
        .select("valor")
        .eq("chave", "whatsapp")
        .single();

    const config = configData?.valor;
    if (!config?.status_template) { // Reaproveita template de status de OS ou usa um similar
        return { success: false, error: "Template não configurado" };
    }

    // 4. Preparar Payload
    // {{1}} = Nome Cliente
    // {{2}} = ID Pedido
    // {{3}} = Nome do Sistema / Empresa
    // {{4}} = Novo Status
    const components = [
        {
            type: "body",
            parameters: [
                { type: "text", text: pedido.cliente.nome.split(" ")[0] },
                { type: "text", text: pedido.id.substring(0, 8) },
                { type: "text", text: "Phone Smart" },
                { type: "text", text: statusText },
            ]
        }
    ];

    return await sendWhatsAppTemplate(pedido.cliente.telefone, config.status_template, components);
}

export async function createInternalNotification(params: {
    tenantId: string;
    unitId?: string | null;
    userId?: string | null;
    message: string;
    link?: string;
}) {
    const supabase = await createClient();
    
    const { error } = await (supabase as any)
        .from('notifications')
        .insert({
            tenant_id: params.tenantId,
            unit_id: params.unitId,
            user_id: params.userId,
            message: params.message,
            link: params.link
        });

    if (error) console.error("Error creating internal notification:", error);
}
