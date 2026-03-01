"use server";

import { createClient } from "@/lib/supabase/server";
import { WhatsappConfig } from "@/types/configuracoes";

async function getConfig() {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
        .from("configuracoes")
        .select("valor")
        .eq("chave", "whatsapp")
        .single();

    return data?.valor as WhatsappConfig | undefined;
}

export async function sendWhatsAppTemplate(to: string, templateName: string, components: any[]) {
    try {
        const config = await getConfig();
        if (!config?.api_token || !config?.phone_number_id) {
            console.warn("[WhatsApp] Configurações ausentes.");
            return { success: false, error: "Configurações ausentes" };
        }

        const cleanPhone = to.replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

        // Construir payload da Meta
        const payload = {
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "template",
            template: {
                name: templateName,
                language: { code: "pt_BR" },
                components
            }
        };

        const response = await fetch(
            `https://graph.facebook.com/v17.0/${config.phone_number_id}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.api_token}`
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("[WhatsApp] Erro na API:", data);
            return { success: false, error: data.error?.message || "Erro desconhecido" };
        }

        return { success: true, messageId: data.messages?.[0]?.id };

    } catch (error: any) {
        console.error("[WhatsApp] Exceção:", error);
        return { success: false, error: error.message };
    }
}
