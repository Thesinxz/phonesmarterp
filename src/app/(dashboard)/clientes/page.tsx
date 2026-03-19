import { createClient } from "@/lib/supabase/server";
import { ClientesListaClient } from "./ClientesListaClient";

export default async function ClientesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("empresa_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile?.empresa_id) return null;

    const { data: clientes, count } = await supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .eq("empresa_id", profile.empresa_id)
        .order("created_at", { ascending: false })
        .range(0, 50);

    return (
        <ClientesListaClient 
            initialClientes={clientes || []}
            initialCount={count || 0}
            empresaId={profile.empresa_id}
        />
    );
}
