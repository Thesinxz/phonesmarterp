"use client";

import { useAuth } from "@/context/AuthContext";
import { ROLE_PERMISSIONS } from "@/services/equipe";
import { useCallback } from "react";

type Action = "view" | "create" | "edit" | "delete";
type Module = "vendas" | "financeiro" | "estoque" | "ordens_servico" | "configuracoes" | "equipe";

export function usePermissions() {
    const { profile } = useAuth();

    /**
     * Verifica se o usuário tem permissão para uma ação em um módulo específico.
     * 
     * @param modulo O módulo a ser verificado
     * @param action A ação (view, create, edit, delete)
     * @returns boolean
     */
    const can = useCallback((modulo: Module, action: Action = "view"): boolean => {
        if (!profile) return false;

        // Administradores têm acesso total
        if (profile.papel === "admin") return true;

        // 1. Verificar permissões customizadas (overrides)
        const customPerms = profile.permissoes_json as any;
        if (customPerms) {
            if (customPerms.all) return true;
            if (customPerms[modulo] && typeof customPerms[modulo][action] === 'boolean') {
                return customPerms[modulo][action];
            }
        }

        // 2. Fallback para permissões padrão do papel (Role Permissions)
        const defaultPerms = ROLE_PERMISSIONS[profile.papel] as any;
        if (defaultPerms) {
            if (defaultPerms.all) return true;
            if (defaultPerms[modulo]) {
                return !!defaultPerms[modulo][action];
            }
        }

        return false;
    }, [profile]);

    return {
        can,
        papel: profile?.papel || null,
        isAdmin: profile?.papel === "admin"
    };
}
