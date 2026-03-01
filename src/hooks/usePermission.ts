"use client";

import { useAuth } from "@/context/AuthContext";
import { UserPapel } from "@/types/database";

// Hierarquia de permissões (opcional, se quiser que 'admin' tenha tudo)
const ROLE_HIERARCHY: Record<UserPapel, number> = {
    admin: 100,
    gerente: 80,
    financeiro: 50,
    tecnico: 40,
    atendente: 20,
};

export function usePermission() {
    const { profile, isLoading } = useAuth(); // Obtém o perfil do banco de dados

    const hasRole = (requiredRoles: UserPapel[]) => {
        if (isLoading || !profile) return false;
        return requiredRoles.includes(profile.papel);
    };

    const hasMinRole = (minRole: UserPapel) => {
        if (isLoading || !profile) return false;
        const userLevel = ROLE_HIERARCHY[profile.papel];
        const requiredLevel = ROLE_HIERARCHY[minRole];
        return userLevel >= requiredLevel;
    };

    // Futuro: Verificar permissões granulares no JSON
    // const hasPermission = (permissionKey: string) => { ... }

    return {
        role: profile?.papel,
        hasRole,
        hasMinRole,
        isLoading
    };
}
