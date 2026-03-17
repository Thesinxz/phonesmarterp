import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { file, mimeType } = await req.json();

    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    try {
        // Obter chave API nas configurações
        const { data: configs } = await (supabase as any)
            .from("configuracoes")
            .select("valor")
            .eq("chave", "gemini")
            .single();

        const apiKey = configs?.valor?.api_key || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Chave Gemini não configurada" }, { status: 500 });
        }

        const base64Image = file.split(",")[1] || file;

        const prompt = `
            Analise esta nota fiscal/invoice e extraia:
            1. Nome do fornecedor
            2. Lista de itens com: nome exato, quantidade, valor unitário
            3. Valor total da nota
            4. Data da nota
            5. Número da nota fiscal (se houver)

            Responda SOMENTE em JSON com esta estrutura:
            {
              "fornecedor": "string",
              "data": "YYYY-MM-DD",
              "numero_nf": "string ou null",
              "valor_total": number (em reais, ex: 830.00),
              "itens": [
                {
                  "nome": "string",
                  "quantidade": number,
                  "custo_unitario": number
                }
              ]
            }
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Image } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return NextResponse.json({ error: `IA Error: ${err}` }, { status: response.status });
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        try {
            const parsed = JSON.parse(text);
            return NextResponse.json(parsed);
        } catch (e) {
            return NextResponse.json({ error: "Erro ao processar resposta da IA", raw: text }, { status: 500 });
        }

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
