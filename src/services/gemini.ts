import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export interface GeminiOCRItem {
    item: string;
    cost: string;
    qtd: string;
    categoria?: string;
}

export async function extractProductsWithGemini(imageDataUrl: string, apiKey: string) {
    logger.log("[Gemini Service] Starting extraction...");

    try {
        if (!apiKey) {
            console.error("[Gemini Service] No API Key found");
            return { error: "A chave da API Gemini não está configurada no painel Configurações." };
        }

        const base64Image = imageDataUrl.split(",")[1];
        const mimeType = imageDataUrl.split(";")[0].split(":")[1] || "image/jpeg";

        const prompt = `Extraia dados desta nota fiscal em JSON puro (array de objetos): item, cost, qtd, categoria. Use o formato: [{"item": "...", "cost": 10.0, "qtd": 1, "categoria": "..."}]`;

        logger.log("[Gemini Service] Calling API with model gemini-2.5-flash...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            logger.warn("[Gemini Service] Timeout reached (30s)");
            controller.abort();
        }, 30000);

        const startTime = Date.now();
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: base64Image } }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                })
            });

            clearTimeout(timeoutId);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            logger.log(`[Gemini Service] API responded in ${duration}s. Status: ${response.status}`);

            if (!response.ok) {
                const errText = await response.text();
                console.error("[Gemini Service] API Error Response:", errText);
                return { error: `API Error ${response.status}: ${errText}` };
            }

            const result = await response.json();
            const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
            logger.log("[Gemini Service] Raw text extracted successfully.");

            try {
                const parsed = JSON.parse(textResponse);
                const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.produtos || []);
                logger.log(`[Gemini Service] Parsed ${items.length} items.`);
                return { items };
            } catch (e) {
                console.error("[Gemini Service] JSON Parse Error:", textResponse);
                return { error: "Failed to parse AI response" };
            }

        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
                return { error: "Timeout: A IA demorou demais para responder." };
            }
            throw fetchErr;
        }

    } catch (err: any) {
        console.error("[Gemini Service] Critical Error:", err);
        return { error: err.message || "Unknown Service Error" };
    }
}
