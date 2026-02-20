"use server";

import { createClient } from "@/lib/supabase/server";

export async function generateProductDescription(productName: string, category: string, grade?: string) {
    try {
        const supabase = await createClient();

        // 1. Get AI Config (API Key)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: configData } = await (supabase as any)
            .from("configuracoes")
            .select("valor")
            .eq("chave", "openai")
            .single();

        const apiKey = configData?.valor?.api_key;

        if (!apiKey) {
            // Mock response if no API key is configured
            return `Este é um ${productName} de alta qualidade, ideal para reposição. Categoria: ${category}. ${grade ? `Grade: ${grade}.` : ""} Testado e garantido pela nossa assistência técnica.`;
        }

        // 2. Call OpenAI API
        const prompt = `Gere uma descrição curta e vendedora para um produto de assistência técnica de celulares.
        Produto: ${productName}
        Categoria: ${category}
        ${grade ? `Qualidade/Grade: ${grade}` : ""}
        
        A descrição deve ser profissional, em português, com no máximo 3 parágrafos curtos.`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a helpful assistant that writes product descriptions for a mobile repair shop." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Erro ao gerar descrição.";

    } catch (error) {
        console.error("[AI] Error generating description:", error);
        return "Erro ao processar a inteligência artificial.";
    }
}


