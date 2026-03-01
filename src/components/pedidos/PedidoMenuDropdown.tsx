"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Printer, MessageCircle, FileText, Ban } from "lucide-react";

interface PedidoMenuDropdownProps {
    pedidoId: string;
    telefoneCliente?: string;
    onCancel: (id: string) => void;
}

export function PedidoMenuDropdown({ pedidoId, telefoneCliente, onCancel }: PedidoMenuDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = (acao: string) => {
        setOpen(false);
        if (acao === "imprimir-a4") alert(`Imprimindo A4 do Pedido ${pedidoId}...`);
        if (acao === "imprimir-80mm") alert(`Imprimindo Cupom do Pedido ${pedidoId}...`);
        if (acao === "whatsapp") {
            if (!telefoneCliente) {
                alert("Cliente não possui telefone cadastrado!");
                return;
            }
            window.open(`https://wa.me/55${telefoneCliente.replace(/\D/g, "")}?text=Olá! Segue o status do seu pedido ${pedidoId}`, "_blank");
        }
        if (acao === "cancelar") {
            if (confirm("Deseja realmente cancelar este pedido?")) {
                onCancel(pedidoId);
            }
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 group relative z-10"
            >
                <MoreHorizontal size={16} className="group-hover:text-slate-600" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                    <button onClick={() => handleAction("imprimir-a4")} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" /> Imprimir A4
                    </button>
                    <button onClick={() => handleAction("imprimir-80mm")} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2">
                        <Printer size={14} className="text-slate-400" /> Recibo 80mm
                    </button>
                    <button onClick={() => handleAction("whatsapp")} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2">
                        <MessageCircle size={14} className="text-emerald-500" /> Enviar WhatsApp
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button onClick={() => handleAction("cancelar")} className="w-full text-left px-4 py-2 hover:bg-red-50 text-xs font-bold text-red-600 flex items-center gap-2">
                        <Ban size={14} className="text-red-400" /> Cancelar Pedido
                    </button>
                </div>
            )}
        </div>
    );
}
