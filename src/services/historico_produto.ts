import { createClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

type ProdutoHistorico = Database["public"]["Tables"]["produtos_historico"]["Row"];

export async function addProdutoHistorico(
    produto_id: string,
    empresa_id: string,
    tipo_evento: ProdutoHistorico["tipo_evento"],
    descricao: string,
    referencia_id?: string | null,
    usuario_id?: string | null
) {
    const supabase = createClient();

    // Fallback para pegar o UID do usuário lógado se não for passado
    let finalUserId = usuario_id;
    if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id || null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('produtos_historico').insert({
        produto_id,
        empresa_id,
        tipo_evento,
        descricao,
        usuario_id: finalUserId,
        referencia_id
    });

    if (error) {
        console.error("Erro ao registrar histórico do produto:", error);
        // Não jogaremos o throw error aqui para não quebrar fluxos principais (como venda) por falha no log
    }
}

export async function getProdutoHistorico(produto_id: string) {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('produtos_historico')
        .select('*')
        .eq('produto_id', produto_id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Tentar resolver nomes de usuarios se houver necessidade
    if (data && data.length > 0) {
        const userIds = Array.from(new Set(data.map((item: any) => item.usuario_id).filter(Boolean)));

        if (userIds.length > 0) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: users, error: userError } = await (supabase as any)
                    .from('usuarios')
                    .select('nome, auth_user_id')
                    .in('auth_user_id', userIds);

                if (!userError && users) {
                    return data.map((item: any) => {
                        const user = users.find((u: any) => u.auth_user_id === item.usuario_id);
                        return { ...item, usuario_nome: user?.nome || 'Sistema' };
                    });
                }
            } catch (e) {
                console.error("Erro ao buscar nomes de usuários para histórico:", e);
            }
        }

        // Se falhar ou não houver IDs, retorna com fallback
        return data.map((item: any) => ({ ...item, usuario_nome: 'Sistema' }));
    }

    return data || [];
}
