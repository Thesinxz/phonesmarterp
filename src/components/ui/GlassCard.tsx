import { cn } from "@/utils/cn";
import { type LucideIcon } from "lucide-react";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: LucideIcon;
    iconColor?: string;
    action?: React.ReactNode;
    noPadding?: boolean;
}

export function GlassCard({
    children,
    className,
    title,
    icon: Icon,
    iconColor = "text-brand-500",
    action,
    noPadding = false,
}: GlassCardProps) {
    return (
        <div className={cn("glass-card", noPadding && "!p-0", className)}>
            {(title || action) && (
                <div className={cn("flex items-center justify-between", noPadding ? "px-6 pt-5 pb-4" : "mb-4")}>
                    <div className="flex items-center gap-2.5">
                        {Icon && (
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                                <Icon className={cn("w-4 h-4", iconColor)} />
                            </div>
                        )}
                        {title && (
                            <h3 className="text-slate-700 font-semibold text-sm">{title}</h3>
                        )}
                    </div>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className={noPadding && (title || action) ? "px-6 pb-5" : ""}>{children}</div>
        </div>
    );
}
