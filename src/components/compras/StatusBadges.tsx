import { cn } from "@/utils/cn";

interface StatusBadgeProps {
    status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const s = status?.toLowerCase();
    
    switch (s) {
        case "pago":
        case "concluida":
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                    Pago
                </span>
            );
        case "cancelado":
        case "cancelada":
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">
                    Cancelado
                </span>
            );
        default:
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                    Pendente
                </span>
            );
    }
}

export function OrigemBadge({ origem }: { origem: string }) {
    const o = origem?.toLowerCase();
    
    return (
        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
            {o?.replace('xml_', '⚡ ').replace('manual', '⌨️ Manual').replace('ocr_', '🤖 OCR ')}
        </span>
    );
}
