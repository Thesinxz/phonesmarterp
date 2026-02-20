import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Tools } = require("node-sped-nfe");

        const { data: configNFe } = await (supabase as any)
            .from("configuracoes")
            .select("valor")
            .eq("chave", "nfe_emitente")
            .single();

        const { data: configCert } = await (supabase as any)
            .from("configuracoes")
            .select("valor")
            .eq("chave", "nfe_certificado")
            .single();

        if (!configNFe || !configCert) {
            return NextResponse.json({ error: "Configurações incompletas" }, { status: 400 });
        }

        const emitente = configNFe.valor;
        const certConfig = configCert.valor;
        const pfxBuffer = Buffer.from(certConfig.pfx_base64, "base64");

        const myTools = new Tools({
            mod: "65",
            tpAmb: emitente.ambiente === "producao" ? 1 : 2,
            UF: emitente.uf,
            versao: "4.00",
            CSC: certConfig.csc,
            CSCid: certConfig.csc_id,
        }, {
            pfx: pfxBuffer,
            senha: certConfig.senha,
        });

        const status = await myTools.sefazStatus();
        return NextResponse.json({ success: true, status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
