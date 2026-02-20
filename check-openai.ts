import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, serviceKey);

async function checkOpenAI() {
    console.log("Checking configuracoes table for 'openai' key...");
    const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("chave", "openai")
        .single();

    if (error) {
        console.error("Error fetching openai config:", error.message);
    } else {
        console.log("OpenAI Config found:", JSON.stringify(data, null, 2));
        if (data.valor?.api_key) {
            console.log("API Key detected (masking):", data.valor.api_key.substring(0, 7) + "...");
        } else {
            console.warn("API Key NOT found in valor object.");
        }
    }
}

checkOpenAI();
