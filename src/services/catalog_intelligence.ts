import { createClient } from "@/lib/supabase/client";

export interface EquipamentoSugestao {
    marca_label: string;
    modelo_label: string;
    total: number;
    is_global: boolean;
}

export async function getSugestoesEquipamento(empresaId: string) {
    const supabase = createClient();
    
    const { data, error } = await (supabase as any).rpc('get_sugestoes_equipamento', {
        p_empresa_id: empresaId,
        p_min_ocorrencias: 1 // Começa sugerindo tudo, depois filtramos por popularidade
    });

    if (error) {
        console.error("Erro ao buscar sugestões de equipamentos:", error);
        return [];
    }

    return (data as EquipamentoSugestao[]) || [];
}
