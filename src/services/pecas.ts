import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface PecaCatalogo {
    id: string;
    empresa_id: string;
    produto_id: string | null;
    nome: string;
    tipo_peca: string;
    modelos_compativeis: string[];
    preco_custo_centavos: number;
    preco_venda_centavos: number;
    estoque_qtd: number;
    fornecedor: string | null;
    qualidade: string;
    created_at: string;
}

export const TIPOS_PECA = [
    { value: "tela_modulo", label: "Tela / Frontal / Módulo", emoji: "📱" },
    { value: "bateria", label: "Bateria", emoji: "🔋" },
    { value: "conector", label: "Conector de Carga", emoji: "🔌" },
    { value: "tampa_traseira", label: "Tampa Traseira", emoji: "🔙" },
    { value: "alto_falante", label: "Alto-falante", emoji: "🔊" },
    { value: "camera", label: "Câmera", emoji: "📷" },
    { value: "flex", label: "Cabo Flex", emoji: "〰️" },
    { value: "botao", label: "Botão (Power/Volume)", emoji: "⏏️" },
    { value: "aro", label: "Aro / Frame", emoji: "⬜" },
    { value: "placa", label: "Placa Mãe", emoji: "🔧" },
    { value: "sensor", label: "Sensor (Proximidade/Luz)", emoji: "💡" },
    { value: "auricular", label: "Auricular / Fone", emoji: "🎧" },
    { value: "outro", label: "Outros", emoji: "📦" },
];

export const QUALIDADES = [
    { value: "original", label: "Original", color: "bg-emerald-100 text-emerald-700" },
    { value: "oem", label: "OEM", color: "bg-blue-100 text-blue-700" },
    { value: "paralela", label: "Paralela", color: "bg-amber-100 text-amber-700" },
    { value: "china", label: "China", color: "bg-red-100 text-red-700" },
];

export async function getPecasCatalogo(
    empresa_id: string,
    opts?: { search?: string; tipo?: string; modelo?: string }
) {
    let query = supabase
        .from("pecas_catalogo")
        .select("*", { count: "exact" })
        .eq("empresa_id", empresa_id)
        .order("tipo_peca")
        .order("nome");

    if (opts?.search) {
        query = query.ilike("nome", `%${opts.search}%`);
    }
    if (opts?.tipo) {
        query = query.eq("tipo_peca", opts.tipo);
    }
    if (opts?.modelo) {
        query = query.contains("modelos_compativeis", [opts.modelo]);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data || []) as PecaCatalogo[], count: count || 0 };
}

export async function getPecasPorModelo(empresa_id: string, modelo: string) {
    // Busca peças que tenham o modelo no array de compatíveis
    // Usa busca parcial: se o modelo da OS for "iPhone 15 Pro", busca peças com modelos que contenham essa string
    const { data, error } = await supabase
        .from("pecas_catalogo")
        .select("*")
        .eq("empresa_id", empresa_id)
        .order("tipo_peca")
        .order("nome");

    if (error) throw error;

    // Filtro client-side para match parcial no array
    const modeloLower = modelo.toLowerCase();
    return (data || []).filter((p: PecaCatalogo) =>
        (p.modelos_compativeis || []).some(m =>
            m.toLowerCase().includes(modeloLower) || modeloLower.includes(m.toLowerCase())
        )
    ) as PecaCatalogo[];
}

export async function upsertPeca(peca: Partial<PecaCatalogo> & { empresa_id: string }) {
    const { data, error } = await (supabase.from("pecas_catalogo") as any)
        .upsert(peca)
        .select()
        .single();
    if (error) throw error;
    return data as PecaCatalogo;
}

export async function deletePeca(id: string) {
    const { error } = await supabase
        .from("pecas_catalogo")
        .delete()
        .eq("id", id);
    if (error) throw error;
}
