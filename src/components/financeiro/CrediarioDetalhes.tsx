"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCrediarioDetalhes, baixarParcela, formatarValor, excluirCrediario, editarParcela } from "@/services/crediario";
import {
    X, CheckCircle2, Clock, AlertTriangle, Loader2,
    DollarSign, Calendar, Printer, ExternalLink,
    CreditCard, User, FileText, Banknote, Edit3, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface CrediarioDetalhesProps {
    crediarioId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export function CrediarioDetalhes({ crediarioId, onClose, onUpdate }: CrediarioDetalhesProps) {
    const { empresa } = useAuth();
    const [crediario, setCrediario] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [baixando, setBaixando] = useState<string | null>(null);
    const [showBaixaModal, setShowBaixaModal] = useState<string | null>(null);
    const [formaBaixa, setFormaBaixa] = useState("dinheiro");
    const [valorBaixaInput, setValorBaixaInput] = useState<string>("");

    // Edição / Exclusão
    const [cancelando, setCancelando] = useState(false);
    const [editandoParcela, setEditandoParcela] = useState<string | null>(null);
    const [editValor, setEditValor] = useState("");
    const [editVencimento, setEditVencimento] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const data = await getCrediarioDetalhes(crediarioId);
                setCrediario(data);
            } catch (err) {
                toast.error("Erro ao carregar detalhes");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [crediarioId]);

    async function handleBaixa(parcelaId: string) {
        setBaixando(parcelaId);
        try {
            const valNum = parseFloat(valorBaixaInput.replace(",", "."));
            const valorPagoCentavos = isNaN(valNum) ? undefined : Math.round(valNum * 100);

            const res = await baixarParcela(parcelaId, formaBaixa, valorPagoCentavos);

            toast.success("Parcela atualizada com sucesso!");
            const data = await getCrediarioDetalhes(crediarioId);
            setCrediario(data);
            setShowBaixaModal(null);
            onUpdate();

            // Localizar a parcela atualizada e imprimir o recibo do pagamento específico
            const parcelaAtualizada = data.parcelas.find((p: any) => p.id === parcelaId);
            if (parcelaAtualizada && res.pagamento) {
                imprimirRecibo(parcelaAtualizada, res.pagamento);
            }
        } catch (err: any) {
            toast.error(err.message || "Erro na baixa");
        } finally {
            setBaixando(null);
        }
    }

    async function handleCancelarCrediario() {
        if (!confirm("Tem certeza que deseja cancelar este crediário? Esta ação não pode ser desfeita.")) return;
        setCancelando(true);
        try {
            await excluirCrediario(crediarioId);
            toast.success("Crediário cancelado com sucesso!");
            onUpdate();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Erro ao cancelar crediário");
            setCancelando(false);
        }
    }

    async function handleSalvarEdicao(parcelaId: string) {
        try {
            const valNum = parseFloat(editValor.replace(",", "."));
            const valorCentavos = isNaN(valNum) ? undefined : Math.round(valNum * 100);

            await editarParcela(parcelaId, valorCentavos, editVencimento || undefined);

            toast.success("Parcela atualizada!");
            setEditandoParcela(null);
            const data = await getCrediarioDetalhes(crediarioId);
            setCrediario(data);
            onUpdate();
        } catch (err: any) {
            toast.error(err.message || "Erro ao editar parcela");
        }
    }

    function imprimirRecibo(parcela: any, pagamento?: any) {
        const w = window.open("", "_blank", "width=400,height=600");
        if (!w) return;

        const c = crediario;
        const valorNesteAto = pagamento ? pagamento.valor : parcela.valor_centavos;
        const valorPagoDisplay = (valorNesteAto / 100).toFixed(2).replace(".", ",");

        const valorTotalParcela = parcela.valor_centavos;
        const valorRecebidoAteJa = parcela.valor_pago_centavos || 0;
        const restanteCentavos = Math.max(0, valorTotalParcela - valorRecebidoAteJa);
        const restanteDisplay = (restanteCentavos / 100).toFixed(2).replace(".", ",");

        const dataPagamento = pagamento ? new Date(pagamento.data) : new Date();

        w.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo - Parcela ${parcela.numero_parcela}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 400px; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .header h1 { font-size: 16px; margin-bottom: 4px; }
                    .header p { font-size: 10px; color: #555; }
                    .section { margin-bottom: 12px; }
                    .section h3 { font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
                    .row .label { color: #666; }
                    .row .value { font-weight: bold; }
                    .total { font-size: 18px; text-align: center; padding: 15px; border: 2px solid #000; margin: 15px 0; font-weight: bold; background-color: #f9f9f9; }
                    .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; font-size: 10px; color: #888; }
                    .assinatura { margin-top: 40px; text-align: center; }
                    .assinatura .linha { border-top: 1px solid #000; width: 250px; margin: 0 auto 5px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RECIBO DE PAGAMENTO</h1>
                    <p>COMPROVANTE DE PARCELA - CREDIÁRIO</p>
                </div>

                <div class="section">
                    <h3>Empresa Emissora</h3>
                    <div class="row"><span class="label">Empresa:</span><span class="value">${empresa?.nome || "Loja"}</span></div>
                    <div class="row"><span class="label">CNPJ:</span><span class="value">${empresa?.cnpj || "—"}</span></div>
                </div>

                <div class="section">
                    <h3>Dados do Crediário</h3>
                    <div class="row"><span class="label">Nº Crediário:</span><span class="value">#${c.numero}</span></div>
                    <div class="row"><span class="label">Parcela:</span><span class="value">${parcela.numero_parcela} de ${c.num_parcelas}</span></div>
                    <div class="row"><span class="label">Emissão (Neste Pagto):</span><span class="value">${dataPagamento.toLocaleDateString("pt-BR")} as ${dataPagamento.toLocaleTimeString("pt-BR")}</span></div>
                </div>

                <div class="section">
                    <h3>Cliente</h3>
                    <div class="row"><span class="label">Nome:</span><span class="value">${c.cliente?.nome || ""}</span></div>
                    <div class="row"><span class="label">CPF/CNPJ:</span><span class="value">${c.cliente?.cpf_cnpj || "—"}</span></div>
                    <div class="row"><span class="label">Tel:</span><span class="value">${c.cliente?.telefone || "—"}</span></div>
                </div>

                <div class="total">
                    VALOR DESTE ATO: R$ ${valorPagoDisplay}
                </div>

                <div class="section">
                    <div class="row"><span class="label">Valor Total da Parcela:</span><span class="value">R$ ${(valorTotalParcela / 100).toFixed(2).replace(".", ",")}</span></div>
                    <div class="row"><span class="label">Valor Restante da Parcela:</span><span class="value">R$ ${restanteDisplay}</span></div>
                    <div class="row"><span class="label">Vencimento Original:</span><span class="value">${new Date(parcela.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>
                    <div class="row"><span class="label">Forma Pgto (Neste Ato):</span><span class="value">${pagamento ? pagamento.forma_pagamento : (parcela.forma_pagamento || "—")}</span></div>
                    <div class="row"><span class="label">Valor Total Crediário:</span><span class="value">R$ ${(c.valor_total_centavos / 100).toFixed(2).replace(".", ",")}</span></div>
                </div>

                <div class="assinatura">
                    <div class="linha"></div>
                    <p>Assinatura do Cliente</p>
                </div>

                <div class="assinatura">
                    <div class="linha"></div>
                    <p>Assinatura da Loja</p>
                </div>

                <div class="footer">
                    <p>Este recibo comprova o pagamento da parcela acima.</p>
                    <p>Documento gerado em ${new Date().toLocaleString("pt-BR")}</p>
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        w.document.close();
    }

    function imprimirCarneCompleto() {
        if (!crediario || !crediario.parcelas) return;
        const w = window.open("", "_blank");
        if (!w) return;

        const c = crediario;
        const parcelas = [...c.parcelas].sort((a: any, b: any) => a.numero_parcela - b.numero_parcela);

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Carnê de Pagamento - #${c.numero}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
                    .page-break { page-break-after: always; }
                    .lamina { display: flex; border: 1px dashed #000; margin-bottom: 20px; width: 100%; max-width: 800px; page-break-inside: avoid; }
                    .recibo-cliente { width: 30%; border-right: 1px dashed #000; padding: 15px; }
                    .recibo-loja { width: 70%; padding: 15px; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .header h1 { font-size: 16px; margin-bottom: 4px; }
                    .header p { font-size: 10px; color: #555; }
                    .section { margin-bottom: 12px; }
                    .section h3 { font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    .row .label { color: #666; }
                    .row .value { font-weight: bold; }
                    .total { font-size: 16px; text-align: center; padding: 10px; border: 2px solid #000; margin: 10px 0; font-weight: bold; }
                    .assinatura { margin-top: 25px; text-align: center; }
                    .assinatura .linha { border-top: 1px solid #000; width: 80%; margin: 0 auto 5px; }
                    @media print { body { margin: 0; } .lamina { margin-bottom: 30px; } }
                </style>
            </head>
            <body>
        `;

        parcelas.forEach((p, index) => {
            const dataVenc = new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR");
            const valParcela = (p.valor_centavos / 100).toFixed(2).replace(".", ",");

            const laminaHTML = `
                <div class="lamina ${index > 0 && index % 3 === 0 ? 'page-break' : ''}">
                    <!-- CANHOTO CLIENTE -->
                    <div class="recibo-cliente">
                        <div class="header">
                            <h1>RECIBO CLIENTE</h1>
                            <p>Crediário #${c.numero}</p>
                        </div>
                        <div class="section">
                            <div class="row"><span class="label">Parcela:</span><span class="value">${p.numero_parcela}/${c.num_parcelas}</span></div>
                            <div class="row"><span class="label">Vencimento:</span><span class="value">${dataVenc}</span></div>
                            <div class="row"><span class="label">Valor:</span><span class="value">R$ ${valParcela}</span></div>
                        </div>
                        <div class="section">
                            <div class="row"><span class="label">Emissor:</span><span class="value">SmartOS</span></div>
                        </div>
                        <br/><br/>
                        <div class="assinatura">
                            <div class="linha"></div>
                            <p>Ass. Loja</p>
                        </div>
                    </div>

                    <!-- VIA LOJA -->
                    <div class="recibo-loja">
                        <div class="header">
                            <h1>CARNÊ DE PAGAMENTO</h1>
                            <p>VIA DO ESTABELECIMENTO</p>
                        </div>
                        <div style="display: flex; gap: 20px;">
                            <div style="flex: 1;">
                                <div class="section">
                                    <h3>Dados do Cliente</h3>
                                    <div class="row"><span class="label">Nome:</span><span class="value">${c.cliente?.nome || ""}</span></div>
                                    <div class="row"><span class="label">CPF/CNPJ:</span><span class="value">${c.cliente?.cpf_cnpj || "—"}</span></div>
                                    <div class="row"><span class="label">Tel:</span><span class="value">${c.cliente?.telefone || "—"}</span></div>
                                </div>
                                <div class="section">
                                    <h3>Dados do Crediário</h3>
                                    <div class="row"><span class="label">Contrato:</span><span class="value">#${c.numero}</span></div>
                                    <div class="row"><span class="label">Emissão Original:</span><span class="value">${new Date(c.created_at).toLocaleDateString("pt-BR")}</span></div>
                                    <div class="row"><span class="label">Total Crediário:</span><span class="value">R$ ${(c.valor_total_centavos / 100).toFixed(2).replace(".", ",")}</span></div>
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <div class="total">
                                    PARCELA ${p.numero_parcela}/${c.num_parcelas}<br/>
                                    VENCIMENTO: ${dataVenc}<br/>
                                    VALOR: R$ ${valParcela}
                                </div>
                                <div class="section">
                                    <p style="font-size: 10px; color: #666;">Após vencimento cobrar multa de ${c.multa_percentual}% e juros.</p>
                                </div>
                                <div class="assinatura">
                                    <div class="linha"></div>
                                    <p>Assinatura do Cliente</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            html += laminaHTML;
        });

        html += `
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;

        w.document.write(html);
        w.document.close();
    }

    const statusIcon = (s: string) => {
        switch (s) {
            case "pago": return <CheckCircle2 size={16} className="text-emerald-500" />;
            case "parcial": return <CheckCircle2 size={16} className="text-lime-500" />;
            case "atrasado": return <AlertTriangle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-amber-500" />;
        }
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case "pago": return "Pago";
            case "parcial": return "Pgto. Parcial";
            case "atrasado": return "Atrasado";
            case "cancelado": return "Cancelado";
            default: return "Pendente";
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case "pago": return "bg-emerald-50 text-emerald-600 border-emerald-200";
            case "parcial": return "bg-lime-50 text-lime-600 border-lime-200";
            case "atrasado": return "bg-red-50 text-red-600 border-red-200";
            case "cancelado": return "bg-slate-50 text-slate-400 border-slate-200";
            default: return "bg-amber-50 text-amber-600 border-amber-200";
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-500" />
            </div>
        );
    }

    if (!crediario) return null;

    const parcelas = (crediario.parcelas || []).sort((a: any, b: any) => a.numero_parcela - b.numero_parcela);
    const pagas = parcelas.filter((p: any) => p.status === "pago").length;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:rounded-[32px] rounded-t-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-black text-slate-800">Crediário #{crediario.numero}</h3>
                            <span className={cn("text-[10px] font-black uppercase px-3 py-1 rounded-xl border", statusColor(crediario.status))}>
                                {statusLabel(crediario.status)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <User size={12} />
                            <span className="font-bold">{crediario.cliente?.nome}</span>
                            <span>• {crediario.cliente?.cpf_cnpj || crediario.cliente?.telefone}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={imprimirCarneCompleto}
                            className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-1.5"
                            title="Imprimir Carnê Completo"
                        >
                            <Printer size={14} />
                            Imprimir Carnê
                        </button>
                        {crediario.status !== "cancelado" && crediario.status !== "quitado" && (
                            <button
                                onClick={handleCancelarCrediario}
                                disabled={cancelando}
                                className="px-3 py-1.5 rounded-xl hover:bg-red-50 text-red-500 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {cancelando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Cancelar
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-50 grid grid-cols-4 gap-4 shrink-0">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                        <p className="text-sm font-black text-slate-800">{formatarValor(crediario.valor_total_centavos)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entrada</p>
                        <p className="text-sm font-black text-slate-800">{formatarValor(crediario.entrada_centavos || 0)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parcelas</p>
                        <p className="text-sm font-black text-slate-800">{pagas}/{crediario.num_parcelas}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</p>
                        <p className="text-sm font-black text-slate-800">{crediario.tipo === "efibank" ? "Boleto" : "Interno"}</p>
                    </div>
                </div>

                {/* Parcelas */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2 scrollbar-thin">
                    {parcelas.map((p: any) => (
                        <div
                            key={p.id}
                            className={cn(
                                "flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all",
                                p.status === "pago" ? "bg-emerald-50/50 border-emerald-100" :
                                    p.status === "atrasado" ? "bg-red-50/50 border-red-100" :
                                        "bg-white border-slate-100 hover:border-brand-100"
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black",
                                        p.status === "pago" ? "bg-emerald-100 text-emerald-600" :
                                            p.status === "parcial" ? "bg-lime-100 text-lime-600" :
                                                p.status === "atrasado" ? "bg-red-100 text-red-600" :
                                                    "bg-slate-100 text-slate-600"
                                    )}>
                                        {p.numero_parcela}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {statusIcon(p.status)}
                                            <span className="text-sm font-black text-slate-800">{formatarValor(p.valor_centavos)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Calendar size={10} className="text-slate-300" />
                                            <span className="text-[10px] text-slate-400">
                                                Vence: {new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                                            </span>
                                            {p.data_pagamento && (
                                                <span className="text-[10px] text-emerald-500 font-bold">
                                                    • Pago em {new Date(p.data_pagamento).toLocaleDateString("pt-BR")}
                                                </span>
                                            )}
                                        </div>

                                        {/* Inline Edit Mode */}
                                        {editandoParcela === p.id && (
                                            <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                                                <input
                                                    type="date"
                                                    value={editVencimento}
                                                    onChange={(e) => setEditVencimento(e.target.value)}
                                                    className="px-2 py-1.5 text-xs font-bold rounded-lg border-2 border-transparent focus:border-brand-500/20 outline-none w-32"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editValor}
                                                    onChange={(e) => setEditValor(e.target.value)}
                                                    className="px-2 py-1.5 text-xs font-bold rounded-lg border-2 border-transparent focus:border-brand-500/20 outline-none w-24"
                                                    placeholder="Valor"
                                                />
                                                <button
                                                    onClick={() => handleSalvarEdicao(p.id)}
                                                    className="px-3 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-colors"
                                                >
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={() => setEditandoParcela(null)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {p.status !== "pago" && p.status !== "cancelado" && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditandoParcela(p.id);
                                                    setEditValor((p.valor_centavos / 100).toFixed(2));
                                                    setEditVencimento(p.vencimento);
                                                    setShowBaixaModal(null);
                                                }}
                                                className="p-2 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                                                title="Editar parcela"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBaixaModal(p.id);
                                                    setFormaBaixa("dinheiro");
                                                    setValorBaixaInput((p.valor_centavos / 100).toFixed(2));
                                                    setEditandoParcela(null);
                                                }}
                                                className={cn("px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-colors", p.status === 'parcial' ? 'bg-lime-50 text-lime-600 hover:bg-lime-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}
                                            >
                                                {p.status === 'parcial' ? 'Baixar Restante' : 'Baixar'}
                                            </button>
                                        </>
                                    )}
                                    {p.efibank_link && (
                                        <a
                                            href={p.efibank_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-500 transition-colors"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => imprimirRecibo(p)}
                                        className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-500 transition-colors"
                                        title="Imprimir Recibo (Total da Parcela Atual)"
                                    >
                                        <Printer size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Histórico de Pagamentos Parciais */}
                            {Array.isArray(p.pagamentos_json) && p.pagamentos_json.length > 0 && (
                                <div className="mt-2 pt-3 border-t border-slate-200/60 pl-14">
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Histórico de Recebimentos desta parcela</p>
                                    <div className="space-y-1.5">
                                        {p.pagamentos_json.map((pag: any) => (
                                            <div key={pag.id} className="flex justify-between items-center text-xs text-slate-600">
                                                <span>{new Date(pag.data).toLocaleDateString("pt-BR")} as {new Date(pag.data).toLocaleTimeString("pt-BR")} - <span className="uppercase">{pag.forma_pagamento}</span></span>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-black text-slate-700">{formatarValor(pag.valor)}</span>
                                                    <button
                                                        onClick={() => imprimirRecibo(p, pag)}
                                                        className="text-[10px] font-bold text-brand-500 hover:underline uppercase flex items-center gap-1 bg-brand-50 px-2 py-1 rounded"
                                                        title="Re-imprimir Recibo deste Pagamento"
                                                    >
                                                        <Printer size={10} /> Imprimir 2ª Via
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Baixa Modal Inline */}
                {showBaixaModal && (
                    <div className="px-8 py-5 border-t border-slate-100 bg-white shrink-0 animate-in slide-in-from-bottom-2 duration-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Forma de Pagamento da Baixa</p>
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Valor Recebido (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valorBaixaInput}
                                    onChange={(e) => setValorBaixaInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-emerald-500/20 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all"
                                />
                                {(() => {
                                    const p = parcelas.find((x: any) => x.id === showBaixaModal);
                                    if (!p) return null;
                                    const valDigitado = parseFloat(valorBaixaInput) || 0;
                                    const valOriginal = p.valor_centavos / 100;
                                    if (valDigitado > 0 && valDigitado < valOriginal) {
                                        const saldo = valOriginal - valDigitado;
                                        return (
                                            <p className="text-[10px] text-amber-500 font-bold mt-1">
                                                * Um saldo restante de R$ {saldo.toFixed(2)} será gerado.
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <div className="flex-[2] flex gap-2 flex-wrap items-end">
                                {[
                                    { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                                    { value: "pix", label: "Pix", icon: DollarSign },
                                    { value: "boleto", label: "Boleto", icon: FileText },
                                    { value: "cartao", label: "Cartão", icon: CreditCard },
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormaBaixa(value)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-bold border-2 transition-all flex-1 justify-center",
                                            formaBaixa === value
                                                ? "bg-brand-50 border-brand-200 text-brand-600"
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <Icon size={14} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBaixaModal(null)}
                                className="flex-1 py-3 rounded-xl border-2 border-slate-100 text-slate-500 font-bold text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleBaixa(showBaixaModal)}
                                disabled={!!baixando}
                                className="flex-[2] py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {baixando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

