"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Search,
    ShoppingBag,
    Smartphone,
    Zap,
    CreditCard,
    BadgeCheck,
    AlertCircle,
    RefreshCw,
    Filter,
    Monitor,
    ExternalLink,
    Tag,
    Shield,
} from "lucide-react";
import type { VitrineResponse, ProdutoVitrine } from "@/types/vitrine";
import Link from "next/link";

function formatBRL(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function ProdutoCard({ produto, mostrarGrade }: { produto: ProdutoVitrine; mostrarGrade: boolean }) {
    // Encontrar a melhor parcela para exibir (maior número de parcelas disponível)
    const melhorParcela = produto.parcelas.length > 0
        ? produto.parcelas[produto.parcelas.length - 1]
        : null;

    // Parcela sem juros (taxa = 0)
    const parcelaSemJuros = produto.parcelas.filter(p => p.taxa === 0);
    const maxSemJuros = parcelaSemJuros.length > 0
        ? parcelaSemJuros[parcelaSemJuros.length - 1]
        : null;

    return (
        <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(99,102,241,0.1)] hover:-translate-y-1">
            {/* Badge de destaque / poucas unidades */}
            {produto.poucas_unidades && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Últimas unidades
                    </span>
                </div>
            )}

            {/* Área da imagem (placeholder elegante ou foto real) */}
            <div className="aspect-square bg-gradient-to-br from-slate-800/50 to-slate-900/50 flex items-center justify-center relative overflow-hidden">
                {produto.imagem_url ? (
                    <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <Smartphone className="w-16 h-16 text-slate-600 group-hover:text-slate-500 transition-colors" />
                    </>
                )}

                {/* Grade badge */}
                {mostrarGrade && produto.grade && (
                    <div className="absolute top-3 left-3">
                        <span className={`
                            px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider backdrop-blur-md
                            ${produto.grade === "A" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                                produto.grade === "B" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                                    "bg-orange-500/20 text-orange-300 border border-orange-500/30"}
                        `}>
                            Grade {produto.grade}
                        </span>
                    </div>
                )}
            </div>

            {/* Informações do produto */}
            <div className="p-5 space-y-3">
                {/* Nome e especificações */}
                <div>
                    <h3 className="text-white font-bold text-base leading-tight line-clamp-2 group-hover:text-indigo-200 transition-colors">
                        {produto.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {produto.categoria && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                                <Tag size={9} />
                                {produto.categoria}
                            </span>
                        )}
                        {produto.condicao && produto.condicao !== "novo_lacrado" && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                {produto.condicao === "seminovo" ? "Seminovo" : produto.condicao === "usado" ? "Usado" : "Peça/Insumo"}
                            </span>
                        )}
                        {produto.memoria_ram && (
                            <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                                {produto.memoria_ram} RAM
                            </span>
                        )}
                        {produto.capacidade && (
                            <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                                {produto.capacidade}
                            </span>
                        )}
                        {produto.cor && (
                            <span className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                                {produto.cor}
                            </span>
                        )}
                    </div>
                </div>

                {/* Separador */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Preço à Vista (Pix) — DESTAQUE */}
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <Zap size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                            À vista no Pix
                        </span>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 tracking-tight">
                        {formatBRL(produto.preco_pix)}
                    </p>
                </div>

                {/* Preço Parcelado */}
                {melhorParcela && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <CreditCard size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/80">
                                Parcelado
                            </span>
                        </div>
                        <p className="text-lg font-bold text-indigo-300">
                            {melhorParcela.qtd}x de {formatBRL(melhorParcela.valor_parcela)}
                        </p>
                        {melhorParcela.taxa > 0 && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Total: {formatBRL(melhorParcela.valor_total)}
                            </p>
                        )}
                        {maxSemJuros && maxSemJuros.qtd > 1 && (
                            <p className="text-[10px] text-emerald-400/70 mt-0.5 font-bold">
                                ou {maxSemJuros.qtd}x de {formatBRL(maxSemJuros.valor_parcela)} sem juros
                            </p>
                        )}
                    </div>
                )}

                {/* Status estoque + garantia */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <BadgeCheck size={14} className="text-emerald-500" />
                        <span className="text-xs text-emerald-400/70 font-medium">Em estoque</span>
                    </div>
                    {(produto.garantia_dias ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-cyan-400/70 font-bold">
                            <Shield size={10} />
                            {produto.garantia_dias}d garantia
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VitrinePage() {
    const params = useParams();
    const subdominio = params.subdominio as string;

    const [vitrineData, setVitrineData] = useState<VitrineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroGrade, setFiltroGrade] = useState<string>("todos");
    const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");

    useEffect(() => {
        async function fetchVitrine() {
            try {
                setLoading(true);
                const res = await fetch(`/api/vitrine/${subdominio}/produtos`);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Erro ao carregar vitrine");
                }
                const data: VitrineResponse = await res.json();
                setVitrineData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (subdominio) fetchVitrine();
    }, [subdominio]);

    // Filtros client-side
    const produtosFiltrados = vitrineData?.produtos.filter(p => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!p.nome.toLowerCase().includes(term) &&
                !(p.cor?.toLowerCase().includes(term)) &&
                !(p.capacidade?.toLowerCase().includes(term)) &&
                !(p.categoria?.toLowerCase().includes(term))) {
                return false;
            }
        }
        if (filtroGrade !== "todos" && p.grade !== filtroGrade) return false;
        if (filtroCategoria !== "todos" && p.categoria !== filtroCategoria) return false;
        return true;
    }) ?? [];

    const categoriasDisponiveis = vitrineData?.categorias_disponiveis ?? [];

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <RefreshCw className="animate-spin text-indigo-400" size={48} />
                <p className="text-slate-400 font-medium animate-pulse text-lg">Carregando vitrine...</p>
            </div>
        );
    }

    // Error state
    if (error || !vitrineData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center max-w-md mx-auto px-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle size={40} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Loja não encontrada</h2>
                    <p className="text-slate-400 mt-2">{error || "Não foi possível carregar os produtos."}</p>
                </div>
            </div>
        );
    }

    const { empresa, config, produtos } = vitrineData;

    return (
        <div className="min-h-screen pb-20">
            {/* ── Header ── */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo + Nome */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <ShoppingBag className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-lg leading-tight">{empresa.nome}</h1>
                                <p className="text-slate-500 text-xs">{config.titulo}</p>
                            </div>
                        </div>

                        {/* Modo TV link */}
                        <Link
                            href={`/v/${subdominio}/tv`}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm"
                        >
                            <Monitor size={16} />
                            Modo TV
                        </Link>
                    </div>

                    {/* Barra de busca + filtros */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                placeholder="Buscar produto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {config.mostrar_grade && (
                            <div className="flex items-center gap-1.5">
                                <Filter size={14} className="text-slate-500" />
                                {["todos", "A", "B", "C"].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFiltroGrade(g)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filtroGrade === g
                                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                            : "bg-white/5 text-slate-500 border border-white/5 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        {g === "todos" ? "Todos" : `Grade ${g}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Filtro por Categoria */}
                    {categoriasDisponiveis.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                            <Tag size={14} className="text-slate-500 shrink-0" />
                            <button
                                onClick={() => setFiltroCategoria("todos")}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtroCategoria === "todos"
                                    ? "bg-white/15 text-white border border-white/20"
                                    : "bg-white/5 text-slate-500 border border-white/5 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                Todos
                            </button>
                            {categoriasDisponiveis.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFiltroCategoria(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filtroCategoria === cat
                                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                        : "bg-white/5 text-slate-500 border border-white/5 hover:text-white hover:bg-white/10"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* ── Grid de Produtos ── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Contador */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-slate-500 text-sm">
                        <span className="text-white font-bold">{produtosFiltrados.length}</span> produto{produtosFiltrados.length !== 1 ? "s" : ""} disponíve{produtosFiltrados.length !== 1 ? "is" : "l"}
                    </p>
                </div>

                {produtosFiltrados.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-lg text-slate-500 font-medium">Nenhum produto encontrado</p>
                        <p className="text-sm text-slate-600 mt-1">Tente outra busca ou remova os filtros</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {produtosFiltrados.map((produto, index) => (
                            <div
                                key={produto.id}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <ProdutoCard
                                    produto={produto}
                                    mostrarGrade={config.mostrar_grade}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 py-3 px-6 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <p className="text-slate-600 text-xs">
                        © {new Date().getFullYear()} {empresa.nome} • Powered by <span className="text-indigo-400 font-bold">SmartOS</span>
                    </p>
                    {empresa.whatsapp && (
                        <a
                            href={`https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(config.mensagem_whatsapp)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all text-sm font-bold"
                        >
                            <ExternalLink size={14} />
                            WhatsApp
                        </a>
                    )}
                </div>
            </footer>
        </div>
    );
}
