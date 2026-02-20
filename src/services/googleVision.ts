import { createClient } from "@/lib/supabase/client";

export async function extractProductsWithGoogleVision(imageDataUrl: string) {
    const supabase = createClient();

    try {
        // 1. Get Google Vision config
        const { data: configData } = await supabase
            .from("configuracoes")
            .select("valor")
            .eq("chave", "google_vision")
            .single() as any;

        if (!configData || !configData.valor?.api_key || !configData.valor?.enabled) {
            return { error: "Google Vision não está configurado ou ativado." };
        }

        const apiKey = configData.valor.api_key;
        const base64Image = imageDataUrl.split(",")[1]; // Remove header

        // 2. Call Google Vision API (REST)
        console.log("Iniciando requisição Google Vision...");
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: "POST",
            body: JSON.stringify({
                requests: [
                    {
                        image: { content: base64Image },
                        features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
                    }
                ]
            }),
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();
        console.log("Resposta Google Vision recebida:", result);

        if (result.error) {
            console.error("Google Vision API Error:", result.error);
            return { error: result.error.message || "Erro na API do Google Vision" };
        }

        const fullText = result.responses?.[0]?.fullTextAnnotation?.text ||
            result.responses?.[0]?.textAnnotations?.[0]?.description || "";

        if (!fullText) {
            console.warn("Google Vision não encontrou texto. Resposta completa:", result);
            return { error: "Nenhum texto identificado na imagem." };
        }

        console.log("Texto extraído com sucesso (primeiros 100 chars):", fullText.substring(0, 100));
        return {
            text: fullText,
            annotation: result.responses?.[0]?.fullTextAnnotation // Para análise de layout (Fase 1.1)
        };

    } catch (error: any) {
        console.error("Google Vision Error:", error);
        return { error: error.message || "Falha na comunicação com o Google Vision" };
    }
}
