import { createClient } from "@/lib/supabase/server";
import { OSListaClient } from "./OSListaClient";

export default async function OSPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("id, empresa_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile?.empresa_id) return null;

    // Buscar técnicos/equipe para o filtro
    const { data: tecnicos } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', profile.empresa_id)
        .in('papel', ['tecnico', 'admin'])
        .eq('ativo', true);

    // Buscar dados iniciais (Kanban costuma pedir mais itens para preencher as colunas)
    const { data: orders, count } = await (supabase as any)
        .from("ordens_servico")
        .select(`
            *,
            cliente:clientes(nome, telefone),
            equipamento:equipamentos(marca, modelo),
            tecnico:usuarios(nome)
        `, { count: "exact" })
        .eq("empresa_id", profile.empresa_id)
        .order("created_at", { ascending: false })
        .range(0, 99);

    return (
        <OSListaClient 
            initialOrders={orders || []} 
            initialCount={count || 0}
            initialTotalPages={count ? Math.ceil(count / 100) : 0}
            tecnicos={tecnicos || []}
            empresaId={profile.empresa_id}
            usuarioId={profile.id}
        />
    );
}
