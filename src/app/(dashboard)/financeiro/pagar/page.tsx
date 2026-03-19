import { createClient } from "@/lib/supabase/server";
import { getTitulosServer, getResumoTitulosServer } from "@/app/actions/titulos";
import { PagarListaClient } from "./PagarListaClient";

export default async function ContasPagarPage() {
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
        getTitulosServer(profile.empresa_id, 'pagar'),
        getResumoTitulosServer(profile.empresa_id, 'pagar')
    ]);

    return (
        <PagarListaClient 
            initialTitulos={titulos.data}
            initialResumo={resumo}
            empresaId={profile.empresa_id}
        />
    );
}
