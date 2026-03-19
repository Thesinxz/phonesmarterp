import { createClient } from "@/lib/supabase/server";
import { getTitulosServer, getResumoTitulosServer } from "@/app/actions/titulos";
import { ReceberListaClient } from "./ReceberListaClient";

export default async function ContasReceberPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await (supabase as any)
        .from("usuarios")
        .select("empresa_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile?.empresa_id) return null;

    const [titulos, resumo] = await Promise.all([
        getTitulosServer(profile.empresa_id, 'receber'),
        getResumoTitulosServer(profile.empresa_id, 'receber')
    ]);

    return (
        <ReceberListaClient 
            initialTitulos={titulos.data}
            initialResumo={resumo}
            empresaId={profile.empresa_id}
        />
    );
}
