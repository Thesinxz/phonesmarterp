"use server";

import { createClient } from "@/lib/supabase/server";

export async function getImeiDashboardStats(tenantId: string) {
    const supabase = await createClient();
    
    const { data: imeis } = await (supabase.from("device_imeis") as any)
        .select("status")
        .eq("tenant_id", tenantId);

    const stats = {
        total: imeis?.length || 0,
        em_estoque: imeis?.filter((i: any) => i.status === 'em_estoque').length || 0,
        vendidos: imeis?.filter((i: any) => i.status === 'vendido').length || 0,
        em_garantia: imeis?.filter((i: any) => i.status === 'em_garantia').length || 0,
        bloqueados: imeis?.filter((i: any) => i.status === 'bloqueado').length || 0,
    };

    return stats;
}
