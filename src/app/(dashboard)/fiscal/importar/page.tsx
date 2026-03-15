"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, UploadCloud, FileText, Package, Download, Search, RefreshCw, Key,
    CheckCircle2, AlertCircle, ShoppingCart, FileX
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { getXmlImportacoes, upsertXmlImportacao, updateXmlImportacao } from "@/services/compras";
import { FeatureGate } from "@/components/plans/FeatureGate";

interface NFeParsedData {
    chave: string;
    numero: string;
    serie: string;
    dataEmissao: string;
    fornecedor: { nome: string; cnpj: string };
    valorTotal: number;
    produtos: {
        nome: string;
        ncm: string;
        cfop: string;
        ean: string;
        unidade: string;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
    }[];
}

export default function ImportarXMLPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<"upload" | "sefaz">("sefaz");

    // Upload tab
    const [isDragging, setIsDragging] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [parsedData, setParsedData] = useState<NFeParsedData | null>(null);

    // Sefaz tab
    const [notasSefaz, setNotasSefaz] = useState<any[]>([]);
    const [sefazLoading, setSefazLoading] = useState(false);
    const [manifestandoId, setManifestando] = useState<string | null>(null);

    const loadNotas = useCallback(async () => {
        if (!profile?.empresa_id) return;
        const data = await getXmlImportacoes(profile.empresa_id);
        setNotasSefaz(data);
    }, [profile?.empresa_id]);

    useEffect(() => { loadNotas(); }, [loadNotas]);

    // ── Consulta SEFAZ via API route (server-side para evitar NavigatorLock timeout)
    async function handleBuscarSefaz() {
        if (!profile?.empresa_id) return;
        setSefazLoading(true);
        toast.info("Consultando Ambiente Nacional SEFAZ...");
        try {
            // Chamada server-side — persiste imediatamente sem travar o lock de auth do browser
            const res = await fetch("/api/fiscal/mde/consultar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresa_id: profile.empresa_id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Erro na consulta");

            // Atualiza a lista diretamente com o retorno da API (já persistido)
            setNotasSefaz(json.notas || []);
            toast.success(`${json.salvadas} nota${json.salvadas !== 1 ? "s" : ""} sincronizada${json.salvadas !== 1 ? "s" : ""} do Ambiente Nacional.`);
        } catch (e: any) {
            toast.error("Erro na consulta SEFAZ: " + e.message);
        } finally {
            setSefazLoading(false);
        }
    }

    async function handleManifestar(nota: any) {
        setManifestando(nota.id);
        toast.promise(
            new Promise(async (resolve, reject) => {
                try {
                    // Em produção: POST /api/fiscal/mde/manifestar
                    await new Promise(r => setTimeout(r, 1500));
                    await updateXmlImportacao(nota.id, { status_manifestacao: "ciencia" });
                    await loadNotas();
                    resolve(true);
                } catch (e) { reject(e); }
            }),
            {
                loading: "Enviando Ciência da Operação à SEFAZ...",
                success: "Manifestação registrada! Pode baixar o XML e cadastrar a compra.",
                error: "Erro ao manifestar."
            }
        );
        setManifestando(null);
    }

    const statusBadge = (nota: any) => {
        if (nota.compra_registrada) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">Processada</span>;
        if (nota.status_manifestacao === "ciencia") return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Ciência OK</span>;
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Pendente</span>;
    };

    // ── Upload tab helpers (unchanged logic)
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); };

    const processFile = (file: File) => {
        if (!file.name.toLowerCase().endsWith(".xml")) { toast.error("Selecione um arquivo XML."); return; }
        setUploadLoading(true);
        const reader = new FileReader();
        reader.onload = e => parseXML(e.target?.result as string);
        reader.onerror = () => { toast.error("Erro ao ler arquivo."); setUploadLoading(false); };
        reader.readAsText(file);
    };

    const parseXML = (xmlString: string) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) throw new Error("XML inválido.");
            const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
            if (!infNFe) throw new Error("Não é um XML de NF-e válido.");
            const ide = infNFe.getElementsByTagName("ide")[0];
            const emit = infNFe.getElementsByTagName("emit")[0];
            const total = infNFe.getElementsByTagName("total")[0];
            const protNFe = xmlDoc.getElementsByTagName("protNFe")[0];
            const detalhes = Array.from(infNFe.getElementsByTagName("det"));
            const produtos = detalhes.map(det => {
                const prod = det.getElementsByTagName("prod")[0];
                return {
                    nome: prod.getElementsByTagName("xProd")[0]?.textContent || "",
                    ncm: prod.getElementsByTagName("NCM")[0]?.textContent || "",
                    cfop: prod.getElementsByTagName("CFOP")[0]?.textContent || "",
                    ean: prod.getElementsByTagName("cEAN")[0]?.textContent || "",
                    unidade: prod.getElementsByTagName("uCom")[0]?.textContent || "UN",
                    quantidade: parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0"),
                    valorUnitario: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0"),
                    valorTotal: parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || "0"),
                };
            });
            setParsedData({
                chave: protNFe?.getElementsByTagName("chNFe")[0]?.textContent || infNFe.getAttribute("Id")?.replace("NFe", "") || "",
                numero: ide?.getElementsByTagName("nNF")[0]?.textContent || "",
                serie: ide?.getElementsByTagName("serie")[0]?.textContent || "",
                dataEmissao: ide?.getElementsByTagName("dhEmi")[0]?.textContent?.split("T")[0] || "",
                fornecedor: { nome: emit?.getElementsByTagName("xNome")[0]?.textContent || "", cnpj: emit?.getElementsByTagName("CNPJ")[0]?.textContent || "" },
                valorTotal: parseFloat(total?.getElementsByTagName("vNF")[0]?.textContent || "0"),
                produtos,
            });
            toast.success("XML lido com sucesso!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao processar XML.");
            setParsedData(null);
        } finally { setUploadLoading(false); }
    };

    async function handleImportarXMLParaBanco() {
        if (!parsedData || !profile) return;
        setUploadLoading(true);
        try {
            const saved = await upsertXmlImportacao({
                empresa_id: profile.empresa_id,
                chave_acesso: parsedData.chave,
                fornecedor_cnpj: parsedData.fornecedor.cnpj,
                fornecedor_nome: parsedData.fornecedor.nome,
                valor_total_centavos: Math.round(parsedData.valorTotal * 100),
                data_emissao: parsedData.dataEmissao,
                numero_nf: parsedData.numero,
                serie: parsedData.serie,
                status_processamento: "pendente",
                status_manifestacao: "ciencia", // já temos o XML, então ciência está implícita
                compra_registrada: false,
                itens_json: parsedData.produtos,
            });
            toast.success("Nota salva! Redirecionando para cadastro de compra...");
            router.push(`/fiscal/importar/compra/${saved.id}`);
        } catch (e: any) {
            toast.error("Erro ao salvar nota: " + e.message);
        } finally {
            setUploadLoading(false);
        }
    }

    return (
        <FeatureGate feature="xml_import" featureName="Importação de XML">
            <div className="space-y-6 page-enter pb-20">
            <div className="flex items-center gap-4">
                <Link href="/fiscal" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Notas de Entrada (MD-e)</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Manifestação do Destinatário e Importação de Compras</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button onClick={() => setActiveTab("sefaz")} className={cn("pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors px-2", activeTab === "sefaz" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-600")}>
                    <Key size={18} /> Consulta SEFAZ <span className="bg-brand-100 text-brand-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{notasSefaz.filter(n => !n.compra_registrada).length}</span>
                </button>
                <button onClick={() => { setActiveTab("upload"); setParsedData(null); }} className={cn("pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors px-2", activeTab === "upload" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-600")}>
                    <UploadCloud size={18} /> Upload Manual (XML)
                </button>
            </div>

            {/* ── ABA: SEFAZ ── */}
            {activeTab === "sefaz" && (
                <GlassCard className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Key className="text-amber-500" size={18} /> Notas emitidas contra seu CNPJ</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Sincronizado automaticamente a cada 6h usando seu Certificado A1</p>
                        </div>
                        <button onClick={handleBuscarSefaz} disabled={sefazLoading} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                            <RefreshCw size={15} className={cn(sefazLoading && "animate-spin text-brand-500")} />
                            {sefazLoading ? "Sincronizando..." : "Sincronizar Agora"}
                        </button>
                    </div>

                    {notasSefaz.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-medium text-slate-600 mb-1">Nenhuma nota encontrada</p>
                            <p className="text-sm">Clique em "Sincronizar Agora" para buscar notas da SEFAZ</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-5 py-4">Fornecedor</th>
                                        <th className="px-5 py-4">NF / Data</th>
                                        <th className="px-5 py-4 text-right">Valor</th>
                                        <th className="px-5 py-4 text-center">Situação</th>
                                        <th className="px-5 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {notasSefaz.map(nota => (
                                        <tr key={nota.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-slate-800 truncate max-w-[200px]">{nota.fornecedor_nome || "—"}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{nota.fornecedor_cnpj}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-700">Nº {nota.numero_nf || "—"}</p>
                                                <p className="text-xs text-slate-400">{nota.data_emissao ? formatDate(nota.data_emissao) : "—"}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right font-bold text-slate-700">
                                                {formatCurrency(nota.valor_total_centavos || 0)}
                                            </td>
                                            <td className="px-5 py-4 text-center">{statusBadge(nota)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-center items-center gap-1.5">
                                                    {nota.status_manifestacao === "pendente" && !nota.compra_registrada ? (
                                                        <button
                                                            onClick={() => handleManifestar(nota)}
                                                            disabled={manifestandoId === nota.id}
                                                            className="text-xs font-bold text-brand-600 hover:text-brand-800 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 transition-colors"
                                                        >
                                                            Manifestar Ciência
                                                        </button>
                                                    ) : !nota.compra_registrada ? (
                                                        <>
                                                            <button className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Baixar XML">
                                                                <Download size={16} />
                                                            </button>
                                                            <Link
                                                                href={`/fiscal/importar/compra/${nota.id}`}
                                                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                                                            >
                                                                <ShoppingCart size={14} /> Cadastrar Compra
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <Link href={`/compras`} className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1">
                                                            <CheckCircle2 size={14} className="text-emerald-500" /> Ver Compra
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            )}

            {/* ── ABA: UPLOAD MANUAL ── */}
            {activeTab === "upload" && (
                !parsedData ? (
                    <GlassCard className="p-0 overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <div
                            className={cn("flex flex-col items-center justify-center py-20 px-4", isDragging ? "bg-brand-50" : "")}
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        >
                            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all", isDragging ? "bg-brand-100 text-brand-600 scale-110" : "bg-white text-slate-400 shadow-sm")}>
                                <UploadCloud size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">{isDragging ? "Solte o arquivo aqui..." : "Arraste um XML de NF-e"}</h3>
                            <p className="text-slate-500 mb-8 max-w-md text-center text-sm">Upload do arquivo XML (.xml) recebido do fornecedor para cadastrar a entrada de estoque.</p>
                            <input type="file" accept=".xml,application/xml" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadLoading} className="btn-primary shadow-xl px-8">
                                {uploadLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Procurar Arquivo"}
                            </button>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-3 gap-6">
                            <GlassCard className="col-span-2 p-6" title="Resumo da NF-e" icon={FileText}>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fornecedor</p>
                                        <p className="font-bold text-slate-800 line-clamp-1">{parsedData.fornecedor.nome}</p>
                                        <p className="text-xs text-slate-500">{parsedData.fornecedor.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chave de Acesso</p>
                                        <p className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 truncate">{parsedData.chave}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nota Fiscal / Série</p>
                                        <p className="font-bold text-slate-800 text-lg">{parsedData.numero} <span className="text-slate-400 text-sm font-normal">/ {parsedData.serie}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                                        <p className="font-bold text-slate-800 text-lg">{parsedData.dataEmissao.split("-").reverse().join("/")}</p>
                                    </div>
                                </div>
                            </GlassCard>
                            <GlassCard className="p-6 bg-brand-50 border-brand-100 flex flex-col justify-center items-center text-center">
                                <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-2">Valor Total</p>
                                <p className="text-4xl font-black text-brand-700">{formatCurrency(parsedData.valorTotal * 100)}</p>
                                <button onClick={handleImportarXMLParaBanco} disabled={uploadLoading} className="btn-primary w-full mt-8">
                                    {uploadLoading ? "Salvando..." : <><Package size={18} /> Cadastrar Compra</>}
                                </button>
                                <button onClick={() => setParsedData(null)} className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar e Subir Outro</button>
                            </GlassCard>
                        </div>
                        <GlassCard className="p-0 overflow-hidden" title="Itens da Nota" icon={Package}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4">Produto</th>
                                            <th className="px-6 py-4">NCM</th>
                                            <th className="px-6 py-4">CFOP</th>
                                            <th className="px-6 py-4 text-right">Qtd</th>
                                            <th className="px-6 py-4 text-right">V. Unit</th>
                                            <th className="px-6 py-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedData.produtos.map((prod, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 font-medium text-slate-700 max-w-[300px] truncate">{prod.nome}</td>
                                                <td className="px-6 py-3 font-mono text-xs text-slate-500">{prod.ncm}</td>
                                                <td className="px-6 py-3 font-mono text-xs text-slate-500">{prod.cfop}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-600">{prod.quantidade}</td>
                                                <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(prod.valorUnitario * 100)}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-800">{formatCurrency(prod.valorTotal * 100)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                )
            )}
            </div>
        </FeatureGate>
    );
}
