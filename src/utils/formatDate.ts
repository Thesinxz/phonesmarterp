import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatRelative(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isToday(d)) return `Hoje às ${format(d, "HH:mm")}`;
    if (isYesterday(d)) return `Ontem às ${format(d, "HH:mm")}`;
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatMonth(date: string | Date): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "MMMM yyyy", { locale: ptBR });
}
