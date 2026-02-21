"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ShoppingBag,
    Smartphone,
    Zap,
    CreditCard,
    BadgeCheck,
    AlertCircle,
    RefreshCw,
    Shield,
    ExternalLink,
    Tag,
    ChevronRight,
    MessageCircle,
    Info,
    X
} from "lucide-react";
import type { VitrineResponse, ProdutoVitrine, VitrineConfig } from "@/types/vitrine";
import Link from "next/link";

function formatBRL(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

export default function ProdutoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const subdominio = params.subdominio as string;
    const id = params.id as string;

    const [data, setData] = useState<{ produto: ProdutoVitrine; empresa: any; config: VitrineConfig } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInstallments, setShowInstallments] = useState(false);

    useEffect(() => {
        async function fetchProduto() {
            try {
                setLoading(true);
                const res = await fetch(`/api/vitrine/${subdominio}/produtos/${id}`);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Erro ao carregar produto");
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (subdominio && id) fetchProduto();
    }, [subdominio, id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <RefreshCw className="animate-spin text-indigo-400" size={48} />
                <p className="text-slate-400 font-medium animate-pulse text-lg">Buscando detalhes...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center max-w-md mx-auto px-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle size={40} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Produto não encontrado</h2>
                    <p className="text-slate-400 mt-2">{error || "Não foi possível carregar os detalhes do produto."}</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-bold"
                >
                    <ArrowLeft size={18} />
                    Voltar para a vitrine
                </button>
            </div>
        );
    }

    const { produto, empresa, config } = data;
    const melhorParcela = produto.parcelas.length > 0
        ? produto.parcelas[produto.parcelas.length - 1]
        : null;

    const parcelaSemJuros = produto.parcelas.filter(p => p.taxa === 0);
    const maxSemJuros = parcelaSemJuros.length > 0
        ? parcelaSemJuros[parcelaSemJuros.length - 1]
        : null;

    const whatsappMsg = `${config.mensagem_whatsapp}\n\nProduto: ${produto.nome}\nLink: ${window.location.href}`;

    return (
        <div className="min-h-screen pb-24 bg-[#020617]">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1 px-4 truncate">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{empresa.nome}</p>
                        <h1 className="text-white font-bold text-sm truncate">{produto.nome}</h1>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Galeria / Imagem */}
                    <div className="space-y-6">
                        <div className="aspect-square rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 overflow-hidden flex items-center justify-center relative shadow-2xl">
                            {produto.imagem_url ? (
                                <img
                                    src={produto.imagem_url}
                                    alt={produto.nome}
                                    className="w-full h-full object-contain p-4"
                                />
                            ) : (
                                <Smartphone className="w-32 h-32 text-slate-700" />
                            )}

                            {/* Badges de destaque */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                {produto.poucas_unidades && (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                                        Últimas unidades
                                    </span>
                                )}
                                {produto.condicao && (
                                    <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                                        {produto.condicao === "novo_lacrado" ? "Novo Lacrado" : produto.condicao === "seminovo" ? "Seminovo" : "Usado"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Informações */}
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                {produto.categoria && (
                                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 flex items-center gap-1.5">
                                        <Tag size={12} />
                                        {produto.categoria}
                                    </span>
                                )}
                                {config.mostrar_grade && produto.grade && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${produto.grade === "A" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        produto.grade === "B" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                            "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                        }`}>
                                        Grade {produto.grade}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
                                {produto.nome}
                            </h1>

                            {/* Specs rápidas */}
                            <div className="flex flex-wrap gap-4 mt-6">
                                {produto.capacidade && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[100px]">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Capacidade</p>
                                        <p className="text-white font-bold">{produto.capacidade}</p>
                                    </div>
                                )}
                                {produto.memoria_ram && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[100px]">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Memória RAM</p>
                                        <p className="text-white font-bold">{produto.memoria_ram}</p>
                                    </div>
                                )}
                                {produto.cor && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 min-w-[100px]">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cor</p>
                                        <p className="text-white font-bold">{produto.cor}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preços */}
                        <div className="space-y-4">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 text-emerald-500/5 group-hover:scale-150 transition-transform duration-700">
                                    <Zap size={120} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">
                                        <Zap size={14} />
                                        Preço à vista (Pix)
                                    </div>
                                    <p className="text-5xl font-black text-emerald-400 tracking-tighter">
                                        {formatBRL(produto.preco_pix)}
                                    </p>
                                </div>
                            </div>

                            {melhorParcela && (
                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6">
                                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs mb-3">
                                        <CreditCard size={14} />
                                        Opções de Parcelamento
                                    </div>
                                    <p className="text-2xl font-black text-indigo-300">
                                        Em até {melhorParcela.qtd}x de {formatBRL(melhorParcela.valor_parcela)}
                                    </p>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {maxSemJuros && maxSemJuros.qtd > 1 && (
                                            <div className="bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg font-bold border border-emerald-500/20">
                                                ✓ {maxSemJuros.qtd}x sem juros no cartão
                                            </div>
                                        )}
                                        <div className="bg-white/5 text-slate-400 px-3 py-2 rounded-lg border border-white/5">
                                            ✓ Aceitamos todos os cartões
                                        </div>
                                    </div>

                                    {/* Botão Ver todas as opções */}
                                    <button
                                        onClick={() => setShowInstallments(true)}
                                        className="w-full mt-6 py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-indigo-300 font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        Ver todas as formas de pagamento
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Descrição */}
                        {produto.descricao && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Info size={18} className="text-indigo-400" />
                                    Descrição do Produto
                                </h3>
                                <div className="text-slate-400 leading-relaxed whitespace-pre-wrap bg-white/5 rounded-2xl p-6 border border-white/5">
                                    {produto.descricao}
                                </div>
                            </div>
                        )}

                        {/* Garantia */}
                        {(produto.garantia_dias ?? 0) > 0 && (
                            <div className="flex items-center gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4">
                                <Shield className="text-cyan-400" size={24} />
                                <div>
                                    <p className="text-white font-bold text-sm">Garantia Assegurada</p>
                                    <p className="text-cyan-400/70 text-xs">Este produto possui garantia completa de {produto.garantia_dias} dias.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* CTA Fixo */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 p-4 z-50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mb-1">Comprar Agora</p>
                        <p className="text-white font-black text-lg">{formatBRL(produto.preco_pix)} <span className="text-xs text-slate-500 font-normal">à vista</span></p>
                    </div>

                    <a
                        href={`https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(whatsappMsg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all font-black text-lg shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:scale-95 group"
                    >
                        <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
                        ME INTERESSEI
                    </a>
                </div>
            </div>

            {/* Modal de Parcelas */}
            {showInstallments && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setShowInstallments(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-indigo-400" size={24} />
                                Formas de Pagamento
                            </h3>
                            <button
                                onClick={() => setShowInstallments(false)}
                                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-left">
                                        <th className="px-4 py-2">Parcelas</th>
                                        <th className="px-4 py-2">Valor da Parcela</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Pix */}
                                    <tr className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl overflow-hidden group">
                                        <td className="px-4 py-4 rounded-l-2xl font-bold text-emerald-400 bg-emerald-500/5">
                                            Pix
                                        </td>
                                        <td className="px-4 py-4 font-black text-emerald-400 bg-emerald-500/5">
                                            {formatBRL(produto.preco_pix)}
                                        </td>
                                        <td className="px-4 py-4 rounded-r-2xl font-bold text-emerald-400/70 text-right bg-emerald-500/5">
                                            {formatBRL(produto.preco_pix)}
                                        </td>
                                    </tr>

                                    {/* Parcelas */}
                                    {produto.parcelas.map((p) => (
                                        <tr key={p.qtd} className="bg-white/5 hover:bg-white/[0.08] transition-colors rounded-xl overflow-hidden">
                                            <td className="px-4 py-4 rounded-l-2xl">
                                                <span className="text-white font-bold">{p.qtd}x</span>
                                                {p.taxa === 0 && (
                                                    <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                                        Sem Juros
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-white font-medium">
                                                {formatBRL(p.valor_parcela)}
                                            </td>
                                            <td className="px-4 py-4 rounded-r-2xl text-slate-400 text-sm text-right">
                                                {formatBRL(p.valor_total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-6 p-4 rounded-2xl bg-brand-500/5 border border-brand-500/20 text-xs text-slate-400 leading-relaxed">
                                <p className="flex gap-2">
                                    <Info size={14} className="shrink-0 text-brand-400" />
                                    <span>As taxas e condições podem variar dependendo da bandeira do cartão e da operadora. Consulte condições para outras formas de pagamento no WhatsApp.</span>
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-950/50 border-t border-white/5">
                            <button
                                onClick={() => setShowInstallments(false)}
                                className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-all shadow-lg hover:shadow-indigo-500/25"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
