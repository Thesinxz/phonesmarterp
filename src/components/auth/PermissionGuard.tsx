"use client";

import { usePermission } from "@/hooks/usePermission";
import { UserPapel } from "@/types/database";

interface PermissionGuardProps {
    children: React.ReactNode;
    roles?: UserPapel[];
    minRole?: UserPapel;
    fallback?: React.ReactNode;
}

export function PermissionGuard({
    children,
    roles,
    minRole,
    fallback = null,
}: PermissionGuardProps) {
    const { hasRole, hasMinRole, isLoading } = usePermission();

    if (isLoading) {
        // Pode retornar null ou um skeleton (opcional)
        return null;
    }

    const isAllowed =
        (roles && hasRole(roles)) || (minRole && hasMinRole(minRole));

    if (!isAllowed) {
        return fallback;
    }

    return <>{children}</>;
}
