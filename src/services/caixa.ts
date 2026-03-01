import { createClient } from "@/lib/supabase/client";
import { type Caixa, type CaixaMovimentacao, type Database } from "@/types/database";

const supabase = createClient();

export async function getCaixaAberto(empresa_id: string): Promise<Caixa | null> {
    const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('status', 'aberto')
        .maybeSingle();

    if (error) {
        console.error("Erro ao buscar caixa aberto:", error);
        return null;
    }

    return data as Caixa | null;
}

export async function abrirCaixa(
    empresa_id: string,
    usuario_abertura_id: string,
    saldo_inicial: number,
    observacao?: string
): Promise<Caixa> {

    // Verifica se já tem caixa aberto
    const caixaAberto = await getCaixaAberto(empresa_id);
    if (caixaAberto) {
        throw new Error("Já existe um caixa aberto para esta empresa.");
    }

    const { data, error } = await (supabase.from('caixas') as any)
        .insert({
            empresa_id,
            usuario_abertura_id,
            saldo_inicial,
            observacao,
            status: 'aberto'
        })
        .select()
        .single();

    if (error) throw error;
    return data as Caixa;
}

export async function fecharCaixa(
    caixa_id: string,
    usuario_fechamento_id: string,
    saldo_final_informado: number,
    diferenca: number,
    observacao?: string
): Promise<Caixa> {
    const { data, error } = await (supabase.from('caixas') as any)
        .update({
            status: 'fechado',
            usuario_fechamento_id,
            saldo_final_informado,
            diferenca_fechamento: diferenca,
            data_fechamento: new Date().toISOString(),
            observacao
        })
        .eq('id', caixa_id)
        .select()
        .single();

    if (error) throw error;
    return data as Caixa;
}

export async function registrarMovimentacaoCaixa(
    movimentacao: Database['public']['Tables']['caixa_movimentacoes']['Insert']
): Promise<CaixaMovimentacao> {
    const { data, error } = await (supabase.from('caixa_movimentacoes') as any)
        .insert(movimentacao)
        .select()
        .single();

    if (error) throw error;
    return data as CaixaMovimentacao;
}

export async function getMovimentacoesCaixa(caixa_id: string): Promise<CaixaMovimentacao[]> {
    const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('caixa_id', caixa_id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CaixaMovimentacao[];
}
