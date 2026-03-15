"use client";

import { useState, useEffect } from "react";
import { 
    FileText, 
    Download, 
    Filter, 
    Settings, 
    Eye, 
    Loader2, 
    Printer, 
    Search,
    ChevronRight,
    CheckCircle2,
    Store,
    CreditCard,
    DollarSign,
    Smartphone,
    Layout
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { getPriceListProducts } from "@/actions/marketing";
import { FeatureGate } from "@/components/plans/FeatureGate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ListaPrecosPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [gateway, setGateway] = useState<any>(null);
    const [brands, setBrands] = useState<{id: string, name: string}[]>([]);
    
    // Configurações da lista
    const [filters, setFilters] = useState({
        brand_id: "",
        item_type: "todos"
    });
    
    const [config, setConfig] = useState({
        showInstallments: true,
        maxInstallments: 12,
        installmentType: "price", // price (com juros) ou fixo (sem juros)
        showFooter: true,
        footerText: "Valores sujeitos a alteração sem aviso prévio. Consultar estoque.",
        title: "Tabela de Preços",
        accentColor: "#6366f1" // Violet-500
    });

    useEffect(() => {
        if (!profile?.empresa_id) return;
        loadData();
    }, [profile?.empresa_id, filters]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await getPriceListProducts(profile!.empresa_id, filters);
            setProducts(data.products);
            setGateway(data.gateway);
            
            // Extrair marcas únicas dos produtos carregados para o filtro (ou buscar todas as marcas)
            const uniqueBrands = Array.from(new Set(data.products.map((p: any) => p.brand?.id)))
                .filter(id => id)
                .map(id => {
                    const p = data.products.find((prod: any) => prod.brand?.id === id);
                    return { id, name: p.brand.name };
                });
            setBrands(uniqueBrands);

        } catch (error: any) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar produtos");
        } finally {
            setLoading(false);
        }
    }

    // Cálculo de parcela (Tabela Price)
    const calculateInstallment = (total: number, n: number) => {
        if (!gateway?.taxas_credito_json) return total / n;
        
        const taxas = gateway.taxas_credito_json as Record<string, number>;
        const taxaChave = `${n}x`;
        const taxa = taxas[taxaChave] || 0;
        
        // Se for 1x, usa 0 de juros ou a taxa de 1x se for antecipação, mas para tabela de preços geralmente mostramos o valor parcelado.
        // A lógica de "Price" geralmente é embutir a taxa no valor total para o cliente.
        // Valor Final = Valor Base / (1 - Taxa)
        const valorFinal = total / (1 - (taxa / 100));
        return valorFinal / n;
    };

    const handleGeneratePDF = async () => {
        if (products.length === 0) {
            toast.error("Nenhum produto para gerar a lista.");
            return;
        }

        setGenerating(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 14;

            // Header
            doc.setFillColor(config.accentColor);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text(config.title.toUpperCase(), margin, 25);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const dateStr = new Date().toLocaleDateString('pt-BR');
            doc.text(`Atualizado em: ${dateStr}`, margin, 33);

            // Tabela
            const tableData = products.map(p => {
                const valorBase = p.sale_price || 0;
                const parcelas = config.showInstallments 
                    ? `${config.maxInstallments}x de ${formatCurrency(calculateInstallment(valorBase, config.maxInstallments))}`
                    : "-";
                
                return [
                    p.name,
                    p.brand?.name || "-",
                    formatCurrency(valorBase),
                    parcelas
                ];
            });

            autoTable(doc, {
                startY: 50,
                head: [['Produto', 'Marca', 'À Vista (PIX/Dinheiro)', `${config.maxInstallments}x no Cartão`]],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: config.accentColor, textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 5 },
                columnStyles: {
                    2: { fontStyle: 'bold', halign: 'right' },
                    3: { fontStyle: 'bold', textColor: config.accentColor, halign: 'right' }
                }
            });

            // Footer
            if (config.showFooter) {
                const finalY = (doc as any).lastAutoTable.finalY + 10;
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(config.footerText, margin, finalY);
            }

            doc.save(`lista-precos-${new Date().getTime()}.pdf`);
            toast.success("PDF gerado com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Erro ao gerar PDF");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <FeatureGate feature="marketing_pdf" featureName="Gerador de Lista de Preços">
            <div className="space-y-6 page-enter pb-20 lg:pb-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">Lista de Preços</h1>
                            <p className="text-slate-500 text-[10px] md:text-sm mt-0.5">Gere PDFs profissionais com seus preços e parcelamentos</p>
                        </div>
                    </div>

                    <button
                        onClick={handleGeneratePDF}
                        disabled={generating || loading || products.length === 0}
                        className="btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Exportar PDF
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Coluna de Configuração */}
                    <div className="lg:col-span-4 space-y-6">
                        <GlassCard title="Configurações" icon={Settings}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Título do Documento</label>
                                    <input 
                                        type="text" 
                                        className="input-glass w-full" 
                                        value={config.title}
                                        onChange={e => setConfig({...config, title: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Tipo de Item</label>
                                        <select 
                                            className="input-glass w-full"
                                            value={filters.item_type}
                                            onChange={e => setFilters({...filters, item_type: e.target.value})}
                                        >
                                            <option value="todos">Todos</option>
                                            <option value="celular">Celulares</option>
                                            <option value="acessorio">Acessórios</option>
                                            <option value="peca">Peças</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Marca</label>
                                        <select 
                                            className="input-glass w-full"
                                            value={filters.brand_id}
                                            onChange={e => setFilters({...filters, brand_id: e.target.value})}
                                        >
                                            <option value="">Todas as Marcas</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-700">Mostrar Parcelamento</span>
                                    <button 
                                        onClick={() => setConfig({...config, showInstallments: !config.showInstallments})}
                                        className={cn(
                                            "w-10 h-5 rounded-full transition-colors relative",
                                            config.showInstallments ? "bg-indigo-500" : "bg-slate-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all",
                                            config.showInstallments ? "right-1" : "left-1"
                                        )} />
                                    </button>
                                </div>

                                {config.showInstallments && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Máximo de Parcelas</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="12" 
                                            className="input-glass w-full" 
                                            value={config.maxInstallments}
                                            onChange={e => setConfig({...config, maxInstallments: parseInt(e.target.value) || 1})}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 italic">
                                            {gateway ? `Usando taxas do gateway: ${gateway.nome}` : "Nenhum gateway padrão configurado (taxa 0%)"}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Rodapé Personalizado</label>
                                    <textarea 
                                        className="input-glass w-full h-20 resize-none text-xs" 
                                        value={config.footerText}
                                        onChange={e => setConfig({...config, footerText: e.target.value})}
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Coluna de Preview */}
                    <div className="lg:col-span-8">
                        <GlassCard className="p-0 overflow-hidden min-h-[600px] flex flex-col bg-slate-50/50">
                            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye size={16} className="text-indigo-500" />
                                    <h3 className="font-bold text-slate-800 text-sm">Preview da Tabela</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {products.length} itens encontrados
                                </span>
                            </div>

                            <div className="flex-1 p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        <p className="text-sm text-slate-500 font-medium">Carregando produtos...</p>
                                    </div>
                                ) : products.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
                                            <Search size={32} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 font-bold">Nenhum produto disponível</p>
                                            <p className="text-xs text-slate-400">Verifique os filtros ou habilite produtos para a vitrine.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <th className="px-4 py-3">Produto</th>
                                                    <th className="px-4 py-3">À Vista</th>
                                                    {config.showInstallments && <th className="px-4 py-3 text-right">{config.maxInstallments}x Cartão</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {products.map((p) => {
                                                    const valorBase = p.sale_price || 0;
                                                    const valorParcela = calculateInstallment(valorBase, config.maxInstallments);
                                                    
                                                    return (
                                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-slate-700">{p.name}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-medium">{p.brand?.name || "Sem Marca"}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-emerald-600 font-black">
                                                                {formatCurrency(valorBase)}
                                                            </td>
                                                            {config.showInstallments && (
                                                                <td className="px-4 py-3 text-right">
                                                                    <p className="text-slate-700 font-bold">{formatCurrency(valorParcela)}</p>
                                                                    <p className="text-[9px] text-slate-400 font-medium">por mês</p>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            
                            {config.showFooter && products.length > 0 && (
                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 text-center italic leading-relaxed">
                                        {config.footerText}
                                    </p>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            </div>
        </FeatureGate>
    );
}
