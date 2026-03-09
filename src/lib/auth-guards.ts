import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/database";

/**
 * Helper para verificar permissões de Admin no lado do servidor (Server Actions / API Routes).
 * Retorna o perfil do usuário se for admin, ou lança erro.
 */
export async function checkAdmin() {
    const cookieStore = cookies();

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // O método setAll pode ser chamado em Server Components/Actions onde cookies são read-only
                    }
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error("Não autenticado");
    }

    // Buscar o papel do usuário na tabela pública
    const { data: profile, error: profileError } = await supabase
        .from("usuarios")
        .select("id, empresa_id, papel")
        .eq("auth_user_id", user.id)
        .single();

    if (profileError || !profile) {
        throw new Error("Perfil de usuário não encontrado");
    }

    const typedProfile = profile as { id: string, empresa_id: string, papel: string };

    if (typedProfile.papel !== "admin") {
        throw new Error("Acesso negado: Requer privilégios de administrador");
    }

    return { user, profile: typedProfile, supabase };
}
